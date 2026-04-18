#!/usr/bin/env python3
"""
EventStorming Facilitator - Self-contained HTML renderer + Alpine.js editor.

Replaces the md2html dependency with a built-in server.
Editable blocks (both formats supported):
  - ```event-flow-svg\n...\n```        (fenced code block, primary)
  - :::diagram-svg event_flow\n...\n::: (container directive, backward compat)
Browser edits are saved back to the MD file via POST /save, preserving the
original delimiter style per block.

Usage:
  python3 render.py <md-file>                  # Start server + open browser
  python3 render.py <md-file> --no-browser     # Start server only (for testing)
  python3 render.py <md-file> --port 8765      # Custom port (default: 8765)
"""

import sys
import os
import re
import json
import html as html_mod
import http.server
import threading
import subprocess
import time
from pathlib import Path

DEFAULT_PORT = 8765
_MAX_CONTENT_BYTES = 10 * 1024 * 1024  # 10MB

# ============================================================
# Markdown → HTML (minimal, no external dependencies)
# ============================================================

# Primary: GitHub-style fenced code block with `event-flow-svg` language tag
_EF_FENCE_RE = re.compile(r'```event-flow-svg\n(.*?)\n```', re.DOTALL)
# Backward compat: pandoc-style container directive
_EF_COLON_RE = re.compile(r':::diagram-svg event_flow\n(.*?)\n:::', re.DOTALL)


def _extract_ef_blocks(content: str):
    """Find all event_flow blocks (both delimiter styles) in document order.

    Returns (processed_content, ef_blocks). Each block entry records the
    original open/close delimiters so edits can be round-tripped without
    changing the file's delimiter style.
    """
    matches = []
    for m in _EF_FENCE_RE.finditer(content):
        matches.append(('fence', m.start(), m.end(), m.group(0), m.group(1)))
    for m in _EF_COLON_RE.finditer(content):
        matches.append(('colon', m.start(), m.end(), m.group(0), m.group(1)))
    matches.sort(key=lambda t: t[1])

    # Drop overlapping matches (defensive; should not occur in practice)
    filtered = []
    last_end = -1
    for match in matches:
        if match[1] >= last_end:
            filtered.append(match)
            last_end = match[2]

    ef_blocks = []
    parts = []
    pos = 0
    for kind, start, end, raw, inner in filtered:
        parts.append(content[pos:start])
        idx = len(ef_blocks)
        if kind == 'fence':
            open_delim, close_delim = '```event-flow-svg', '```'
        else:
            open_delim, close_delim = ':::diagram-svg event_flow', ':::'
        ef_blocks.append({
            'id': idx,
            'props': parse_props(inner),
            'raw': raw,
            'open': open_delim,
            'close': close_delim,
        })
        parts.append(f'\n<!--EF_{idx}-->\n')
        pos = end
    parts.append(content[pos:])
    return ''.join(parts), ef_blocks


_VALID_KEY = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]*$')

def parse_props(content: str) -> dict:
    """Parse key: value properties from block content.
    Valid keys match [a-zA-Z][a-zA-Z0-9_-]* (e.g. title, segment-label-0).
    Lines that don't start a valid key are appended to the last key's value,
    supporting multi-line flow: blocks with |lane|: headers and >> prefixes.
    """
    props = {}
    last_key = None
    for line in content.strip().split('\n'):
        if line and line[0] in (' ', '\t') and last_key is not None:
            props[last_key] += '\n' + line.rstrip()
            continue
        if ':' in line:
            key, _, val = line.partition(':')
            key_stripped = key.strip()
            if _VALID_KEY.match(key_stripped):
                props[key_stripped] = val.strip()
                last_key = key_stripped
            elif last_key is not None:
                props[last_key] += '\n' + line.rstrip()
        elif line.strip() and last_key is not None:
            props[last_key] += '\n' + line.rstrip()
    return props


def _inline(text: str) -> str:
    t = html_mod.escape(text)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    t = re.sub(r'\*(.+?)\*', r'<em>\1</em>', t)
    return t


_TABLE_ROW_RE = re.compile(r'^\s*\|(.+)\|\s*$')
_TABLE_ALIGN_RE = re.compile(r'^\s*:?-{3,}:?\s*$')
_BULLET_RE = re.compile(r'^(\s*)[-*] (.*)$')


def _split_row(line: str) -> list:
    m = _TABLE_ROW_RE.match(line)
    if not m:
        return []
    return [c.strip() for c in m.group(1).split('|')]


def _is_table_separator(line: str) -> bool:
    cells = _split_row(line)
    return bool(cells) and all(_TABLE_ALIGN_RE.match(c) for c in cells)


def md_to_html(text: str) -> str:
    """Minimal Markdown → HTML. Handles headers, nested lists, tables, code blocks, paragraphs."""
    lines = text.split('\n')
    out = []
    in_code = False
    code_lang = ''
    code_buf: list = []
    ul_stack: list = []  # indent columns per open <ul>

    def close_lists_to(target_indent: int = -1) -> None:
        while ul_stack and ul_stack[-1] > target_indent:
            out.append('</ul>')
            ul_stack.pop()

    i = 0
    while i < len(lines):
        line = lines[i]
        # Code block toggle
        if line.startswith('```'):
            close_lists_to(-1)
            if not in_code:
                in_code = True
                code_lang = html_mod.escape(line[3:].strip() or 'text')
                code_buf = []
            else:
                in_code = False
                body = html_mod.escape('\n'.join(code_buf))
                out.append(f'<pre class="code-block lang-{code_lang}"><code>{body}</code></pre>')
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        stripped = line.strip()
        bullet_match = _BULLET_RE.match(line)

        # Close open lists when non-bullet content appears
        if not bullet_match:
            close_lists_to(-1)

        # Table: header | separator | body rows
        if (i + 1 < len(lines)
                and _split_row(line)
                and _is_table_separator(lines[i + 1])):
            headers = _split_row(line)
            i += 2  # skip header + separator
            rows = []
            while i < len(lines) and _split_row(lines[i]):
                rows.append(_split_row(lines[i]))
                i += 1
            thead = ''.join(f'<th>{_inline(h)}</th>' for h in headers)
            tbody = ''.join(
                '<tr>' + ''.join(f'<td>{_inline(c)}</td>' for c in r) + '</tr>'
                for r in rows
            )
            out.append(f'<table class="md-table"><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table>')
            continue

        if bullet_match:
            indent = len(bullet_match.group(1))
            content = bullet_match.group(2)
            # Close deeper lists
            while ul_stack and ul_stack[-1] > indent:
                out.append('</ul>')
                ul_stack.pop()
            # Open new list if first bullet or deeper indent
            if not ul_stack or ul_stack[-1] < indent:
                out.append('<ul>')
                ul_stack.append(indent)
            out.append(f'<li>{_inline(content)}</li>')
        elif re.match(r'^-{3,}$', stripped):
            out.append('<hr class="section-divider">')
        elif line.startswith('#### '):
            out.append(f'<h4>{_inline(line[5:])}</h4>')
        elif line.startswith('### '):
            out.append(f'<h3>{_inline(line[4:])}</h3>')
        elif line.startswith('## '):
            out.append(f'<h2>{_inline(line[3:])}</h2>')
        elif line.startswith('# '):
            out.append(f'<h1>{_inline(line[2:])}</h1>')
        elif stripped.startswith('<!--'):
            out.append(line)  # pass HTML comments through
        elif stripped == '':
            out.append('<div class="spacer"></div>')
        else:
            out.append(f'<p>{_inline(line)}</p>')
        i += 1

    close_lists_to(-1)
    if in_code and code_buf:
        body = html_mod.escape('\n'.join(code_buf))
        out.append(f'<pre><code>{body}</code></pre>')

    return '\n'.join(out)


# ============================================================
# HTML Page Builder
# ============================================================

def build_page(md_path: str) -> str:
    """Read MD, replace event_flow blocks with Alpine.js editors, return full HTML."""
    content = Path(md_path).read_text(encoding='utf-8')

    processed, ef_blocks = _extract_ef_blocks(content)
    body_html = md_to_html(processed)

    # Inject editor components in place of placeholders
    for ef in ef_blocks:
        props_json = json.dumps(ef['props'], ensure_ascii=False)
        eid = ef['id']
        editor = f'''<div class="ef-editor" id="ef-{eid}"
  x-data="efEditor(JSON.parse(document.getElementById('ef-props-{eid}').textContent), {eid})">
  <script id="ef-props-{eid}" type="application/json">{props_json}</script>
  <div class="ef-preview-box" x-show="!editing">
    <div class="ef-flow-title" x-text="flowTitle" x-show="flowTitle"></div>
    <div class="ef-hscroll-wrap">
      <div class="ef-lane-panel" x-html="laneSvgHtml"></div>
      <div class="ef-content-scroll">
        <div class="ef-view-container" :style="'margin-left:-'+laneHdrW+'px'">
          <div class="ef-svg-preview" x-html="svgHtml"></div>
          <template x-for="(sp, k) in viewSegPositions" :key="'vsp'+k">
            <div class="ef-seg-view-ov"
                 :style="'left:'+sp.x+'px;top:'+sp.y+'px;width:'+sp.width+'px;height:'+sp.height+'px'"
                 @mouseenter="tooltip={{show:true,text:segLabels[sp.gi]||'',x:$event.clientX+12,y:$event.clientY+12}}"
                 @mousemove="tooltip.x=$event.clientX+12;tooltip.y=$event.clientY+12"
                 @mouseleave="tooltip.show=false">
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="ef-actions">
      <button class="ef-edit-btn" @click="startEdit()">✏️ 編集</button>
    </div>
  </div>
  <!-- Tooltip (position:fixed, not clipped by overflow) -->
  <div class="ef-seg-tooltip" x-show="tooltip.show" x-cloak
       :style="'left:'+tooltip.x+'px;top:'+tooltip.y+'px'"
       x-text="tooltip.text"></div>
  <div class="ef-panel" x-show="editing" x-transition.duration.200ms>
    <div class="ef-edit-wrap">
      <div class="ef-hscroll-wrap">
        <div class="ef-lane-panel" x-html="editLaneSvgHtml"></div>
        <div class="ef-content-scroll">
          <div class="ef-ov-container" :style="'margin-left:-'+laneHdrW+'px'">
            <div class="ef-ov-svg" x-html="editSvgHtml"></div>
            <template x-for="(pos, k) in editNotePositions" :key="pos.idx">
              <div class="ef-note-ov ef-ve-note"
                   :style="'left:'+pos.x+'px;top:'+pos.y+'px'"
                   x-show="itemGroups[pos.gi] && itemGroups[pos.gi].items[pos.ii]">
                <button class="ef-del-ov ef-ve-del" @click.stop="deleteItem(pos.gi,pos.ii)" title="削除">×</button>
                <input class="ef-label-ov"
                       :value="itemGroups[pos.gi] && itemGroups[pos.gi].items[pos.ii] ? itemGroups[pos.gi].items[pos.ii].label : ''"
                       @input="if(itemGroups[pos.gi]&&itemGroups[pos.gi].items[pos.ii]){{itemGroups[pos.gi].items[pos.ii].label=$event.target.value;updateSvg();}}"
                       placeholder="ラベル">
              </div>
            </template>
            <template x-for="(sp, k) in editSegPositions" :key="'seg'+k">
              <input class="ef-seg-ov"
                     :style="'left:'+sp.x+'px;top:'+sp.y+'px;width:'+sp.width+'px;height:'+sp.height+'px'"
                     :value="segLabels[sp.gi] || ''"
                     @input="segLabels[sp.gi]=$event.target.value"
                     @blur="updateSvg()"
                     placeholder="セグメント説明">
            </template>
          </div>
        </div>
      </div>
      <div class="ef-raw-editor-wrap">
        <textarea class="ef-raw-textarea"
                  x-model="rawText"
                  @input="onRawInputSvg($event.target.value)"
                  @focus="_rawFocused=true"
                  @blur="_rawFocused=false"
                  spellcheck="false"
                  placeholder="title: タイトル&#10;flow:&#10;|lane|: セグメント説明&#10;  @アクター > ?リードモデル > !コマンド > [イベント]"></textarea>
      </div>
      <div class="ef-actions">
        <span class="ef-err-msg" x-show="saveError" x-text="saveError"></span>
        <button class="ef-cancel-btn" @click="cancel()">キャンセル</button>
        <button class="ef-save-btn" @click="save()">保存</button>
      </div>
    </div>
  </div>
</div>'''

        body_html = body_html.replace(f'\n<!--EF_{eid}-->\n', editor)

    original_md_js = json.dumps(content, ensure_ascii=False)
    ef_meta_js = json.dumps(
        [
            {'id': b['id'], 'raw': b['raw'], 'open': b['open'], 'close': b['close']}
            for b in ef_blocks
        ],
        ensure_ascii=False,
    )

    return _PAGE_TEMPLATE.format(
        body=body_html,
        original_md=original_md_js,
        ef_meta=ef_meta_js,
        md_path=json.dumps(md_path, ensure_ascii=False),
    )


# ============================================================
# Page Template (CSS + Alpine.js + SVG renderer)
# ============================================================

_PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EventStorming Viewer</title>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
<style>
/* ── Base ── */
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif;
  background: #F5F5F5;
  color: #212121;
  line-height: 1.7;
}}
article {{
  max-width: 1360px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}}

/* ── Typography ── */
h1 {{ font-size: 1.8rem; font-weight: 800; color: #1A237E; margin: 32px 0 8px; }}
h2 {{ font-size: 1.3rem; font-weight: 700; color: #283593; margin: 28px 0 8px;
     padding-bottom: 6px; border-bottom: 2px solid #E3E8FF; }}
h3 {{ font-size: 1.1rem; font-weight: 700; color: #37474F; margin: 20px 0 6px; }}
h4 {{ font-size: 1rem; font-weight: 700; color: #546E7A; margin: 16px 0 4px; }}
p {{ margin: 6px 0; }}
ul {{ padding-left: 24px; margin: 4px 0; }}
li {{ margin: 2px 0; }}
strong {{ font-weight: 700; }}
em {{ font-style: italic; color: #5C6BC0; }}
code {{ font-family: 'Menlo', 'Monaco', monospace; font-size: 0.88em;
        background: #EEF; padding: 1px 4px; border-radius: 3px; }}
pre.code-block {{
  background: #1E1E2E; color: #CDD6F4;
  border-radius: 8px; padding: 16px; overflow-x: auto;
  margin: 12px 0;
}}
pre.code-block code {{
  background: none; color: inherit; font-size: 0.85rem;
  padding: 0; white-space: pre;
}}
hr.section-divider {{ border: none; border-top: 1px solid #E0E0E0; margin: 24px 0; }}
.spacer {{ height: 4px; }}
table.md-table {{
  border-collapse: collapse; margin: 12px 0; font-size: 14px;
  width: auto; min-width: 40%;
}}
table.md-table th, table.md-table td {{
  border: 1px solid #CFD8DC; padding: 6px 12px; text-align: left; vertical-align: top;
}}
table.md-table th {{ background: #ECEFF1; font-weight: 700; }}
table.md-table tbody tr:nth-child(even) {{ background: #FAFAFA; }}

/* ── EventStorming Editor ── */
.ef-editor {{
  border: 2px solid #C5CAE9;
  border-radius: 10px;
  background: #FAFAFE;
  margin: 16px 0;
  overflow: hidden;
}}

.ef-preview-box {{
  background: #FFF;
  border-bottom: 1px solid #E8EAF6;
}}

/* Two-column layout: fixed lane panel + scrollable content */
.ef-hscroll-wrap {{
  display: flex;
  overflow: hidden;
  background: #FFF;
}}
.ef-lane-panel {{
  flex-shrink: 0;
  overflow: hidden;
  line-height: 0;
  z-index: 5;
  border-right: 2px solid #CFD8DC;
}}
.ef-lane-panel svg {{ display: block; }}
.ef-content-scroll {{
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  line-height: 0;
}}
.ef-flow-title {{
  font-size: 13px; font-weight: 700; color: #37474F;
  padding: 8px 14px 4px; background: #FFF;
}}
.ef-view-container {{
  position: relative; display: inline-block; line-height: 0;
}}
.ef-seg-view-ov {{
  position: absolute; cursor: default;
}}
.ef-seg-tooltip {{
  position: fixed; z-index: 9999; pointer-events: none;
  background: rgba(33,33,33,0.92); color: #FFF;
  font-size: 13px; line-height: 1.5; padding: 8px 12px;
  border-radius: 6px; max-width: 500px; white-space: pre-wrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}}
[x-cloak] {{ display: none !important; }}
.ef-svg-preview {{ line-height: 0; }}
.ef-svg-preview svg {{
  display: block;
  height: auto;
}}
.ef-edit-btn {{
  padding: 5px 14px;
  font-size: 0.82rem; font-weight: 700;
  color: #3949AB; background: #EEF2FF;
  border: 1px solid #C5CAE9; border-radius: 20px;
  cursor: pointer; user-select: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  transition: background 0.15s;
}}
.ef-edit-btn:hover {{ background: #C5CAE9; }}

.ef-panel {{ border-top: 2px solid #C5CAE9; }}

/* ── Raw text editor ── */
.ef-raw-editor-wrap {{ padding: 10px 14px 4px; background: #FAFAFA; border-bottom: 1px solid #CFD8DC; }}
.ef-raw-textarea {{
  width: 100%;
  min-height: 260px;
  max-height: 500px;
  resize: vertical;
  font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #212121;
  background: #fff;
  border: 1px solid #B0BEC5;
  border-radius: 4px;
  padding: 8px 10px;
  outline: none;
  tab-size: 2;
}}
.ef-raw-textarea:focus {{ border-color: #7986CB; box-shadow: 0 0 0 2px rgba(121,134,203,0.2); }}

/* ── Edit mode: SVG overlay (same positions as view mode) ── */

.ef-edit-wrap {{ background: #F5F5F5; padding-bottom: 4px; }}

/* Container: position:relative so overlays are relative to SVG top-left */
/* NO padding here — padding shifts absolute children away from SVG coordinates */
.ef-ov-container {{
  position: relative; display: block; line-height: 0;
  background: #FFF;
}}
.ef-ov-svg {{ display: inline-block; line-height: 0; }}
.ef-ov-svg svg {{ display: block; pointer-events: none; }} /* SVG must not intercept clicks */

/* Note overlay: positioned at exact SVG note coordinates (same x,y as SVG rect) */
.ef-ve-note {{
  position: absolute;
  width: 130px; height: 72px; /* NOTE_W × NOTE_H */
  display: flex; flex-direction: column; align-items: center;
  background: transparent; /* SVG note shows through */
  overflow: hidden;
}}

/* Label input: fills full note height, centered */
.ef-label-ov {{
  flex: 1; width: 100%; box-sizing: border-box;
  background: transparent; border: none; outline: none;
  font-size: 11px; font-weight: 600; font-family: inherit;
  text-align: center; padding: 0 5px 4px; color: rgba(0,0,0,0.75);
  line-height: 1.3;
}}
.ef-label-ov:focus {{ background: rgba(255,255,255,0.35); }}

/* Delete button: absolute overlay top-right, visible on hover */
.ef-del-ov {{
  position: absolute; top: 1px; right: 1px;
  font-size: 9px; line-height: 1;
  background: rgba(255,255,255,0.5); border: none;
  color: rgba(0,0,0,0.4); padding: 1px 4px;
  cursor: pointer; border-radius: 2px;
  opacity: 0; transition: opacity 0.12s;
}}
.ef-ve-note:hover .ef-del-ov {{ opacity: 1; }}
.ef-del-ov:hover {{ background: rgba(180,0,0,0.15); color: #C62828; }}

/* Add-item ghost button: same width as note, appears below each segment */
.ef-ve-add-item {{
  position: absolute;
  width: 130px; height: 30px;
  background: transparent;
  border: 1.5px dashed rgba(100,100,100,0.25); border-radius: 3px;
  cursor: pointer; font-size: 11px;
  color: rgba(100,100,100,0.45); font-family: inherit;
}}
.ef-ve-add-item:hover {{ border-color: #546E7A; color: #546E7A; background: rgba(255,255,255,0.4); }}

/* Segment label band overlay (light-blue sticky, directly editable) */
.ef-seg-ov {{
  position: absolute;
  background: transparent; border: none; outline: none;
  font-size: 12px; font-style: italic; color: #1565C0;
  font-family: inherit; text-align: left;
  padding: 0 8px; cursor: text;
}}
.ef-seg-ov:focus {{ background: rgba(144,202,249,0.25); border-radius: 4px; }}

/* ── Metadata strip: styled like SVG lane-headers + segment-label-bands ── */
/* Each row = [connector] [lane header] [segment label band] [delete] */

.ef-edit-meta {{
  border-top: 1.5px solid #C5CAE9;
  display: flex; flex-direction: column;
}}

/* Title row */
.ef-meta-title {{
  display: flex; align-items: center;
  height: 44px; /* V_HEADER_H */
  background: #37474F; padding: 0 12px; gap: 8px;
}}
.ef-meta-title label {{
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.6);
  white-space: nowrap;
}}
.ef-meta-title .ef-meta-inp {{
  background: transparent; border: none; outline: none;
  font-size: 13px; font-weight: 700; color: #FFF;
  text-align: center; font-family: inherit; flex: 1;
}}
.ef-meta-title .ef-meta-inp::placeholder {{ color: rgba(255,255,255,0.35); font-weight: 400; }}

/* Segment rows: horizontal band matching SVG lane structure */
.ef-meta-row {{
  display: flex; align-items: stretch;
  min-height: 44px; /* bandH = 44 */
  border-bottom: 0.5px solid rgba(0,0,0,0.07);
}}

/* Connector button: left colored strip (matches SVG arrow color) */
.ef-conn-btn {{
  width: 36px; flex-shrink: 0;
  font-size: 11px; font-weight: 700;
  border: none; border-right: 1px solid rgba(255,255,255,0.18);
  cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
}}
.ef-conn-btn.is-async {{ background: #7B1FA2; color: #FFF; }}
.ef-conn-btn.is-sync  {{ background: #546E7A; color: #FFF; }}
.ef-conn-btn:hover {{ opacity: 0.82; }}

/* Spacer for first row (no connector) */
.ef-meta-conn-spacer {{ width: 36px; flex-shrink: 0; background: #ECEFF1; }}

/* Lane badge: matches SVG lane header (color set via :style binding) */
.ef-meta-lane {{
  width: 80px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #FFF; font-size: 10px; font-weight: 700; font-family: monospace;
  padding: 2px 4px; text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}}
.ef-meta-lane-inp {{
  border: none; outline: none; cursor: text;
  background: transparent;
}}
.ef-meta-lane-inp:focus {{ background: rgba(0,0,0,0.15); }}

/* Segment label: matches SVG light-blue band (#E3F2FD bg, italic blue text) */
.ef-meta-inp {{
  flex: 1; min-width: 0;
  padding: 4px 14px;
  background: #E3F2FD;
  border: none; outline: none;
  font-size: 12px; font-style: italic; color: #1565C0;
  font-family: inherit;
}}
.ef-meta-inp:focus {{ background: #D6EAF8; outline: none; }}
.ef-meta-inp::placeholder {{ color: #90CAF9; font-style: italic; }}

/* Delete button: right edge */
.ef-meta-del {{
  width: 36px; flex-shrink: 0;
  background: transparent; border: none; border-left: 0.5px solid rgba(0,0,0,0.07);
  color: #B0BEC5; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
}}
.ef-meta-del:hover {{ background: #FFE0E0; color: #C62828; }}

.ef-drag-handle {{
  cursor: grab; padding: 0 6px; color: rgba(255,255,255,0.4);
  font-size: 14px; user-select: none; flex-shrink: 0;
}}
.ef-drag-handle:active {{ cursor: grabbing; }}
.ef-meta-row.drag-over {{ border-top: 2px solid #90A4AE; }}

.ef-op-btn {{
  padding: 8px 14px; font-size: 0.8rem; color: #546E7A;
  background: #ECEFF1; border: none; border-top: 0.5px solid #E8EAF6;
  cursor: pointer; text-align: left;
}}
.ef-op-btn:hover {{ background: #CFD8DC; }}

.ef-actions {{
  display: flex; align-items: center; justify-content: flex-end;
  gap: 8px; margin: 6px 14px 10px;
  padding-top: 10px; border-top: 1px solid #E8EAF6;
}}
.ef-err-msg {{ font-size: 0.85rem; color: #C62828; margin-right: auto; }}
.ef-cancel-btn {{
  padding: 7px 18px; font-size: 0.88rem; font-weight: 600;
  color: #546E7A; background: #ECEFF1; border: 1px solid #B0BEC5;
  border-radius: 6px; cursor: pointer;
}}
.ef-cancel-btn:hover {{ background: #CFD8DC; }}
.ef-save-btn {{
  padding: 7px 20px; font-size: 0.88rem; font-weight: 700;
  background: #3949AB; color: #FFF; border: none; border-radius: 6px;
  cursor: pointer;
}}
.ef-save-btn:hover {{ background: #283593; }}
</style>
</head>
<body>
<article>
{body}
</article>

<script>
// ============================================================
// Global state (original MD + block metadata)
// ============================================================
window.__ORIGINAL_MD__ = {original_md};
window.__EF_META__ = {ef_meta};
window.__MD_PATH__ = {md_path};

// ============================================================
// EventStorming SVG Renderer (port of event_flow.py)
// ============================================================
const COLORS = {{
  actor:     {{bg:'#FFF59D', border:'#F9A825', text:'#4E342E', label:'#795548'}},
  command:   {{bg:'#90CAF9', border:'#1565C0', text:'#0D47A1', label:'#1565C0'}},
  event:     {{bg:'#FFAB40', border:'#E65100', text:'#7f2700', label:'#BF360C'}},
  policy:    {{bg:'#CE93D8', border:'#7B1FA2', text:'#4A148C', label:'#4A148C'}},
  readmodel: {{bg:'#A5D6A7', border:'#2E7D32', text:'#1B5E20', label:'#2E7D32'}},
}};
const TYPE_LABELS = {{
  actor:'Actor', command:'Command', event:'(Event)', policy:'{{Policy}}', readmodel:'Read Model'
}};
const LABEL_WRAP = {{
  actor:['',''], command:['',''], event:['',''], policy:['',''], readmodel:['','']
}};
const NOTE_W=130, NOTE_H=72, PADDING_X=30, PADDING_Y=20;
const V_COL_W=180, V_COL_PAD=25, V_HEADER_H=44, V_GAP=18, V_CROSS_GAP=36, V_LABEL_H=56;
const LANE_COLORS=['#37474F','#455A64','#546E7A','#607D8B','#78909C'];
const F = "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif";

function esc(s) {{
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}}

function splitLabel(text, maxChars=14) {{
  if (!text) return [''];
  if ([...text].length <= maxChars) return [text];
  const chars = [...text];
  const lines = [];
  let cur = '';
  for (const ch of chars) {{
    if ([...cur].length >= maxChars) {{ lines.push(cur); cur = ch; }}
    else cur += ch;
  }}
  if (cur) lines.push(cur);
  return lines;
}}

function renderEventFlowSVG(items, segLabels, title, editMode) {{
  editMode = !!editMode;
  const EMPTY_SVG = '<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">' +
    '<text x="150" y="45" text-anchor="middle" font-size="13" fill="#999" font-family="' + F + '">ノードがありません</text></svg>';
  if (!items || items.length === 0) {{
    return editMode ? {{svg: EMPTY_SVG, positions: [], addPositions: [], addAbovePositions: [], dividerPositions: [], totalW: 300, totalH: 80}} : EMPTY_SVG;
  }}

  // ── Horizontal layout: time flows left→right ──
  const H_LANE_HDR_W = 110;   // lane name column on left
  const H_SEG_PAD    = 20;    // padding before first / after last segment
  const H_ITEM_GAP   = 20;    // horizontal gap between notes within a segment
  const H_SEG_GAP    = 60;    // gap between segments (cross-lane arrow space)
  const H_LANE_PAD   = 24;    // vertical padding inside each lane row
  const H_LANE_H     = NOTE_H + H_LANE_PAD * 2;
  const H_SEG_LBL_H  = 44;    // segment label band height
  const H_TITLE_H    = 0; // title rendered as HTML outside SVG

  // Unique lanes in first-appearance order
  const laneOrder = [];
  for (const item of items) {{
    const ln = item.lane || 'default';
    if (!laneOrder.includes(ln)) laneOrder.push(ln);
  }}

  // Group into segments (consecutive same-lane runs)
  const segments = [];
  let curSeg = null;
  items.forEach(item => {{
    const ln = item.lane || laneOrder[0];
    if (!curSeg || ln !== curSeg.lane) {{ curSeg = {{lane: ln, items: []}}; segments.push(curSeg); }}
    curSeg.items.push(item);
  }});

  // Segment widths and X positions
  const segW = segments.map(seg => seg.items.length * (NOTE_W + H_ITEM_GAP) - H_ITEM_GAP);
  const segX = [];
  let curX = H_LANE_HDR_W + H_SEG_PAD;
  segments.forEach((_, si) => {{ segX.push(curX); curX += segW[si] + H_SEG_GAP; }});
  const totalW = curX - H_SEG_GAP + H_SEG_PAD;

  // Show segment label strip if any label exists (or always in edit mode)
  const hasSegLabels = editMode || segments.some((_, si) => !!(segLabels[si] ?? segLabels[String(si)]));
  const segLblH = hasSegLabels ? H_SEG_LBL_H : 0;

  // Lane Y positions (top-of-note inside lane row)
  const laneY = {{}};
  laneOrder.forEach((ln, li) => {{
    laneY[ln] = H_TITLE_H + segLblH + li * H_LANE_H + H_LANE_PAD;
  }});
  const totalH = H_TITLE_H + segLblH + laneOrder.length * H_LANE_H + 20;

  // Compute flat item positions
  const positions = [];
  segments.forEach((seg, si) => {{
    const ny = laneY[seg.lane] ?? (H_TITLE_H + segLblH + H_LANE_PAD);
    seg.items.forEach((item, ii) => {{
      const nx = segX[si] + ii * (NOTE_W + H_ITEM_GAP);
      const tp = item.type || 'command';
      const rawLines = splitLabel(item.label || '', 10);
      const wrap = LABEL_WRAP[tp] || ['',''];
      const labelLines = [...rawLines];
      if (labelLines.length) {{
        labelLines[0] = wrap[0] + labelLines[0];
        labelLines[labelLines.length - 1] += wrap[1];
      }}
      positions.push({{ x: nx, y: ny, type: tp, label: item.label || '', labelLines,
        typeLabel: TYPE_LABELS[tp] || tp, isAsync: !!item.isAsync,
        lane: seg.lane, si, ii, idx: positions.length }});
    }});
  }});

  const parts = [];

  // Defs
  parts.push(`<defs>
  <marker id="ef-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#546E7A"/></marker>
  <marker id="ef-arr-async" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7B1FA2"/></marker>
  <filter id="ef-sh" x="-4%" y="-4%" width="108%" height="116%"><feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.12"/></filter>
</defs>`);

  // Title is rendered as HTML outside the SVG (in ef-flow-title)

  // Lane row backgrounds (full width)
  const bgCols = ['#F8F9FA','#FFFFFF'];
  laneOrder.forEach((ln, li) => {{
    const ry = H_TITLE_H + segLblH + li * H_LANE_H;
    parts.push(`<rect x="0" y="${{ry}}" width="${{totalW}}" height="${{H_LANE_H}}" fill="${{bgCols[li%2]}}" stroke="#E8EAED" stroke-width="0.5"/>`);
  }});

  // Lane headers (left column)
  laneOrder.forEach((ln, li) => {{
    const ry = H_TITLE_H + segLblH + li * H_LANE_H;
    const lc = LANE_COLORS[li % LANE_COLORS.length];
    parts.push(`<rect x="0" y="${{ry}}" width="${{H_LANE_HDR_W}}" height="${{H_LANE_H}}" fill="${{lc}}"/>`);
    const lnLines = splitLabel(ln, 9);
    const lnLineH = 14;
    const lnBlockH = lnLines.length * lnLineH;
    const lnY0 = ry + (H_LANE_H - lnBlockH) / 2 + 11;
    lnLines.forEach((ll, lli) => {{
      parts.push(`<text x="${{H_LANE_HDR_W/2}}" y="${{lnY0 + lli*lnLineH}}" text-anchor="middle" font-size="11" font-weight="700" fill="#FFF" font-family="${{F}}">${{esc(ll)}}</text>`);
    }});
  }});

  // Segment label bands (top strip, one per segment)
  const svgUid = Date.now().toString(36);
  if (hasSegLabels) {{
    segments.forEach((_, si) => {{
      const lbl = segLabels[si] ?? segLabels[String(si)] ?? '';
      const bx = segX[si], bw = segW[si], by = H_TITLE_H;
      const clipId = `sc-${{svgUid}}-${{si}}`;
      // clipPath: text starts from left, clips at right edge
      parts.push(`<clipPath id="${{clipId}}"><rect x="${{bx}}" y="${{by}}" width="${{bw}}" height="${{H_SEG_LBL_H}}"/></clipPath>`);
      parts.push(`<rect x="${{bx}}" y="${{by}}" width="${{bw}}" height="${{H_SEG_LBL_H}}" fill="#E3F2FD" rx="4" stroke="#90CAF9" stroke-width="0.8"/>`);
      if (!editMode && lbl) {{
        // Left-aligned text, clipped at right edge
        parts.push(`<text x="${{bx+8}}" y="${{by + H_SEG_LBL_H/2 + 5}}" text-anchor="start" font-size="12" font-style="italic" fill="#1565C0" font-family="${{F}}" clip-path="url(#${{clipId}})" pointer-events="none">${{esc(lbl)}}</text>`);
      }}
    }});
  }}

  // Arrows (before notes so notes render on top)
  for (let k = 1; k < positions.length; k++) {{
    const prev = positions[k-1], curr = positions[k];
    const px = prev.x + NOTE_W, py = prev.y + NOTE_H/2;
    const cx2 = curr.x,         cy2 = curr.y + NOTE_H/2;

    if (prev.si === curr.si) {{
      // Within segment: straight horizontal arrow
      parts.push(`<line x1="${{px}}" y1="${{py}}" x2="${{cx2}}" y2="${{cy2}}" stroke="#546E7A" stroke-width="1.8" marker-end="url(#ef-arr)"/>`);
    }} else {{
      // Cross-segment: bezier curve
      const isAsync = curr.isAsync;
      const stroke = isAsync ? '#7B1FA2' : '#90A4AE';
      const dash = isAsync ? ' stroke-dasharray="8 4"' : ' stroke-dasharray="6 3"';
      const marker = isAsync ? 'ef-arr-async' : 'ef-arr';
      const mx = (px + cx2) / 2;
      parts.push(`<path d="M${{px}},${{py}} C${{mx}},${{py}} ${{mx}},${{cy2}} ${{cx2}},${{cy2}}" fill="none" stroke="${{stroke}}" stroke-width="2"${{dash}} marker-end="url(#${{marker}})"/>`);
      if (isAsync) {{
        const labelY = Math.min(py, cy2) - 6;
        parts.push(`<text x="${{mx}}" y="${{labelY}}" text-anchor="middle" font-size="9" font-weight="600" fill="#7B1FA2" font-family="${{F}}">⚡ async</text>`);
      }}
    }}
  }}

  // Notes (on top of everything)
  for (const pos of positions) {{
    const c = COLORS[pos.type] || COLORS.command;
    const cx3 = pos.x + NOTE_W/2;
    parts.push(`<g filter="url(#ef-sh)">`);
    parts.push(`<rect x="${{pos.x}}" y="${{pos.y}}" width="${{NOTE_W}}" height="${{NOTE_H}}" rx="3" fill="${{c.bg}}" stroke="${{c.border}}" stroke-width="2"/>`);
    if (!editMode) {{
      parts.push(`<text x="${{cx3}}" y="${{pos.y+16}}" text-anchor="middle" font-size="9" font-weight="700" fill="${{c.label}}" font-family="${{F}}">${{esc(pos.typeLabel)}}</text>`);
      const nLines = Math.min(pos.labelLines.length, 3);
      const lineY0 = pos.y + (nLines <= 2 ? 36 : 30);
      pos.labelLines.slice(0, 3).forEach((ln2, li) => {{
        parts.push(`<text x="${{cx3}}" y="${{lineY0 + li*14}}" text-anchor="middle" font-size="11" font-weight="600" fill="${{c.text}}" font-family="${{F}}">${{esc(ln2)}}</text>`);
      }});
    }}
    parts.push('</g>');
  }}

  const svgStr = `<svg width="${{totalW}}" height="${{totalH}}" viewBox="0 0 ${{totalW}} ${{totalH}}" xmlns="http://www.w3.org/2000/svg">${{parts.join('\\n')}}</svg>`;
  const segLabelPositions = hasSegLabels ? segments.map((_, si) => ({{
    x: segX[si], y: H_TITLE_H, width: segW[si], height: H_SEG_LBL_H, gi: si,
  }})) : [];
  if (editMode) {{
    return {{ svg: svgStr, positions, addPositions: [], addAbovePositions: [], dividerPositions: segLabelPositions, totalW, totalH, laneHdrW: H_LANE_HDR_W }};
  }}
  return {{ svg: svgStr, totalW, totalH, laneHdrW: H_LANE_HDR_W, segLabelPositions }};
}}

// ============================================================
// Flow parsing: flow string → items array
// ============================================================
let _idCtr = 0;

function parseFlowStr(flowStr) {{
  if (!flowStr) return [];
  const items = [];
  let currentLane = 'default';
  let isNextAsync = false;

  for (const rawLine of flowStr.split('\\n')) {{
    const line = rawLine.trim();
    if (!line) continue;

    // Async lane transition: >> |lane|[: description]
    const asyncLaneMatch = line.match(/^>>\\s*\\|([^|]+)\\|/);
    if (asyncLaneMatch) {{
      isNextAsync = true;
      currentLane = asyncLaneMatch[1].trim();
      continue;
    }}

    // Lane header: |lane|[: description]  (no >> prefix)
    const laneMatch = line.match(/^\\|([^|]+)\\|/);
    if (laneMatch) {{
      currentLane = laneMatch[1].trim();
      continue;
    }}

    // Flow items line: item > item > item [>>]
    // Trailing >> means async transition to next segment
    let flowLine = line.trimEnd();
    const endsWithAsync = flowLine.endsWith('>>');
    if (endsWithAsync) flowLine = flowLine.slice(0, -2).trim();

    const parts = flowLine.split('>').map(s => s.trim()).filter(Boolean);
    let firstInLine = true;
    for (const part of parts) {{
      let type, label;
      if (part.startsWith('@'))                               {{ type='actor';   label=part.slice(1).trim(); }}
      else if (part.startsWith('!'))                          {{ type='command'; label=part.slice(1).trim(); }}
      else if (part.startsWith('[') && part.endsWith(']'))    {{ type='event';   label=part.slice(1,-1).trim(); }}
      else if (part.startsWith('$'))                          {{ type='policy';  label=part.slice(1).trim(); }}
      else if (part.startsWith('?'))                          {{ type='readmodel'; label=part.slice(1).trim(); }}
      else                                                    {{ type='command'; label=part; }}

      items.push({{ _id: _idCtr++, lane: currentLane, type, label, isAsync: firstInLine && isNextAsync }});
      firstInLine = false;
    }}
    isNextAsync = endsWithAsync;
  }}
  return items;
}}

function parseSegLabels(flowStr) {{
  if (!flowStr) return {{}};
  const labels = {{}};
  let gi = -1;
  for (const rawLine of flowStr.split('\\n')) {{
    const line = rawLine.trim();
    if (!line) continue;
    const asyncPrefix = line.startsWith('>>');
    const rest = asyncPrefix ? line.slice(2).trim() : line;
    const laneMatch = rest.match(/^\\|([^|]+)\\|(?::\\s*(.*))?$/);
    if (laneMatch) {{
      gi++;
      const desc = (laneMatch[2] || '').trim();
      if (desc) labels[gi] = desc;
    }}
  }}
  return labels;
}}

function itemsToGroups(items) {{
  const groups = [];
  let cur = null;
  for (const item of items) {{
    if (!cur || item.lane !== cur.lane) {{ cur = {{lane: item.lane, items:[]}}; groups.push(cur); }}
    cur.items.push(item);
  }}
  return groups;
}}

function groupsToItems(groups) {{
  return groups.flatMap(grp => grp.items.map(it => ({{...it, lane: grp.lane}})));
}}

// Render flow parts as indented multi-line text, breaking after each [event].
// Example: `  @actor > !cmd > [event1]\\n  > !cmd2 > [event2] >>`
function formatFlowBody(parts, asyncSuffix) {{
  const joined = parts.join(' > ');
  const multiline = joined.replace(/\\] > /g, ']\\n  > ');
  return `  ${{multiline}}${{asyncSuffix}}\\n`;
}}

function serializeToBlock(groups, title, segLabels, openDelim, closeDelim) {{
  const open = openDelim || '```event-flow-svg';
  const close = closeDelim || '```';
  let block = `${{open}}\ntitle: ${{title}}\nflow:\n`;

  groups.forEach((grp, gi) => {{
    const lbl = segLabels[gi] ?? segLabels[String(gi)] ?? '';
    block += `|${{grp.lane}}|${{lbl ? ': ' + lbl : ''}}\n`;

    const parts = grp.items.map(item => {{
      if (item.type === 'actor')     return `@${{item.label}}`;
      if (item.type === 'command')   return `!${{item.label}}`;
      if (item.type === 'event')     return `[${{item.label}}]`;
      if (item.type === 'policy')    return `$${{item.label}}`;
      if (item.type === 'readmodel') return `?${{item.label}}`;
      return item.label;
    }});

    // Trailing >> if next segment starts asynchronously
    const nextGrp = groups[gi + 1];
    const asyncSuffix = (nextGrp && nextGrp.items[0] && nextGrp.items[0].isAsync) ? ' >>' : '';
    block += formatFlowBody(parts, asyncSuffix);
  }});

  block += close;
  return block;
}}

function serializeToRawText(groups, title, segLabels) {{
  let text = `title: ${{title}}\nflow:\n`;
  groups.forEach((grp, gi) => {{
    const lbl = segLabels[gi] ?? segLabels[String(gi)] ?? '';
    text += `|${{grp.lane}}|${{lbl ? ': ' + lbl : ''}}\n`;
    const parts = grp.items.map(item => {{
      if (item.type === 'actor')     return `@${{item.label}}`;
      if (item.type === 'command')   return `!${{item.label}}`;
      if (item.type === 'event')     return `[${{item.label}}]`;
      if (item.type === 'policy')    return `$${{item.label}}`;
      if (item.type === 'readmodel') return `?${{item.label}}`;
      return item.label;
    }});
    const nextGrp = groups[gi + 1];
    const asyncSuffix = (nextGrp && nextGrp.items[0] && nextGrp.items[0].isAsync) ? ' >>' : '';
    text += formatFlowBody(parts, asyncSuffix);
  }});
  return text;
}}

function parseRawText(text) {{
  // Extract title and flow from raw text (no ::: delimiters)
  let title = '';
  let flowLines = [];
  let inFlow = false;
  for (const rawLine of text.split('\\n')) {{
    const line = rawLine.trimEnd();
    if (line.startsWith('title:')) {{
      title = line.slice('title:'.length).trim();
    }} else if (line.trim() === 'flow:') {{
      inFlow = true;
    }} else if (inFlow) {{
      flowLines.push(line);
    }}
  }}
  const flowStr = flowLines.join('\\n');
  const items = parseFlowStr(flowStr);
  const segLabels = parseSegLabels(flowStr);
  const groups = itemsToGroups(items);
  // Ensure segLabels has entries for all groups
  groups.forEach((_, gi) => {{
    if (!(gi in segLabels)) segLabels[gi] = '';
  }});
  return {{ title, groups, segLabels }};
}}

// ============================================================
// Alpine.js component
// ============================================================
function efEditor(props, efId) {{
  return {{
    props,
    efId,
    flowTitle: props.title || '',
    itemGroups: [],
    segLabels: {{}},
    svgHtml: '',
    editSvgHtml: '',
    editNotePositions: [],
    editAddPositions: [],
    editAddAbovePositions: [],
    editSegPositions: [],
    laneSvgHtml: '',
    editLaneSvgHtml: '',
    laneHdrW: 110,
    viewSegPositions: [],
    tooltip: {{show: false, text: '', x: 0, y: 0}},
    editing: false,
    savedAt: null,
    saveError: null,
    _snapshot: null,
    _dragIdx: null,
    _dragOver: null,
    rawText: '',
    _rawFocused: false,

    updateSvg() {{
      const items = groupsToItems(this.itemGroups);
      const view = renderEventFlowSVG(items, this.segLabels, this.flowTitle, false);
      const ed  = renderEventFlowSVG(items, this.segLabels, this.flowTitle, true);
      this.svgHtml = view.svg;
      this.editSvgHtml = ed.svg;
      this.laneHdrW = view.laneHdrW;
      // Lane-only SVGs: clip viewBox to lane header width
      const clipToLane = (s, w, h) => s.replace(
        /width="[0-9]+" height="[0-9]+" viewBox="0 0 [0-9]+ [0-9]+"/,
        `width="${{w}}" height="${{h}}" viewBox="0 0 ${{w}} ${{h}}"`
      );
      this.laneSvgHtml      = clipToLane(view.svg, view.laneHdrW, view.totalH);
      this.editLaneSvgHtml  = clipToLane(ed.svg,   ed.laneHdrW,   ed.totalH);
      this.viewSegPositions = view.segLabelPositions || [];
      // Map positions to [gi, ii] via itemGroups order
      const itemMap = [];
      this.itemGroups.forEach((grp, gi) => grp.items.forEach((_, ii) => itemMap.push({{gi, ii}})));
      this.editNotePositions = ed.positions.map((pos, k) => ({{...pos, ...(itemMap[k] || {{gi:0,ii:0}})}}));
      const addBtns = [];
      ed.positions.forEach((pos, k) => {{
        const m = itemMap[k] || {{gi:0, ii:0}};
        const grp = this.itemGroups[m.gi];
        if (!grp || !grp.items[m.ii]) return;
        const tp = grp.items[m.ii].type;
        if (tp === 'event') {{
          addBtns.push({{x: pos.x, y: pos.y + NOTE_H + 4, gi: m.gi, ii: m.ii + 1}});
        }} else if (tp === 'actor' || tp === 'policy') {{
          addBtns.push({{x: pos.x, y: pos.y - 30 - 4, gi: m.gi, ii: m.ii}});
        }}
      }});
      this.editAddAbovePositions = addBtns;
      this.editSegPositions = ed.dividerPositions || [];
      // Sync raw text editor (only when not actively typing in it)
      if (!this._rawFocused) {{
        this.rawText = serializeToRawText(this.itemGroups, this.flowTitle, this.segLabels);
      }}
    }},

    init() {{
      const items = parseFlowStr(props.flow || '');
      this.itemGroups = itemsToGroups(items);
      const sl = parseSegLabels(props.flow || '');
      this.segLabels = sl;
      // Ensure segLabels has entries for all groups
      this.itemGroups.forEach((_, gi) => {{
        if (!(gi in this.segLabels)) this.segLabels[gi] = '';
      }});
      this.updateSvg();
    }},

    syncLane(gi) {{
      const grp = this.itemGroups[gi];
      grp.items.forEach(it => {{ it.lane = grp.lane; }});
      this.updateSvg();
    }},

    startEdit() {{
      this._snapshot = JSON.parse(JSON.stringify({{
        itemGroups: this.itemGroups,
        segLabels: this.segLabels,
        flowTitle: this.flowTitle,
      }}));
      this.rawText = serializeToRawText(this.itemGroups, this.flowTitle, this.segLabels);
      this.editing = true;
    }},

    onRawInputSvg(val) {{
      this._rawFocused = true;
      try {{
        const parsed = parseRawText(val);
        this.flowTitle = parsed.title;
        this.itemGroups = parsed.groups;
        this.segLabels = parsed.segLabels;
        // Re-render SVG only (rawText already updated by x-model)
        const items = groupsToItems(this.itemGroups);
        const view = renderEventFlowSVG(items, this.segLabels, this.flowTitle, false);
        const ed  = renderEventFlowSVG(items, this.segLabels, this.flowTitle, true);
        this.svgHtml = view.svg;
        this.editSvgHtml = ed.svg;
        this.laneHdrW = view.laneHdrW;
        const clipToLane = (s, w, h) => s.replace(
          /width="[0-9]+" height="[0-9]+" viewBox="0 0 [0-9]+ [0-9]+"/,
          `width="${{w}}" height="${{h}}" viewBox="0 0 ${{w}} ${{h}}"`
        );
        this.laneSvgHtml     = clipToLane(view.svg, view.laneHdrW, view.totalH);
        this.editLaneSvgHtml = clipToLane(ed.svg,   ed.laneHdrW,   ed.totalH);
        this.viewSegPositions = view.segLabelPositions || [];
        const itemMap = [];
        this.itemGroups.forEach((grp, gi) => grp.items.forEach((_, ii) => itemMap.push({{gi, ii}})));
        this.editNotePositions = ed.positions.map((pos, k) => ({{...pos, ...(itemMap[k] || {{gi:0,ii:0}})}}));
        this.editSegPositions = ed.dividerPositions || [];
      }} catch(e) {{
        // parse error: ignore, keep showing last valid SVG
      }}
    }},

    cancel() {{
      if (this._snapshot) {{
        this.itemGroups = this._snapshot.itemGroups;
        this.segLabels = this._snapshot.segLabels;
        this.flowTitle = this._snapshot.flowTitle;
        this._snapshot = null;
        this.updateSvg();
      }}
      this.editing = false;
    }},

    addItem(gi) {{
      const grp = this.itemGroups[gi];
      const last = grp.items[grp.items.length - 1];
      const cycle = {{command:'event', event:'policy', policy:'command', actor:'command'}};
      const nextType = last ? (cycle[last.type] || 'command') : 'command';
      grp.items.push({{ _id: _idCtr++, lane: grp.lane, type: nextType, label: '新規', isAsync: false }});
      this.updateSvg();
    }},

    insertItemBefore(gi, ii) {{
      const grp = this.itemGroups[gi];
      const cur = grp.items[ii];
      const cycle = {{command:'event', event:'policy', policy:'command', actor:'command'}};
      const nextType = cur ? (cycle[cur.type] || 'command') : 'command';
      grp.items.splice(ii, 0, {{ _id: _idCtr++, lane: grp.lane, type: nextType, label: '新規', isAsync: false }});
      this.updateSvg();
    }},

    deleteItem(gi, ii) {{
      const grp = this.itemGroups[gi];
      if (grp.items.length <= 1) {{
        if (this.itemGroups.length > 1) {{
          this.itemGroups.splice(gi, 1);
          this._reindexSegLabels(gi);
        }}
        return;
      }}
      grp.items.splice(ii, 1);
      this.updateSvg();
    }},

    deleteGroup(gi) {{
      if (this.itemGroups.length > 1) {{
        this.itemGroups.splice(gi, 1);
        this._reindexSegLabels(gi);
        this.updateSvg();
      }}
    }},

    _reindexSegLabels(removed) {{
      const newSl = {{}};
      Object.keys(this.segLabels).forEach(k => {{
        const n = parseInt(k);
        if (n < removed) newSl[n] = this.segLabels[k];
        else if (n > removed) newSl[n-1] = this.segLabels[k];
      }});
      this.segLabels = newSl;
    }},

    renameLane(gi, newName) {{
      const grp = this.itemGroups[gi];
      if (!grp) return;
      grp.lane = newName;
      grp.items.forEach(item => {{ item.lane = newName; }});
      this.updateSvg();
    }},

    moveLane(from, to) {{
      if (from === null || from === to) return;
      const groups = [...this.itemGroups];
      const [moved] = groups.splice(from, 1);
      groups.splice(to, 0, moved);
      this.itemGroups = groups;
      const n = groups.length;
      const labels = Array.from({{length: n}}, (_, i) => this.segLabels[i] || '');
      const [movedLabel] = labels.splice(from, 1);
      labels.splice(to, 0, movedLabel);
      const newSl = {{}};
      labels.forEach((l, i) => {{ newSl[i] = l; }});
      this.segLabels = newSl;
      this.updateSvg();
    }},

    addLane() {{
      const name = `lane-${{this.itemGroups.length}}`;
      this.itemGroups.push({{
        lane: name,
        items: [{{ _id: _idCtr++, lane: name, type: 'command', label: '', isAsync: true }}]
      }});
      this.segLabels[this.itemGroups.length - 1] = '';
      this.updateSvg();
    }},

    async save() {{
      this.saveError = null;
      try {{
        const efMeta = window.__EF_META__;
        const efInfo = efMeta.find(e => e.id === this.efId);
        if (!efInfo) {{ this.saveError = '保存エラー: ブロック情報が見つかりません'; return; }}
        const newBlock = serializeToBlock(
          this.itemGroups, this.flowTitle, this.segLabels,
          efInfo.open, efInfo.close
        );

        let md = window.__ORIGINAL_MD__;
        md = md.replace(efInfo.raw, newBlock);
        efInfo.raw = newBlock;
        window.__ORIGINAL_MD__ = md;

        const resp = await fetch('/save', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{content: md}}),
        }});
        if (resp.ok) {{
          this.editing = false;
        }} else {{
          this.saveError = `保存エラー: ${{resp.status}} ${{resp.statusText}}`;
        }}
      }} catch(e) {{
        this.saveError = `保存エラー: ${{e.message}}`;
      }}
    }}
  }};
}}
</script>
</body>
</html>'''


# ============================================================
# HTTP Server
# ============================================================

class _Handler(http.server.BaseHTTPRequestHandler):
    md_path: str = ''

    def _respond(self, status: int, content_type: str, data: bytes) -> None:
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path != '/':
            self.send_response(404)
            self.end_headers()
            return
        try:
            page = build_page(self.md_path)
            self._respond(200, 'text/html; charset=utf-8', page.encode('utf-8'))
        except Exception as e:
            self._respond(500, 'text/plain; charset=utf-8', f'Error: {e}'.encode('utf-8'))

    def do_POST(self):
        if self.path != '/save':
            self.send_response(404)
            self.end_headers()
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length > _MAX_CONTENT_BYTES:
                raise ValueError('content too large (max 10MB)')
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))
            content = data.get('content')
            if not isinstance(content, str):
                raise ValueError('content must be a string')
            Path(self.md_path).write_text(content, encoding='utf-8')
            self._respond(200, 'application/json; charset=utf-8', json.dumps({'ok': True}).encode('utf-8'))
        except Exception as e:
            self._respond(500, 'application/json; charset=utf-8', json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))

    def log_message(self, fmt, *args):
        pass  # suppress request logs


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'):
        print('Usage: python3 render.py <md-file> [--no-browser] [--port N]', file=sys.stderr)
        sys.exit(1)

    md_path = os.path.abspath(args[0])
    no_browser = '--no-browser' in args
    port = DEFAULT_PORT
    for i, a in enumerate(args):
        if a == '--port' and i + 1 < len(args):
            port = int(args[i + 1])

    if not Path(md_path).exists():
        print(f'File not found: {md_path}', file=sys.stderr)
        sys.exit(1)

    # Bind handler to md_path via subclass
    class Handler(_Handler):
        pass
    Handler.md_path = md_path

    server = http.server.HTTPServer(('localhost', port), Handler)
    url = f'http://localhost:{port}/'
    print(f'EventStorming Viewer: {url}')
    print(f'Serving: {md_path}')
    print('Ctrl-C to stop.')

    if not no_browser:
        threading.Timer(0.5, lambda: subprocess.run(['open', url])).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
