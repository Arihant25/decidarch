// ============================================================
// Pattern: Single-Agent Baseline (control)
// ============================================================
// Paper mapping: One-Shot Model Querying + Single-Path Plan Generator.
// One model brain decides each concern in a single query; there is no
// debate, voting or multi-perspective input. DecidArch needs >=2 seats,
// so a second seat mirrors the brain's choice purely to advance phases.

import { fileProposal, recordGroupDecision } from '../agents.mjs';

const SEATS = ['Architect', 'Architect-2'];

export default {
  name: 'baseline',
  seatNames: SEATS,
  host: SEATS[0],
  champions: null,

  async propose(ctx, state, concern) {
    const decision = await fileProposal({
      ...ctx, state, concern, seatName: SEATS[0], persona: 'baseline', announce: false,
    });
    ctx.scratch.decision = decision;
    // Second seat mirrors the single brain's one-shot choice (phase plumbing only).
    ctx.table.send(SEATS[1], 'submit-decision', { optionId: decision.optionId, rationale: decision.rationale });
  },

  async decide(ctx, state, concern) {
    const d = ctx.scratch.decision;
    await recordGroupDecision({ table: ctx.table, host: SEATS[0], optionId: d.optionId, rationale: d.rationale, log: ctx.log, concern });
  },
};
