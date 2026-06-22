// ============================================================
// DecidArch LLM experiment — aggregate results
// ============================================================
// Reads results/summary.csv and prints mean ± std per (model × pattern)
// for the headline metrics. Pure stdlib; no dependencies.
//
// Usage: node analyze.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(HERE, 'results', 'summary.csv');

if (!fs.existsSync(csvPath)) {
  console.error('No results/summary.csv yet — run some games first.');
  process.exit(1);
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const groups = new Map();
for (const r of rows) {
  const key = `${r.model}::${r.pattern}`;
  (groups.get(key) || groups.set(key, []).get(key)).push(r);
}

const METRICS = [
  ['final_score', 'score'],
  ['energy_j', 'energy J'],
  ['wall_s', 'time s'],
  ['input_tokens', 'in tok'],
  ['output_tokens', 'out tok'],
  ['llm_calls', 'calls'],
];

const header = ['model', 'pattern', 'n', ...METRICS.map(([, label]) => label), 'wins'];
const lines = [header.join('\t')];

for (const [key, rs] of [...groups.entries()].sort()) {
  const [model, pattern] = key.split('::');
  const cells = METRICS.map(([col]) => {
    const xs = rs.map((r) => Number(r[col])).filter((x) => Number.isFinite(x));
    return xs.length ? `${mean(xs).toFixed(1)}±${std(xs).toFixed(1)}` : '-';
  });
  const wins = rs.filter((r) => r.lost === 'false' || r.lost === '' && Number(r.final_score) >= 0).length;
  lines.push([model, pattern, rs.length, ...cells, `${wins}/${rs.length}`].join('\t'));
}

console.log('\n' + lines.join('\n') + '\n');

// ---- helpers ----
function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function std(xs) { const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); }

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const cols = splitCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const vals = splitCsvLine(l);
    return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
