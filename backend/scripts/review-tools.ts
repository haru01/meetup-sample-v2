#!/usr/bin/env npx tsx
/** コードレビュー自動チェックツール - 静的解析を並列実行しJSON出力 */
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve, relative } from 'path';

// Types
// ============================================================================

interface Issue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface CheckResult {
  name: string;
  passed: boolean;
  issues: Issue[];
  summary: string;
  duration: number;
  details?: Record<string, unknown>;
}

interface ReviewReport {
  target: string;
  timestamp: string;
  results: CheckResult[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    totalIssues: number;
    criticalIssues: number;
  };
}

// Helpers
// ============================================================================

function runCommand(cmd: string, args: string[]): { stdout: string; success: boolean } {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, success: true };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    return { stdout: err.stdout || err.stderr || err.message || '', success: false };
  }
}

// Check Functions
// ============================================================================

async function checkDependencies(target: string): Promise<CheckResult> {
  const start = Date.now();
  const issues: Issue[] = [];

  const configPath = resolve(process.cwd(), '.dependency-cruiser.cjs');
  if (!existsSync(configPath)) {
    return {
      name: 'dependency-rules',
      passed: true,
      issues: [],
      summary: 'dependency-cruiser 設定ファイルが見つかりません（スキップ）',
      duration: Date.now() - start,
    };
  }

  const { stdout, success } = runCommand('npx', [
    'dependency-cruiser',
    '--config',
    configPath,
    '--output-type',
    'json',
    target,
  ]);

  try {
    const jsonStr = success ? stdout : (stdout.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const result = JSON.parse(jsonStr);

    for (const violation of result.summary?.violations || []) {
      issues.push({
        file: violation.from,
        rule: violation.rule?.name || 'unknown',
        message: `${violation.from} -> ${violation.to}: ${violation.rule?.comment || ''}`,
        severity: violation.rule?.severity === 'error' ? 'error' : 'warning',
      });
    }
  } catch {
    if (!success) {
      issues.push({
        file: target,
        rule: 'execution-error',
        message: stdout.slice(0, 200),
        severity: 'error',
      });
    }
  }

  return {
    name: 'dependency-rules',
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    summary: issues.length === 0 ? '依存関係ルール違反なし' : `${issues.length}件の違反`,
    duration: Date.now() - start,
  };
}

/**
 * 循環依存チェック (madge)
 */
async function checkCircularDeps(target: string): Promise<CheckResult> {
  const start = Date.now();
  const issues: Issue[] = [];

  const { stdout, success } = runCommand('npx', ['madge', '--circular', '--json', target]);

  if (!success && !stdout.startsWith('[')) {
    return {
      name: 'circular-dependencies',
      passed: false,
      issues: [
        { file: target, rule: 'execution-error', message: stdout.slice(0, 200), severity: 'error' },
      ],
      summary: 'madge 実行エラー',
      duration: Date.now() - start,
    };
  }

  try {
    const circularDeps: string[][] = JSON.parse(stdout);
    for (const cycle of circularDeps) {
      issues.push({
        file: cycle[0],
        rule: 'circular-dependency',
        message: `循環依存: ${cycle.join(' -> ')} -> ${cycle[0]}`,
        severity: 'error',
      });
    }
  } catch {
    // パース失敗
  }

  return {
    name: 'circular-dependencies',
    passed: issues.length === 0,
    issues,
    summary: issues.length === 0 ? '循環依存なし' : `${issues.length}件の循環依存`,
    duration: Date.now() - start,
  };
}

/**
 * 循環複雑度・コード品質チェック (ESLint)
 */
async function checkComplexity(target: string): Promise<CheckResult> {
  const start = Date.now();
  const issues: Issue[] = [];

  const { stdout } = runCommand('npx', ['eslint', target, '--format', 'json']);

  if (!stdout.trim()) {
    return {
      name: 'complexity',
      passed: true,
      issues: [],
      summary: 'ESLint チェックをパス',
      duration: Date.now() - start,
    };
  }

  try {
    const eslintResults = JSON.parse(stdout);
    const complexityRules = [
      'complexity',
      'max-lines-per-function',
      'max-lines',
      'max-depth',
      'max-params',
    ];

    for (const fileResult of eslintResults) {
      for (const msg of fileResult.messages) {
        if (complexityRules.includes(msg.ruleId || '')) {
          issues.push({
            file: relative(process.cwd(), fileResult.filePath),
            line: msg.line,
            column: msg.column,
            rule: msg.ruleId || 'unknown',
            message: msg.message,
            severity: msg.severity === 2 ? 'error' : 'warning',
          });
        }
      }
    }
  } catch {
    // パース失敗
  }

  return {
    name: 'complexity',
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    summary: issues.length === 0 ? '複雑度チェックをパス' : `${issues.length}件の複雑度警告`,
    duration: Date.now() - start,
  };
}

/**
 * 型チェック (TypeScript)
 */
async function checkTypes(): Promise<CheckResult> {
  const start = Date.now();
  const issues: Issue[] = [];

  const { stdout, success } = runCommand('npx', ['tsc', '--noEmit']);

  if (success) {
    return {
      name: 'type-check',
      passed: true,
      issues: [],
      summary: '型チェックをパス',
      duration: Date.now() - start,
    };
  }

  const errorRegex = /^(.+)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/;
  for (const line of stdout.split('\n')) {
    const match = line.match(errorRegex);
    if (match) {
      const [, file, lineNum, col, code, message] = match;
      issues.push({
        file: relative(process.cwd(), file),
        line: parseInt(lineNum, 10),
        column: parseInt(col, 10),
        rule: code,
        message,
        severity: 'error',
      });
    }
  }

  if (issues.length === 0) {
    return {
      name: 'type-check',
      passed: true,
      issues: [],
      summary: '対象範囲に型エラーなし',
      duration: Date.now() - start,
    };
  }

  return {
    name: 'type-check',
    passed: false,
    issues,
    summary: `${issues.length}件の型エラー`,
    duration: Date.now() - start,
  };
}

interface FileCoverageData {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

const COVERAGE_THRESHOLD = 80;

function calcPct(covered: number, total: number): number {
  return total > 0 ? Math.round((covered / total) * 1000) / 10 : 100;
}

/**
 * テストカバレッジチェック (Vitest)
 */
async function checkCoverage(target: string): Promise<CheckResult> {
  const start = Date.now();
  const issues: Issue[] = [];

  const { stdout } = runCommand('npx', ['vitest', 'run', '--coverage']);

  const passed = parseInt(stdout.match(/Tests\s+(\d+)\s+passed/)?.[1] || '0', 10);
  const failed = parseInt(stdout.match(/(\d+)\s+failed/)?.[1] || '0', 10);
  const total = passed + failed;

  if (failed > 0) {
    issues.push({
      file: 'tests',
      rule: 'test-failed',
      message: `${failed}件のテストが失敗`,
      severity: 'error',
    });
  }

  const coveragePath = resolve(process.cwd(), 'coverage/coverage-final.json');
  if (!existsSync(coveragePath)) {
    return {
      name: 'test-coverage',
      passed: failed === 0,
      issues,
      summary: total > 0 ? `テスト ${passed}/${total} パス（カバレッジデータなし）` : 'テストなし',
      duration: Date.now() - start,
    };
  }

  const coverageRaw: Record<string, FileCoverageData> = JSON.parse(
    readFileSync(coveragePath, 'utf-8')
  );

  let totalStmt = 0,
    coveredStmt = 0,
    totalFunc = 0,
    coveredFunc = 0,
    totalBranch = 0,
    coveredBranch = 0;

  for (const [filePath, data] of Object.entries(coverageRaw)) {
    const relPath = relative(process.cwd(), filePath);
    if (!relPath.startsWith(target.replace(/\/$/, '')) || !filePath.endsWith('.ts')) continue;

    const stmts = Object.values(data.s || {});
    const funcs = Object.values(data.f || {});
    const branches = Object.values(data.b || {}).flat();

    totalStmt += stmts.length;
    coveredStmt += stmts.filter((v) => v > 0).length;
    totalFunc += funcs.length;
    coveredFunc += funcs.filter((v) => v > 0).length;
    totalBranch += branches.length;
    coveredBranch += branches.filter((v) => v > 0).length;

    const linePct = calcPct(
      stmts.filter((v) => v > 0).length,
      stmts.length
    );
    const funcPct = calcPct(
      funcs.filter((v) => v > 0).length,
      funcs.length
    );
    const branchPct = calcPct(
      branches.filter((v) => v > 0).length,
      branches.length
    );
    const file = relative(process.cwd(), filePath);

    if (linePct < COVERAGE_THRESHOLD) {
      issues.push({ file, rule: 'coverage-lines', message: `行カバレッジ ${linePct}% < ${COVERAGE_THRESHOLD}%`, severity: 'warning' });
    }
    if (funcPct < COVERAGE_THRESHOLD) {
      issues.push({ file, rule: 'coverage-functions', message: `関数カバレッジ ${funcPct}% < ${COVERAGE_THRESHOLD}%`, severity: 'warning' });
    }
    if (branchPct < COVERAGE_THRESHOLD) {
      issues.push({ file, rule: 'coverage-branches', message: `分岐カバレッジ ${branchPct}% < ${COVERAGE_THRESHOLD}%`, severity: 'warning' });
    }
  }

  const overall = {
    lines: calcPct(coveredStmt, totalStmt),
    functions: calcPct(coveredFunc, totalFunc),
    branches: calcPct(coveredBranch, totalBranch),
  };

  return {
    name: 'test-coverage',
    passed: failed === 0,
    issues,
    summary: `テスト ${passed}/${total} パス | カバレッジ L:${overall.lines}% F:${overall.functions}% B:${overall.branches}%`,
    duration: Date.now() - start,
    details: { overall, threshold: COVERAGE_THRESHOLD },
  };
}

// ============================================================================
// Main
// ============================================================================

async function runAllChecks(target: string): Promise<ReviewReport> {
  const startTime = new Date();

  const results = await Promise.all([
    checkDependencies(target),
    checkCircularDeps(target),
    checkComplexity(target),
    checkTypes(),
    checkCoverage(target),
  ]);

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const criticalIssues = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === 'error').length,
    0
  );

  return {
    target,
    timestamp: startTime.toISOString(),
    results,
    summary: {
      totalChecks: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      totalIssues,
      criticalIssues,
    },
  };
}

function formatReport(report: ReviewReport, jsonOutput: boolean): string {
  if (jsonOutput) return JSON.stringify(report, null, 2);

  const { summary: s } = report;
  const lines: string[] = [];
  lines.push(`${'═'.repeat(60)}`);
  lines.push(`コードレビュー結果 | 対象: ${report.target}`);
  lines.push(`${'═'.repeat(60)}`);
  lines.push('');
  lines.push('## サマリー');
  lines.push(`| 項目 | 結果 |`);
  lines.push(`|------|------|`);
  lines.push(`| チェック | ${s.passed}/${s.totalChecks} パス |`);
  lines.push(`| Issue | ${s.totalIssues}件 (重大: ${s.criticalIssues}) |`);
  lines.push('');

  for (const r of report.results) {
    const icon = r.passed ? '✅' : '❌';
    lines.push(`### ${icon} ${r.name}`);
    lines.push(`- ${r.summary} (${r.duration}ms)`);
    if (r.issues.length > 0) {
      const issueLines = r.issues
        .slice(0, 5)
        .map(
          (i) =>
            `  - [${i.rule}] ${i.file}${i.line ? ':' + i.line : ''}: ${i.message.slice(0, 80)}`
        );
      if (r.issues.length > 5) issueLines.push(`  - ... 他 ${r.issues.length - 5}件`);
      lines.push(issueLines.join('\n'));
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const target = args.filter((a) => !a.startsWith('--'))[0] || 'src/';

  const report = await runAllChecks(target);
  console.log(formatReport(report, jsonOutput));

  if (report.summary.criticalIssues > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('実行エラー:', error);
  process.exit(1);
});
