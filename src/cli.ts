#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { runHttpScenario } from './http.js';
import type { Scenario } from './types.js';

const HELP = `Idempotency Rehearsal 0.1.0

Prove duplicate, delayed, and reordered HTTP events produce one effect.

Usage:
  idempotency-rehearsal run <scenario.json> --target <url> [options]
  idempotency-rehearsal --help

Options:
  --target <url>       HTTP handler to receive synthetic deliveries (required)
  --timeout <ms>       Per-delivery timeout; default 10000, max 120000
  --header <name:value> Add a request header; repeatable. Never pass secrets.
  --json               Print a stable JSON report for CI
  --help               Show this help
  --version            Print the package version

Handler integration:
  Each request receives x-idempotency-key, x-rehearsal-event-id, and a
  loopback x-idempotency-rehearsal-effect-url. Wire effectClientFromRequest()
  into test-only payment/email adapters so effects are observed, not executed.

Exit codes:
  0  proof passed
  1  duplicate/missing effect or delivery failure
  2  invalid arguments or scenario
`;

interface Args {
  scenarioPath: string;
  target: string;
  timeoutMs: number;
  json: boolean;
  headers: Record<string, string>;
}

function parseArgs(argv: string[]): Args | 'help' | 'version' {
  if (argv.includes('--help') || argv.length === 0) return 'help';
  if (argv.includes('--version')) return 'version';
  if (argv[0] !== 'run' || !argv[1] || argv[1].startsWith('-')) throw new Error('Expected: run <scenario.json> --target <url>');
  const values: Args = { scenarioPath: argv[1], target: '', timeoutMs: 10_000, json: false, headers: {} };
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--json') values.json = true;
    else if (flag === '--target') values.target = argv[++index] ?? '';
    else if (flag === '--timeout') values.timeoutMs = Number(argv[++index]);
    else if (flag === '--header') {
      const header = argv[++index] ?? '';
      const separator = header.indexOf(':');
      if (separator < 1) throw new Error('--header must be in name:value form.');
      const name = header.slice(0, separator).trim().toLowerCase();
      if (/authorization|cookie|token|secret|api-key/.test(name)) throw new Error('Secret-bearing request headers are not allowed.');
      values.headers[name] = header.slice(separator + 1).trim();
    } else throw new Error(`Unknown option: ${flag}`);
  }
  if (!values.target) throw new Error('--target is required.');
  return values;
}

function prettyReport(report: Awaited<ReturnType<typeof runHttpScenario>>): string {
  const lines = [
    `${report.passed ? 'PASS' : 'FAIL'}  ${report.scenario}`,
    `      ${report.summary.deliveries} deliveries · ${report.summary.effects} effects · ${report.durationMs}ms`,
  ];
  for (const violation of report.violations) lines.push(`  × ${violation.message}`);
  if (report.passed) lines.push('  ✓ one logical effect per idempotency key');
  return lines.join('\n');
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args === 'help') {
      process.stdout.write(HELP);
      return;
    }
    if (args === 'version') {
      process.stdout.write('0.1.0\n');
      return;
    }
    const content = await readFile(args.scenarioPath, 'utf8');
    const scenario = JSON.parse(content) as Scenario;
    const report = await runHttpScenario({
      scenario,
      url: args.target,
      timeoutMs: args.timeoutMs,
      headers: args.headers,
    });
    process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : `${prettyReport(report)}\n`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`idempotency-rehearsal: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.stderr.write('Run with --help for usage.\n');
    process.exitCode = 2;
  }
}

void main();
