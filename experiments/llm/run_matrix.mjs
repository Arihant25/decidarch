// ============================================================
// DecidArch LLM experiment — matrix runner (one model)
// ============================================================
// Runs every (pattern × repetition) for ONE model, sequentially, each
// game in a fresh orchestrator process so token accounting and sockets
// are fully isolated. Model swaps (gemma -> qwen) are done by hand
// between matrix runs (see serve_qwen.sh / README) because they touch
// the shared GPU.
//
// Usage:
//   node run_matrix.mjs --model gemma --runs 5
//   node run_matrix.mjs --model qwen  --runs 5 --patterns debate,voting

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATTERNS } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const model = arg('model');
const runs = Number(arg('runs', '5'));
const patterns = (arg('patterns', PATTERNS.join(','))).split(',').map((s) => s.trim()).filter(Boolean);

if (!model) {
  console.error('Usage: node run_matrix.mjs --model <gemma|qwen|id> --runs <n> [--patterns a,b]');
  process.exit(2);
}

function runOne(pattern, runId) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(HERE, 'orchestrator.mjs'), '--model', model, '--pattern', pattern, '--run-id', String(runId)],
      { stdio: 'inherit', env: process.env }
    );
    child.on('exit', (code) => resolve(code));
  });
}

(async () => {
  const t0 = Date.now();
  console.log(`\n=== MATRIX: model=${model} runs=${runs} patterns=${patterns.join(',')} ===\n`);
  for (let r = 1; r <= runs; r++) {
    for (const p of patterns) {
      console.log(`\n>>> ${model} | ${p} | run ${r}/${runs}`);
      const code = await runOne(p, r);
      if (code !== 0) console.error(`!!! ${model}/${p}/run${r} exited ${code} — continuing`);
    }
  }
  console.log(`\n=== MATRIX DONE in ${((Date.now() - t0) / 60000).toFixed(1)} min — see results/summary.csv ===`);
})();
