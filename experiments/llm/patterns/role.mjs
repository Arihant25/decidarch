// ============================================================
// Pattern: Role-based Cooperation
// ============================================================
// Paper mapping: Role-based Cooperation. Five agents each champion ONE
// quality attribute and file a proposal from that lens; a neutral
// facilitator (the coordinator role) weighs them and records the group
// decision. No back-and-forth debate — roles propose, coordinator decides.

import { QUALITY_ATTRIBUTES } from '../config.mjs';
import { fileProposal, facilitatorChoose, recordGroupDecision } from '../agents.mjs';

const SEATS = QUALITY_ATTRIBUTES.slice(); // seat name == championed attribute

export default {
  name: 'role',
  seatNames: SEATS,
  host: SEATS[0],
  champions: Object.fromEntries(SEATS.map((s) => [s, s])),

  async propose(ctx, state, concern) {
    ctx.scratch.proposals = [];
    for (const seat of SEATS) {
      const p = await fileProposal({ ...ctx, state, concern, seatName: seat, persona: seat });
      ctx.scratch.proposals.push(p);
    }
  },

  async decide(ctx, state, concern) {
    const choice = await facilitatorChoose({ llm: ctx.llm, deck: ctx.deck, state, concern, proposals: ctx.scratch.proposals });
    await recordGroupDecision({ table: ctx.table, host: SEATS[0], optionId: choice.optionId, rationale: choice.rationale, log: ctx.log, concern });
  },
};
