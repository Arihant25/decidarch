// ============================================================
// DecidArch LLM experiment — prompt builders
// ============================================================
// Every prompt is assembled from the LIVE deck (via get-card-data)
// and the current game-state, so the model never has to guess or
// assume anything. Each prompt spells out: the project + stakeholders,
// the exact concern with all options and their per-attribute impacts,
// the prior decisions made so far, the rules of the current phase, the
// agent's role, and a strict output contract listing the legal ids.

import { QUALITY_ATTRIBUTES, EVENT_OPTION_BANS } from './config.mjs';

// ---- shared game rules, stated plainly so models don't assume ----
const RULES = `HOW DECIDARCH (CLASSIC) IS SCORED — read carefully:
- The team makes ONE group decision per concern by choosing exactly one design option.
- Each option changes quality attributes by -- (=-2), - (=-1), = (0), + (+1) or ++ (+2).
- After all concerns, each attribute's score = (sum of pluses) - (sum of minuses) across the chosen options.
- IF ANY attribute's total score is negative, THE TEAM LOSES outright. Never let an attribute go below zero.
- Each stakeholder has priority numbers per attribute; an attribute's score must be >= every stakeholder's priority for it, or the team loses.
- Final score = sum over stakeholders of (attribute score - that stakeholder's priority), summed over their prioritised attributes. Higher is better.
- So: protect against negatives first, then exceed stakeholder priorities by as much as possible.`;

/** Bullet list of stakeholders and their effective (override-aware) priorities. */
function stakeholdersBlock(deck, state) {
  const overrides = state.stakeholderPriorityOverrides || {};
  return deck.stakeholders
    .map((s) => {
      const o = overrides[s.id] || {};
      const prios = s.priorities
        .map((p) => `${p.attribute} ${o[p.attribute] ?? p.importance}`)
        .join(', ');
      return `- ${s.name} (${s.role}): cares about ${prios}.`;
    })
    .join('\n');
}

/** Running summary of the design so far (decisions already locked in). */
function historyBlock(deck, state) {
  if (!state.groupDecisions?.length) return 'No decisions locked in yet (this is the first concern).';
  return state.groupDecisions
    .map((d, i) => {
      const c = deck.concerns.find((cc) => cc.id === d.concernId);
      const opt = c?.designOptions.find((o) => o.id === d.optionId);
      const impacts = opt ? impactStr(opt) : '';
      return `${i + 1}. ${d.concernTitle} → ${d.optionName} [${impacts}]`;
    })
    .join('\n');
}

/** Compact "Performance +, Security --" style impact string for one option. */
function impactStr(opt) {
  return QUALITY_ATTRIBUTES.filter((a) => opt.impacts[a] && opt.impacts[a] !== '=')
    .map((a) => `${a} ${opt.impacts[a]}`)
    .join(', ') || 'no net impact';
}

/** Which option ids are currently banned by events already drawn. */
export function bannedOptionIds(state) {
  const drawn = (state.drawnEventIndices || []).map((i) => state.eventOrder[i]);
  const banned = new Set();
  for (const ev of drawn) for (const id of EVENT_OPTION_BANS[ev] || []) banned.add(id);
  return banned;
}

/** The concern card with every (still-legal) option and its impacts. Returns
 *  { text, legalOptionIds } so callers reuse the exact id list for validation. */
export function concernBlock(concern, state) {
  const banned = bannedOptionIds(state);
  const legal = [];
  const lines = concern.designOptions.map((o) => {
    const isBanned = banned.has(o.id);
    if (!isBanned) legal.push(o.id);
    const tag = isBanned ? '  [BANNED by an event — DO NOT choose]' : '';
    return `  - id "${o.id}" — ${o.name}: ${o.description} | impacts: ${impactStr(o)}${tag}`;
  });
  const text = `CONCERN: ${concern.title}\n${concern.description}\nOPTIONS:\n${lines.join('\n')}`;
  return { text, legalOptionIds: legal };
}

/** Full shared context every agent sees. */
export function contextBlock(deck, state) {
  return [
    `PROJECT: ${deck.project.title} — ${deck.project.description}`,
    deck.project.context ? `CONTEXT: ${deck.project.context}` : '',
    `STAKEHOLDERS AND THEIR PRIORITY NUMBERS (higher = matters more):\n${stakeholdersBlock(deck, state)}`,
    `DECISIONS LOCKED IN SO FAR:\n${historyBlock(deck, state)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------- System prompts (persona definitions) ----------------

export function championSystem(qa) {
  return `You are a senior software architect on a team playing DecidArch (Classic mode). You are the ${qa.toUpperCase()} CHAMPION: your job is to push for choices that protect and improve ${qa}. Argue honestly from that lens, but you understand the whole team must avoid ANY attribute going negative and must satisfy every stakeholder — so you may concede when another attribute is at risk. Be concise and specific about impact numbers.\n\n${RULES}`;
}

export function facilitatorSystem() {
  return `You are the NEUTRAL FACILITATOR for a team playing DecidArch (Classic mode). You do NOT champion any single attribute. Your job is to pick the option that is best for the WHOLE design and for ALL stakeholders: first guarantee no attribute can end up negative, then maximise how far the team exceeds stakeholder priorities. Weigh the champions' arguments impartially.\n\n${RULES}`;
}

export function baselineSystem() {
  return `You are a single expert software architect playing DecidArch (Classic mode) on your own. For each concern you must choose the one option that is best for the whole design and all stakeholders: first guarantee no quality attribute can end up negative, then maximise how far the team exceeds stakeholder priorities.\n\n${RULES}`;
}

// ---------------- User prompts (per phase) ----------------

const OPTION_CONTRACT = (legal) =>
  `Respond with ONLY a JSON object, no other text:\n{"optionId":"<one of: ${legal.join(', ')}>","rationale":"<<=80 words explaining the choice in terms of impacts and stakeholders>"}`;

export function proposalUser(deck, state, concern, persona) {
  const cb = concernBlock(concern, state);
  const lens =
    persona === 'baseline'
      ? `Choose the single best option for the whole team.`
      : `You are the ${persona} champion — favour ${persona}, but do not cause a loss for the team.`;
  return {
    legalOptionIds: cb.legalOptionIds,
    content: `${contextBlock(deck, state)}\n\n${cb.text}\n\nPHASE: PRIVATE PROPOSAL. ${lens}\n${OPTION_CONTRACT(cb.legalOptionIds)}`,
  };
}

export function debateTurnUser(deck, state, concern, proposals, chatSoFar, qa) {
  const cb = concernBlock(concern, state);
  const props = proposals
    .map((p) => `- ${p.name} (${p.qa}) proposed "${optName(concern, p.optionId)}": ${p.rationale}`)
    .join('\n');
  const chat = chatSoFar.length ? chatSoFar.map((c) => `${c.name}: ${c.text}`).join('\n') : '(no discussion yet)';
  return `${contextBlock(deck, state)}\n\n${cb.text}\n\nThe team's private proposals were:\n${props}\n\nDiscussion so far:\n${chat}\n\nPHASE: GROUP DISCUSSION. You champion ${qa}. In <=70 words, react to the others, defend or concede, and move the team toward one option. Plain text only — do NOT output JSON.`;
}

export function voteUser(deck, state, concern, proposals, qa) {
  const cb = concernBlock(concern, state);
  const props = proposals
    .map((p) => `- ${p.name} (${p.qa}) → "${optName(concern, p.optionId)}" (id ${p.optionId}): ${p.rationale}`)
    .join('\n');
  return {
    legalOptionIds: cb.legalOptionIds,
    content: `${contextBlock(deck, state)}\n\n${cb.text}\n\nThe proposals on the table:\n${props}\n\nPHASE: VOTE. You champion ${qa}. Vote for the ONE option you believe the team should adopt (you may vote for someone else's proposal if it is better overall).\nRespond with ONLY JSON:\n{"optionId":"<one of: ${cb.legalOptionIds.join(', ')}>","rationale":"<<=40 words why>"}`,
  };
}

export function synthesisUser(deck, state, concern, proposals, chatSoFar) {
  const cb = concernBlock(concern, state);
  const props = proposals
    .map((p) => `- ${p.name} (${p.qa}) → "${optName(concern, p.optionId)}" (id ${p.optionId}): ${p.rationale}`)
    .join('\n');
  const chat = chatSoFar?.length ? `\n\nDiscussion:\n${chatSoFar.map((c) => `${c.name}: ${c.text}`).join('\n')}` : '';
  return {
    legalOptionIds: cb.legalOptionIds,
    content: `${contextBlock(deck, state)}\n\n${cb.text}\n\nThe team proposed:\n${props}${chat}\n\nPHASE: RECORD THE GROUP DECISION. As the neutral facilitator, choose the single option that is best for the whole team and all stakeholders (avoid any negative attribute first).\n${OPTION_CONTRACT(cb.legalOptionIds)}`,
  };
}

export function revisionUser(deck, state, concern, oldOptionName, legalOptionIds, eventTitle) {
  const cb = concernBlock(concern, state);
  return {
    legalOptionIds,
    content: `${contextBlock(deck, state)}\n\n${cb.text}\n\nPHASE: FORCED REVISION. The event "${eventTitle}" has BANNED the option "${oldOptionName}" that the team previously chose for "${concern.title}". Pick the best STILL-LEGAL replacement option for this concern.\n${OPTION_CONTRACT(legalOptionIds)}`,
  };
}

export function optName(concern, optionId) {
  return concern?.designOptions.find((o) => o.id === optionId)?.name || optionId;
}
