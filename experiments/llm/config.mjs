// ============================================================
// DecidArch LLM experiment — shared configuration
// ============================================================
// Central knobs for the study. Everything that the orchestrator,
// patterns and analysis share lives here so a single edit changes
// the whole matrix.

// DecidArch game server (the Next.js + WebSocket app). When the
// experiment runs on the Spark, this is localhost.
export const GAME_HOST = process.env.GAME_HOST || 'localhost:3000';

// vLLM OpenAI-compatible endpoint (also localhost on the Spark).
export const VLLM_BASE_URL = process.env.VLLM_BASE_URL || 'http://localhost:8000/v1';

// The two models under study, addressed by their served model id.
// gemma is studied first, then qwen (see README).
// Both models are NVIDIA NVFP4 (4-bit, Blackwell-native) checkpoints — small in
// the 121 GB unified pool and fast on this bandwidth-bound box. Both are MoE
// (small active footprint). NVFP4 is auto-detected by vLLM from the checkpoint.
//   gemma = NVFP4 of google/gemma-4-26B-A4B-it (multimodal; serve with --limit-mm-per-prompt)
//   qwen  = NVFP4 of a 122B-A10B MoE (10B active)
// (Why not bf16: dense 27B was bandwidth-bound ~5 tok/s; bf16 35B OOM'd the box.)
export const MODELS = {
  gemma: process.env.GEMMA_MODEL || 'nvidia/Gemma-4-26B-A4B-NVFP4',
  qwen: process.env.QWEN_MODEL || 'nvidia/Qwen3.5-122B-A10B-NVFP4',
};

// The four patterns from the Agent Design Pattern Catalogue
// (arXiv:2405.10467) that the study compares.
export const PATTERNS = ['baseline', 'role', 'voting', 'debate'];

// Classic mode is scored on exactly these five quality attributes.
// In the cooperation patterns one agent champions each — giving full,
// non-overlapping coverage of the decision criteria (see README).
export const QUALITY_ATTRIBUTES = [
  'Performance',
  'Security',
  'Availability',
  'Usability',
  'Maintainability',
];

// Sampling / generation settings. Thinking is disabled on every call
// so token budgets are bounded and comparable across patterns/models.
export const GEN = {
  enableThinking: false,
  tempAdvocacy: 0.7, // proposals, debate turns, votes — want diversity
  tempFacilitator: 0.3, // neutral synthesis / revision — want consistency
  // Generous safety rail (NOT a content limit): a normal concise answer is a few
  // hundred tokens and finishes well within this; the cap only stops pathological
  // multi-thousand-token rambles that otherwise make uncapped runs take days.
  // Prompts carry no word-count hints — only this hard ceiling.
  maxTokens: 2048,
  // Debate chat turns get a tighter cap: every turn is replayed into the next
  // agent's prompt, so unbounded turns overflow the context window. 512 tokens
  // (~380 words) is still a full multi-point argument.
  maxTokensDebateTurn: 512,
};

// Debate pattern: how many discussion turns each agent takes after the
// initial proposals (so total debate turns = DEBATE_TURNS * nAgents).
export const DEBATE_TURNS = 2;

// Pacing. The game has no human, so we keep waits tiny — just enough to
// let the server broadcast and (optionally) a spectator watch.
export const STEP_MS = Number(process.env.STEP_MS || 250);

// Banned-option rules, mirrored from src/lib/gameEngine.ts isOptionDisabled().
// Keyed by event id → option ids that become disallowed once that event is drawn.
export const EVENT_OPTION_BANS = {
  'event-fire': ['c1-opt3', 'c2-opt3', 'c3-opt3'],
  'event-data-protection': ['c3-opt2', 'c2-opt2'],
};
