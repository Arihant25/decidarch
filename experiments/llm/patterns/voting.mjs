// ============================================================
// Pattern: Voting-based Cooperation
// ============================================================
// Paper mapping: Voting-based Cooperation. Five attribute champions each
// propose, then each casts a vote over the legal options; the winner is
// chosen by a DETERMINISTIC majority tally (ties broken by stakeholder-
// weighted impact). The host records the winner — no single agent decides.

import { QUALITY_ATTRIBUTES, GEN } from '../config.mjs';
import { championSystem, voteUser, optName } from '../prompts.mjs';
import { fileProposal, tallyVotes, recordGroupDecision } from '../agents.mjs';

const SEATS = QUALITY_ATTRIBUTES.slice();
const msgs = (system, user) => [{ role: 'system', content: system }, { role: 'user', content: user }];

export default {
  name: 'voting',
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
    const votes = [];
    for (const seat of SEATS) {
      const { legalOptionIds, content } = voteUser(deck, state, concern, proposals, seat);
      const v =
        (await llm.chooseOption(msgs(championSystem(seat), content), legalOptionIds, {
          temperature: GEN.tempAdvocacy,
          label: `vote:${seat}:${concern.id}`,
        })) || { optionId: proposals.find((p) => p.qa === seat)?.optionId || legalOptionIds[0], rationale: '(fallback) own proposal' };
      votes.push({ seat, optionId: v.optionId, rationale: v.rationale });
      await table.chat(seat, `${seat} votes ${optName(concern, v.optionId)}.`);
    }
    const legal = concern.designOptions.map((o) => o.id);
    const { winner, counts } = tallyVotes(votes, deck, state, concern, legal);
    const winReasons = votes.filter((v) => v.optionId === winner).map((v) => v.rationale).join(' ');
    const rationale = `Group vote: "${optName(concern, winner)}" won ${counts[winner]}/${votes.length}. ${winReasons}`.slice(0, 300);
    log(`  🗳️  tally: ${JSON.stringify(counts)} → winner ${optName(concern, winner)}`);
    await recordGroupDecision({ table, host: SEATS[0], optionId: winner, rationale, log, concern });
  },
};
