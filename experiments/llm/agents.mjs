// ============================================================
// DecidArch LLM experiment — shared agent behaviours
// ============================================================
// Helpers the four patterns reuse: filing a proposal, the deterministic
// fallback / tie-break, recording the group decision, and the neutral
// facilitator revision after a banning event. All actions go through the
// public WebSocket API on the Table.

import { GEN, STEP_MS } from './config.mjs';
import {
  championSystem, facilitatorSystem, baselineSystem,
  proposalUser, synthesisUser, revisionUser, optName, bannedOptionIds,
} from './prompts.mjs';

const IMPACT_VALUES = { '--': -2, '-': -1, '=': 0, '+': 1, '++': 2 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Current concern card for a state. */
export function currentConcern(deck, state) {
  const id = state.concernOrder[state.currentConcernIndex];
  return deck.concerns.find((c) => c.id === id) || null;
}

/** Per-attribute running score from the decisions locked in so far. */
export function runningQA(deck, state) {
  const totals = {};
  for (const d of state.groupDecisions || []) {
    const c = deck.concerns.find((cc) => cc.id === d.concernId);
    const opt = c?.designOptions.find((o) => o.id === d.optionId);
    if (!opt) continue;
    for (const [attr, imp] of Object.entries(opt.impacts)) {
      totals[attr] = (totals[attr] || 0) + (IMPACT_VALUES[imp] || 0);
    }
  }
  return totals;
}

/**
 * Deterministic "good" option among legal ids: maximise stakeholder-weighted
 * impact, with a heavy penalty for driving any attribute negative right now.
 * Used as the fallback when a model fails to emit a valid option, and as the
 * voting tie-break.
 */
export function bestOptionDeterministic(deck, state, concern, legalOptionIds) {
  const running = runningQA(deck, state);
  const weight = {};
  for (const s of deck.stakeholders) {
    const ov = state.stakeholderPriorityOverrides?.[s.id] || {};
    for (const p of s.priorities) weight[p.attribute] = (weight[p.attribute] || 0) + (ov[p.attribute] ?? p.importance);
  }
  let best = legalOptionIds[0];
  let bestScore = -Infinity;
  for (const id of legalOptionIds) {
    const opt = concern.designOptions.find((o) => o.id === id);
    if (!opt) continue;
    let score = 0;
    for (const [attr, imp] of Object.entries(opt.impacts)) {
      const v = IMPACT_VALUES[imp] || 0;
      score += v * (1 + (weight[attr] || 0));
      if ((running[attr] || 0) + v < 0) score -= 100; // never go negative
    }
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/** Build the chat-completions message array. */
const msgs = (system, user) => [{ role: 'system', content: system }, { role: 'user', content: user }];

/**
 * One agent files a private proposal via submit-decision. `persona` is a QA
 * name (champion) or 'baseline'. Returns {name, qa, optionId, rationale}.
 */
export async function fileProposal({ table, llm, deck, state, concern, seatName, persona, log, announce = true }) {
  const system = persona === 'baseline' ? baselineSystem() : championSystem(persona);
  const { legalOptionIds, content } = proposalUser(deck, state, concern, persona);
  const choice =
    (await llm.chooseOption(msgs(system, content), legalOptionIds, {
      temperature: persona === 'baseline' ? GEN.tempFacilitator : GEN.tempAdvocacy,
      maxTokens: GEN.maxTokensProposal,
    })) || { optionId: bestOptionDeterministic(deck, state, concern, legalOptionIds), rationale: '(fallback) safest balanced option' };

  table.send(seatName, 'submit-decision', { optionId: choice.optionId, rationale: choice.rationale });
  log(`  ✍️  ${seatName}${persona !== 'baseline' ? ` [${persona}]` : ''} → "${optName(concern, choice.optionId)}"`);
  if (announce) await table.chat(seatName, `${persona !== 'baseline' ? persona + ': ' : ''}proposing ${optName(concern, choice.optionId)}.`);
  return { name: seatName, qa: persona, optionId: choice.optionId, rationale: choice.rationale };
}

/** Neutral facilitator picks the group option (LLM, deterministic fallback). */
export async function facilitatorChoose({ llm, deck, state, concern, proposals, chat = [] }) {
  const { legalOptionIds, content } = synthesisUser(deck, state, concern, proposals, chat);
  const choice = await llm.chooseOption(msgs(facilitatorSystem(), content), legalOptionIds, {
    temperature: GEN.tempFacilitator,
    maxTokens: GEN.maxTokensSynthesis,
  });
  return choice || { optionId: bestOptionDeterministic(deck, state, concern, legalOptionIds), rationale: '(fallback) best balanced option for all stakeholders' };
}

/** Host records the group decision over the API (with a watchable draft). */
export async function recordGroupDecision({ table, host, optionId, rationale, log, concern }) {
  table.send(host, 'select-group-option', { optionId });
  table.send(host, 'update-group-draft', { rationale });
  await sleep(STEP_MS);
  table.send(host, 'submit-group-decision', { optionId, rationale });
  log(`  ✅ group decision: "${optName(concern, optionId)}"`);
}

/** Tally votes → {winner, counts}. Ties broken by the deterministic heuristic. */
export function tallyVotes(votes, deck, state, concern, legalOptionIds) {
  const counts = {};
  for (const v of votes) counts[v.optionId] = (counts[v.optionId] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  const winner = top.length === 1 ? top[0] : bestOptionDeterministic(deck, state, concern, top.length ? top : legalOptionIds);
  return { winner, counts };
}

/**
 * Neutral facilitator revision after a banning event: for every locked-in
 * decision whose option is now illegal, pick the best legal replacement and
 * revise it via the API. Shared by all patterns.
 */
export async function reviseBanned({ table, host, llm, deck, state, log }) {
  const banned = bannedOptionIds(state);
  const event = deck.events.find((e) => e.id === state.activeEventId);
  let revised = 0;
  for (const d of state.groupDecisions || []) {
    if (!banned.has(d.optionId)) continue;
    const concern = deck.concerns.find((c) => c.id === d.concernId);
    if (!concern) continue;
    const legal = concern.designOptions.map((o) => o.id).filter((id) => !banned.has(id));
    const { content } = revisionUser(deck, state, concern, d.optionName, legal, event?.title || 'event');
    const choice =
      (await llm.chooseOption(msgs(facilitatorSystem(), content), legal, {
        temperature: GEN.tempFacilitator,
        maxTokens: GEN.maxTokensRevision,
      })) || { optionId: bestOptionDeterministic(deck, state, concern, legal), rationale: '(fallback) best legal replacement' };
    table.send(host, 'revise-decision', { concernId: d.concernId, optionId: choice.optionId, rationale: choice.rationale });
    log(`  🔧 revised "${concern.title}" → "${optName(concern, choice.optionId)}" (was banned)`);
    revised++;
    await sleep(STEP_MS);
  }
  if (!revised) log('  (no locked-in decision was banned by the event)');
}
