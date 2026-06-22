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
export const MODELS = {
  gemma: process.env.GEMMA_MODEL || 'google/gemma-4-26B-A4B-it',
  qwen: process.env.QWEN_MODEL || 'Qwen/Qwen3.6-27B',
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
  // Caps are generous safety nets, not content limits: the prompts ask for
  // concise answers, so normal responses finish well inside these and are
  // never cut mid-sentence. They only guard against pathological runaways.
  maxTokensProposal: 512,
  maxTokensVote: 256,
  maxTokensDebate: 512,
  maxTokensSynthesis: 640,
  maxTokensRevision: 512,
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
