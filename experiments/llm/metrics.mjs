// ============================================================
// DecidArch LLM experiment — metrics helpers
// ============================================================
// Reads GPU energy via energy_probe.py and writes one result row per
// game (detailed JSONL) plus an appended flat summary.csv.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, 'energy_probe.py');
export const RESULTS_DIR = path.join(HERE, 'results');

const PYTHON = process.env.PYTHON || 'python3';

/** Run energy_probe.py and parse its single JSON line. */
function probe(args) {
  const r = spawnSync(PYTHON, [PROBE, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`energy_probe ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

export const energyRead = () => probe(['read']);
export const baselinePower = (secs = 3) => probe(['baseline', '--secs', String(secs)]);

const CSV_COLUMNS = [
  'timestamp', 'model', 'pattern', 'run_id', 'seed', 'grade', 'final_score', 'lost',
  'energy_j', 'wall_s', 'avg_power_w', 'input_tokens', 'output_tokens',
  'llm_calls', 'llm_failures', 'n_agents', 'baseline_power_w', 'concern_order',
];

export function writeResult(row) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Detailed per-game record.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${row.model.replace(/[\/]/g, '_')}__${row.pattern}__run${row.run_id}__${stamp}`;
  fs.writeFileSync(path.join(RESULTS_DIR, `${base}.json`), JSON.stringify(row, null, 2));

  // Flat summary row.
  const csvPath = path.join(RESULTS_DIR, 'summary.csv');
  if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, CSV_COLUMNS.join(',') + '\n');
  const line = CSV_COLUMNS.map((c) => csvField(row[c])).join(',') + '\n';
  fs.appendFileSync(csvPath, line);
  return base;
}

function csvField(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
