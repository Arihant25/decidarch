// ============================================================
// Pattern: Debate-based Cooperation
// ============================================================
// Paper mapping: Debate-based Cooperation. Five attribute champions
// propose, then argue across DEBATE_TURNS rounds of chat, defending or
// conceding, before a neutral facilitator synthesises the discussion
// into the recorded group decision. This is the most LLM-call-heavy
// pattern (proposals + N*5 debate turns + synthesis).

import { QUALITY_ATTRIBUTES, GEN, DEBATE_TURNS } from '../config.mjs';
import { championSystem, debateTurnUser } from '../prompts.mjs';
import { fileProposal, facilitatorChoose, recordGroupDecision } from '../agents.mjs';

const SEATS = QUALITY_ATTRIBUTES.slice();

export default {
  name: 'debate',
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
    const { llm, deck, table, log } = ctx;
    const proposals = ctx.scratch.proposals;
    const chat = [];
    for (let round = 0; round < DEBATE_TURNS; round++) {
      for (const seat of SEATS) {
        const content = debateTurnUser(deck, state, concern, proposals, chat, seat);
        const turn = await llm.text(
          [{ role: 'system', content: championSystem(seat) }, { role: 'user', content }],
          { temperature: GEN.tempAdvocacy, maxTokens: GEN.maxTokensDebate }
        );
        const text = turn.replace(/\s+/g, ' ').trim().slice(0, 400);
        chat.push({ name: seat, text });
        await table.chat(seat, text);
      }
    }
    const choice = await facilitatorChoose({ llm, deck, state, concern, proposals, chat });
    await recordGroupDecision({ table, host: SEATS[0], optionId: choice.optionId, rationale: choice.rationale, log, concern });
  },
};
