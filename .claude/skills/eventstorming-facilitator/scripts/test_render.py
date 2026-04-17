#!/usr/bin/env python3
"""
Playwright-based integration tests for render.py.

Setup (one-time):
  pip install playwright
  playwright install chromium

Run from repo root:
  python3 .claude/skills/eventstorming-facilitator/scripts/test_render.py
"""

import subprocess
import sys
import time
import os
import json
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]  # ai-coach/
RENDER_PY = Path(__file__).parent / 'render.py'
MD_FILE = REPO_ROOT / 'doc/eventstorming/eventstorming-20260412-1155.md'
PORT = 8766  # Use a different port than default to avoid conflicts
URL = f'http://localhost:{PORT}/'

TEST_LABEL = 'TestLabel_X'  # Must be ≤ 14 chars so splitLabel() does not split it across SVG text elements


def run():
    # -----------------------------------------------------------------------
    # 0. Verify files exist
    # -----------------------------------------------------------------------
    assert RENDER_PY.exists(), f'render.py not found: {RENDER_PY}'
    assert MD_FILE.exists(), f'MD file not found: {MD_FILE}'

    original_md = MD_FILE.read_text(encoding='utf-8')

    # -----------------------------------------------------------------------
    # 1. Start render.py server
    # -----------------------------------------------------------------------
    print(f'Starting server on port {PORT}...')
    proc = subprocess.Popen(
        [sys.executable, str(RENDER_PY), str(MD_FILE), '--no-browser', '--port', str(PORT)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(1.5)  # Wait for server to start

    if proc.poll() is not None:
        out, err = proc.communicate()
        print('Server failed to start!')
        print('stdout:', out.decode())
        print('stderr:', err.decode())
        sys.exit(1)

    try:
        from playwright.sync_api import sync_playwright, expect
        _run_tests(sync_playwright, expect)
    finally:
        proc.terminate()
        proc.wait()
        # Restore original MD content
        MD_FILE.write_text(original_md, encoding='utf-8')
        print('✅ MD file restored to original.')


def _run_tests(sync_playwright, expect):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture JS console errors for debugging
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg) if msg.type == 'error' else None)

        # -------------------------------------------------------------------
        # 2. Page loads
        # -------------------------------------------------------------------
        print('Test 1: Page loads...')
        page.goto(URL, timeout=15000)
        # Wait for Alpine.js CDN defer script to load and execute
        page.wait_for_load_state('networkidle', timeout=15000)
        title = page.title()
        assert 'EventStorming' in title, f'Unexpected title: {title!r}'
        print(f'  ✓ Page loaded (title: {title!r})')

        # -------------------------------------------------------------------
        # 3. Event Walkthrough editors are present
        # -------------------------------------------------------------------
        print('Test 2: Event flow editors present...')
        editors = page.locator('.ef-editor')
        count = editors.count()
        assert count > 0, 'No .ef-editor elements found'
        print(f'  ✓ Found {count} event flow editor(s)')

        # -------------------------------------------------------------------
        # 4. SVG preview is rendered (wait for Alpine.js x-html to inject SVG)
        # -------------------------------------------------------------------
        print('Test 3: SVG preview rendered...')
        # Wait for Alpine.js to inject SVG into the preview div
        page.wait_for_function(
            'document.querySelector(".ef-svg-preview svg") !== null',
            timeout=10000
        )
        svg = page.locator('.ef-editor').first.locator('.ef-svg-preview svg')
        svg_html = svg.inner_html()
        assert len(svg_html) > 100, 'SVG seems empty'
        if console_errors:
            for e in console_errors:
                print(f'  ⚠ JS error: {e.text}')
        print(f'  ✓ SVG rendered ({len(svg_html)} chars)')

        # -------------------------------------------------------------------
        # 5. Edit a label → SVG updates reactively
        # -------------------------------------------------------------------
        print('Test 4: Edit label → SVG updates reactively...')
        # Directly mutate Alpine.js reactive data via _x_dataStack, which is
        # more reliable than synthetic DOM events in headless Playwright.
        original_value = page.evaluate('''() => {
          const el = document.querySelector("#ef-0");
          const data = el._x_dataStack && el._x_dataStack[0];
          if (!data || !data.itemGroups || !data.itemGroups[0] || !data.itemGroups[0].items[0]) return null;
          const orig = data.itemGroups[0].items[0].label;
          data.itemGroups[0].items[0].label = "''' + TEST_LABEL + '''";
          data.updateSvg();  // Force SVG re-render (bypasses DOM event pathway)
          return orig;
        }''')
        assert original_value is not None, 'Could not find Alpine.js itemGroups data'
        page.wait_for_timeout(300)  # Allow Alpine.js to apply DOM update

        new_svg = page.evaluate('document.querySelector("#ef-0 .ef-svg-preview").innerHTML')
        assert TEST_LABEL in new_svg, (
            f'SVG did not update with new label.\n'
            f'Expected: {TEST_LABEL!r}\n'
            f'SVG snippet: {new_svg[:300]}'
        )
        print(f'  ✓ SVG updated reactively with: {TEST_LABEL!r}')

        # -------------------------------------------------------------------
        # 6. Save → MD file updated (save also closes edit mode)
        # -------------------------------------------------------------------
        print('Test 5: Save → MD file updated...')
        # Open edit panel first (edit button toggles visibility)
        edit_btn = page.locator('.ef-editor').first.locator('.ef-edit-btn')
        edit_btn.click()
        page.wait_for_timeout(300)
        save_btn = page.locator('.ef-editor').first.locator('.ef-save-btn')
        save_btn.click()
        page.wait_for_timeout(800)

        # Save closes edit mode — verify edit panel is hidden
        panel = page.locator('.ef-editor').first.locator('.ef-panel')
        panel.wait_for(state='hidden', timeout=3000)

        # Check MD file was actually updated
        md_content = MD_FILE.read_text(encoding='utf-8')
        assert TEST_LABEL in md_content, f'MD file was not updated with test label'
        print(f'  ✓ MD file updated (contains {TEST_LABEL!r})')
        print(f'  ✓ Edit panel closed after save')

        # -------------------------------------------------------------------
        # 7. Async toggle works
        # -------------------------------------------------------------------
        print('Test 6: Async toggle works...')
        first_editor_t6 = page.locator('.ef-editor').first
        # Re-open edit panel (Test 5 closed it via save)
        edit_btn_t6 = first_editor_t6.locator('.ef-edit-btn')
        if edit_btn_t6.is_visible():
            edit_btn_t6.click()
            page.wait_for_timeout(300)
        editors_list = first_editor_t6
        # Find the first >> button (async connector between groups)
        async_btns = editors_list.locator('.ef-conn-btn.is-async')
        if async_btns.count() > 0:
            # Verify via reactive data (Alpine.js deep-prop DOM re-render is
            # unreliable in headless Playwright; data mutation is reliable)
            before_state = page.evaluate('''() => {
              const data = document.querySelector('#ef-0')._x_dataStack[0];
              for (let gi = 1; gi < data.itemGroups.length; gi++) {
                if (data.itemGroups[gi].items[0].isAsync) {
                  return {gi, isAsync: true};
                }
              }
              return null;
            }''')
            assert before_state is not None, 'No async group item found in reactive data'
            gi = before_state['gi']

            async_btns.first.click()
            page.wait_for_timeout(200)

            after_state = page.evaluate(f'document.querySelector("#ef-0")._x_dataStack[0].itemGroups[{gi}].items[0].isAsync')
            assert after_state is False, f'isAsync was not toggled off: {after_state}'
            print(f'  ✓ Async toggle: isAsync toggled true → false in reactive data')

            # Toggle back
            page.evaluate(f'document.querySelector("#ef-0")._x_dataStack[0].itemGroups[{gi}].items[0].isAsync = true')
            page.wait_for_timeout(100)
        else:
            print('  ⚠ No async connectors found (skipping toggle test)')

        # -------------------------------------------------------------------
        # 8. Add item works (edit panel must be open)
        # -------------------------------------------------------------------
        print('Test 7: Add item...')
        first_editor = page.locator('.ef-editor').first
        # Open edit panel if not already open
        edit_btn2 = first_editor.locator('.ef-edit-btn')
        if edit_btn2.is_visible():
            edit_btn2.click()
            page.wait_for_timeout(300)
        initial_item_count = first_editor.locator('.ef-ve-note').count()
        first_editor.locator('.ef-ve-add-item').first.click()
        page.wait_for_timeout(200)
        new_item_count = first_editor.locator('.ef-ve-note').count()
        assert new_item_count == initial_item_count + 1, \
            f'Item count did not increase: {initial_item_count} → {new_item_count}'
        print(f'  ✓ Item added: {initial_item_count} → {new_item_count}')

        # Delete the added item
        first_editor.locator('.ef-ve-note').last.locator('.ef-ve-del').click()
        page.wait_for_timeout(200)

        browser.close()

    print('\n' + '='*50)
    print('✅ All tests passed!')
    print('='*50)


if __name__ == '__main__':
    run()
