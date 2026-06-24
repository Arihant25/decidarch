# DecidArch × LLM multi-agent experiment

Local open models play **DecidArch (Classic mode)** under four multi-agent design
patterns from the *Agent Design Pattern Catalogue* (arXiv:2405.10467), measuring, per game:
**final score/grade, wall-clock time, GPU energy (Joules, via `pynvml`), and input/output tokens**
(counted separately from vLLM's `usage`).

Everything reaches the game **only through its public WebSocket API** (same protocol as
`demo/classic-demo.mjs` and `/docs`) — no game internals are modified.

## Patterns (independent variable)

| Pattern | Agents | How the group decision is made |
| --- | --- | --- |
| `baseline` | 1 (control) | One-shot single-agent query per concern (paper: One-Shot Querying + Single-Path). A 2nd seat only mirrors the choice so the game can advance. |
| `role` | 5 | One agent per quality attribute proposes; a neutral facilitator (coordinator) records the decision. |
| `voting` | 5 | Each champion proposes, then votes; **deterministic majority tally** (ties broken by stakeholder-weighted impact). |
| `debate` | 5 | Champions propose, then argue for `DEBATE_TURNS` rounds; a neutral facilitator synthesises and records. |

The **5 cooperating agents** each champion one of Classic's five scored quality attributes
(Performance, Security, Availability, Usability, Maintainability) — complete, non-overlapping
coverage of the decision criteria, held constant across `role`/`voting`/`debate` so the
*coordination mechanism* is the only variable. The host seat doubles as transport for the
**neutral facilitator** (no extra opinion).

## Study design

- Models, served on vLLM one at a time (DGX Spark, 121 GB unified): `gemma` =
  `nvidia/Gemma-4-26B-A4B-NVFP4` first, then `qwen` =
  `nvidia/Qwen3.5-122B-A10B-NVFP4`. Both are **NVFP4 4-bit** (Blackwell-native)
  MoE checkpoints — small active footprint + 4-bit weights keep decode fast on the
  bandwidth-bound Spark, and 4-bit lets even the 122B MoE fit the unified pool.
- 4 patterns × 2 models × **5 repetitions** = 40 games.
- Reproducible deals via seed: every pattern/model in repetition *k* receives the
  same concern/event order (paired comparison).
- Thinking is disabled on every call for bounded, comparable token budgets.

## Results (this repo)

The dataset from the paper run (June 2026, DGX Spark GB10) is committed under
`results/`. Full summary: `results/summary.csv`.

```
results/
  summary.csv                  mean/std aggregates produced by analyze.mjs
  gemma/                       20 per-game JSON records (Gemma-4-26B NVFP4)
  qwen/                        20 per-game JSON records (Qwen3.5-122B NVFP4)
  transcripts/
    gemma/                     20 full LLM transcripts (every prompt+response)
    qwen/                      20 full LLM transcripts
  logs/
    run_all.log                complete console log of the production run
    verify_gemma_debate.log    pre-matrix verification game (gemma debate run-0)
    verify_qwen_debate.log     pre-matrix verification game (qwen debate run-0)
```

Each per-game JSON contains: model, pattern, run_id, seed, grade, final_score,
energy_j, wall_s, input/output tokens, llm_calls, llm_failures, concern_order,
group_decisions, and qa_scores. Each transcript JSON contains the full ordered
list of every LLM call (prompt + raw response) plus the final game-state.

### Aggregate results (mean ± std, n=5)

| Model | Pattern | Score | Energy (J) | Time (s) | In tok | Out tok | Wins |
|---|---|---|---|---|---|---|---|
| Gemma-4-26B NVFP4 | baseline | 9.8 ± 1.2 | 8,590 ± 2,043 | 247 ± 58 | 7,860 | 6,838 | 0/5 |
| Gemma-4-26B NVFP4 | role | 11.6 ± 3.8 | 23,036 ± 982 | 653 ± 28 | 56,960 | 18,071 | 1/5 |
| Gemma-4-26B NVFP4 | voting | 11.0 ± 3.4 | 36,268 ± 3,223 | 1,018 ± 88 | 137,534 | 28,050 | 3/5 |
| Gemma-4-26B NVFP4 | debate | **13.4 ± 4.0** | 64,782 ± 2,747 | 1,790 ± 76 | 420,443 | 48,680 | 3/5 |
| Qwen3.5-122B NVFP4 | baseline | 10.8 ± 2.8 | 14,567 ± 5,100 | 405 ± 140 | 11,197 | 5,408 | 1/5 |
| Qwen3.5-122B NVFP4 | role | 11.0 ± 2.5 | 93,967 ± 21,521 | 2,613 ± 602 | 85,522 | 34,991 | 1/5 |
| Qwen3.5-122B NVFP4 | voting | 10.2 ± 2.6 | 138,545 ± 10,219 | 3,826 ± 280 | 184,818 | 50,848 | 1/5 |
| Qwen3.5-122B NVFP4 | debate | 10.6 ± 3.7 | 192,849 ± 6,139 | 5,213 ± 181 | 503,122 | 67,675 | 0/5 |

To re-derive these numbers: `node experiments/llm/analyze.mjs`

## Source layout

```
config.mjs        knobs (host, models, patterns, QA list, temps, debate turns, event bans)
llmClient.mjs     vLLM OpenAI-compatible client (thinking off, token accumulator, JSON validation)
prompts.mjs       anti-confusion prompt builders (project, stakeholders, options+impacts, contracts)
table.mjs         WebSocket seats over the public API + awaitable game-state
agents.mjs        shared behaviours: proposal, deterministic fallback, vote tally, record, revise
runner.mjs        generic phase loop, delegates propose/decide to the pattern
patterns/*.mjs    baseline | role | voting | debate
energy_probe.py   pynvml read / baseline-power gate
metrics.mjs       energy read + results writer (per-game JSON → results/<model>/ + summary.csv)
orchestrator.mjs  plays ONE game (energy/time bracketed) and writes a result row
run_matrix.mjs    runs the whole pattern×repetition matrix for one model
analyze.mjs       mean ± std per (model × pattern)
serve_qwen.sh     launch the qwen vLLM serve (gated on :8000 being free)
```

## Replication (on the Spark)

Prereqs: the DecidArch app and a vLLM serve both reachable on localhost; `pynvml` installed.

```bash
# 0) deploy
cd ~ && git clone https://github.com/Arihant25/decidarch.git   # first time
cd ~/decidarch && git checkout llm-experiment && git pull
npm install

# 1) start the game server (separate terminal / background)
PORT=3100 npm run dev    # log: ~/decidarch_3100.log

# 2) serve gemma NVFP4, verify, then run the full matrix
export PATH=$HOME/.venv/bin:$PATH
~/.venv/bin/vllm serve nvidia/Gemma-4-26B-A4B-NVFP4 --port 8000 --host 0.0.0.0 \
  --gpu-memory-utilization 0.85 --max-model-len 16384 --max-num-batched-tokens 4096 \
  --limit-mm-per-prompt '{"image":0,"video":0}'
# verify:
GAME_HOST=localhost:3100 node experiments/llm/orchestrator.mjs --model gemma --pattern debate --run-id 0
# full matrix:
GAME_HOST=localhost:3100 node experiments/llm/run_matrix.mjs --model gemma --runs 5

# 3) swap to qwen (pkill gemma serve first, wait for :8000 to close)
bash experiments/llm/serve_qwen.sh
GAME_HOST=localhost:3100 node experiments/llm/orchestrator.mjs --model qwen --pattern debate --run-id 0
GAME_HOST=localhost:3100 node experiments/llm/run_matrix.mjs --model qwen --runs 5

# 4) aggregate
node experiments/llm/analyze.mjs
```

Results land in `experiments/llm/results/<model>/` (per-game JSON) and
`experiments/llm/results/transcripts/<model>/` (full LLM transcripts), with
`experiments/llm/results/summary.csv` updated after every game.

### Notes
- **Energy is whole-GPU** cumulative (`nvmlDeviceGetTotalEnergyConsumption`); the orchestrator
  records idle baseline power and warns (`GPU_BUSY_W`, default 80 W) if another workload appears
  to be active, since that would contaminate the measurement. Run measured games on an otherwise
  idle GPU.
- **Only one model fits in unified memory at a time** — swap by killing the current vLLM serve,
  waiting for `:8000` to close and memory to free (`free -g`), then starting the next.
- Env overrides: `GAME_HOST`, `VLLM_BASE_URL`, `GEMMA_MODEL`, `QWEN_MODEL`, `PYTHON`, `STEP_MS`.
