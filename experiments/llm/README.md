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
- Thinking is disabled on every call for bounded, comparable token budgets.

## Layout

```
config.mjs        knobs (host, models, patterns, QA list, temps, debate turns, event bans)
llmClient.mjs     vLLM OpenAI-compatible client (thinking off, token accumulator, JSON validation)
prompts.mjs       anti-confusion prompt builders (project, stakeholders, options+impacts, contracts)
table.mjs         WebSocket seats over the public API + awaitable game-state
agents.mjs        shared behaviours: proposal, deterministic fallback, vote tally, record, revise
runner.mjs        generic phase loop, delegates propose/decide to the pattern
patterns/*.mjs    baseline | role | voting | debate
energy_probe.py   pynvml read / baseline-power gate
metrics.mjs       energy read + results writer (per-game JSON + summary.csv)
orchestrator.mjs  plays ONE game (energy/time bracketed) and writes a result row
run_matrix.mjs    runs the whole pattern×repetition matrix for one model
analyze.mjs       mean ± std per (model × pattern)
serve_qwen.sh     launch the qwen vLLM serve (gated on :8000 being free)
```

## Running (on the Spark)

Prereqs: the DecidArch app and a vLLM serve both reachable on localhost; `pynvml` installed.

```bash
# 0) deploy
cd ~ && git clone https://github.com/Arihant25/decidarch.git   # first time
cd ~/decidarch && git checkout llm-experiment && git pull
npm install

# 1) start the game server (separate terminal / background)
npm run dev    # serves http://localhost:3000 and ws://localhost:3000/ws

# 2) gemma is already served on :8000 — run a single game to verify
node experiments/llm/orchestrator.mjs --model gemma --pattern debate --run-id 0

# 3) full gemma matrix
node experiments/llm/run_matrix.mjs --model gemma --runs 5

# 4) swap models (GATED — only when the GPU is free of other work):
#    stop the gemma vLLM serve, then:
bash experiments/llm/serve_qwen.sh        # or nohup ... &
node experiments/llm/orchestrator.mjs --model qwen --pattern debate --run-id 0   # verify
node experiments/llm/run_matrix.mjs --model qwen --runs 5

# 5) aggregate
node experiments/llm/analyze.mjs
```

Results land in `experiments/llm/results/` (`summary.csv` + one detailed `*.json` per game).

### Notes
- **Energy is whole-GPU** cumulative (`nvmlDeviceGetTotalEnergyConsumption`); the orchestrator
  records idle baseline power and warns (`GPU_BUSY_W`, default 80 W) if another workload appears
  to be active, since that would contaminate the measurement. Run measured games on an otherwise
  idle GPU.
- Env overrides: `GAME_HOST`, `VLLM_BASE_URL`, `GEMMA_MODEL`, `QWEN_MODEL`, `PYTHON`, `STEP_MS`.
