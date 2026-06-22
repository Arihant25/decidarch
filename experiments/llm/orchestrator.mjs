// ============================================================
// DecidArch LLM experiment — orchestrator (one game)
// ============================================================
// Plays ONE full Classic game with a given model + pattern, brackets it
// with GPU energy/time probes, sums token usage from vLLM responses, and
// writes a result row. Everything reaches the game ONLY via its public
// WebSocket API.
//
// Usage:
//   node orchestrator.mjs --model gemma --pattern debate --run-id 1
//   node orchestrator.mjs --model Qwen/Qwen3.6-35B-A3B --pattern voting --run-id 3
//
// Env: GAME_HOST, VLLM_BASE_URL, PYTHON, GPU_BUSY_W (gate threshold, watts)

import net from 'node:net';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAME_HOST, MODELS } from './config.mjs';
import { createLLM } from './llmClient.mjs';
import { Table } from './table.mjs';
import { runGame } from './runner.mjs';
import { energyRead, baselinePower, writeResult, RESULTS_DIR } from './metrics.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString()}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const out = { version: 'classic' };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) out[a[i].slice(2)] = a[i + 1];
  }
  return out;
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (v) => { sock.destroy(); resolve(v); };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.setTimeout(1500, () => done(false));
  });
}

async function ensureServer() {
  const [host, portStr] = GAME_HOST.split(':');
  const port = Number(portStr) || 3000;
  if (await portOpen(host, port)) return;
  log(`No game server at ${GAME_HOST} — starting "npm run dev"…`);
  const child = spawn('npm', ['run', 'dev'], {
    cwd: PROJECT_ROOT, shell: true, stdio: 'ignore', detached: true,
    env: { ...process.env, PORT: String(port) },
  });
  child.unref();
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await sleep(1000);
    if (await portOpen(host, port)) { await sleep(2500); return; }
  }
  throw new Error(`Game server did not come up at ${GAME_HOST}`);
}

async function main() {
  const args = parseArgs();
  const pattern = args.pattern;
  const runId = args['run-id'] ?? '0';
  const modelId = MODELS[args.model] || args.model;
  if (!pattern || !modelId) {
    console.error('Usage: node orchestrator.mjs --model <gemma|qwen|id> --pattern <baseline|role|voting|debate> --run-id <n>');
    process.exit(2);
  }

  const patternMod = (await import(`./patterns/${pattern}.mjs`)).default;
  await ensureServer();

  // Exclusivity gate: record idle GPU power; warn if something else is busy.
  const base = baselinePower(3);
  const baseW = (base.avg_power_mw || 0) / 1000;
  const busyW = Number(process.env.GPU_BUSY_W || 80);
  if (baseW > busyW) log(`⚠️  baseline GPU power ${baseW.toFixed(1)} W > ${busyW} W — another workload may be running; energy will be contaminated.`);

  // Deterministic deal: every pattern/model in repetition k shares this seed,
  // so the concern/event order is identical across the cell (paired comparison).
  const seed = `${process.env.SEED_BASE || 'decidarch'}-${args.version}-run${runId}`;

  const llm = createLLM({ model: modelId, log });
  const table = new Table(patternMod.seatNames, { log, seed });
  await table.seatEveryone(args.version);
  log(`Room ${table.roomCode} | model=${modelId} | pattern=${pattern} | run=${runId} | seats=${patternMod.seatNames.join(',')}`);
  log(`Spectate: http://${GAME_HOST}/room/${table.roomCode}?spectate=1`);

  // ---- bracket the measured run ----
  const e0 = energyRead();
  const t0 = Date.now();

  let finalState;
  try {
    finalState = await runGame({ pattern: patternMod, table, llm, log });
  } finally {
    /* ensure we always close sockets */
  }

  const t1 = Date.now();
  const e1 = energyRead();
  table.closeAll();

  const energyJ = (e1.energy_mj - e0.energy_mj) / 1000;
  const wallS = (t1 - t0) / 1000;
  const score = finalState.score || {};

  const row = {
    timestamp: new Date().toISOString(),
    model: modelId,
    pattern,
    run_id: runId,
    seed,
    grade: score.grade ?? 'unknown',
    final_score: score.finalScore ?? null,
    lost: score.lost ?? null,
    energy_j: round(energyJ, 1),
    wall_s: round(wallS, 1),
    avg_power_w: round(wallS > 0 ? energyJ / wallS : 0, 1),
    input_tokens: llm.usage.promptTokens,
    output_tokens: llm.usage.completionTokens,
    llm_calls: llm.usage.calls,
    llm_failures: llm.usage.failures,
    n_agents: patternMod.champions ? Object.keys(patternMod.champions).length : 1,
    baseline_power_w: round(baseW, 1),
    concern_order: finalState.concernOrder?.join('|'),
    event_order: finalState.eventOrder?.join('|'),
    drawn_events: (finalState.drawnEventIndices || []).map((i) => finalState.eventOrder[i]).join('|'),
    qa_scores: score.qaScores,
    group_decisions: (finalState.groupDecisions || []).map((d) => ({ concern: d.concernTitle, option: d.optionName, optionId: d.optionId })),
  };

  const base2 = writeResult(row);

  // Full replication record: every LLM prompt+response in order, plus the
  // authoritative final game-state (complete chat transcript, all group
  // decisions, concern/event order, stakeholder overrides, score).
  const txDir = path.join(RESULTS_DIR, 'transcripts');
  fs.mkdirSync(txDir, { recursive: true });
  fs.writeFileSync(
    path.join(txDir, `${base2}.json`),
    JSON.stringify({ game: row, finalState, llm_calls: llm.transcript }, null, 2)
  );

  log(`\n✅ DONE — grade=${row.grade} score=${row.final_score} | energy=${row.energy_j} J | time=${row.wall_s} s | in=${row.input_tokens} out=${row.output_tokens} tok | calls=${row.llm_calls}`);
  log(`   saved results/${base2}.json + transcripts/${base2}.json (+ summary.csv)`);
  await sleep(200);
  process.exit(0);
}

const round = (x, n) => (x == null ? x : Number(x.toFixed(n)));

main().catch((e) => { log('FATAL:', e.stack || e.message); process.exit(1); });
