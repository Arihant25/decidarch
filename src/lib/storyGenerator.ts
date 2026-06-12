// ============================================================
// DecidArch — Project Story Generator (Classic Mode)
// ============================================================
//
// Builds a narrative retrospective of the project from the game
// log, fully deterministically: the same finished GameState always
// produces the same story on every client. All "random" choices
// (codename, company, sentence templates) come from a PRNG seeded
// with roomCode + startedAt, which are part of the shared state.

import { GameState, GroupDecision } from './types';
import { CARD_DATA } from './cardData';
import { calculateScores } from './scoring';

// --------------- Seeded PRNG ---------------

/** FNV-1a string hash → 32-bit seed */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 — tiny deterministic PRNG */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// --------------- Flavour data ---------------

const CODENAMES = [
  'Apricot', 'Bluejay', 'Caldera', 'Dynamo', 'Ember', 'Foxglove',
  'Glacier', 'Halcyon', 'Ironwood', 'Juniper', 'Kestrel', 'Lighthouse',
  'Nimbus', 'Omnibus', 'Quasar', 'Redwood', 'Saffron', 'Tundra',
  'Umbra', 'Vortex', 'Wavelength', 'Xenon', 'Yarrow', 'Zephyr',
] as const;

const COMPANIES = [
  'Acme Incorporated', 'Northbridge Media Group', 'Meridian Digital',
  'Bluepeak Labs', 'Harbourline Media', 'Vextel Systems',
  'Brightside Media Co.', 'Atlas Newsworks', 'Pendleton & Park',
  'Cobble & Quill Media',
] as const;

const CHOICE_TEMPLATES = [
  (opt: string) => `so the architects chose ${opt}`,
  (opt: string) => `so the team went with ${opt}`,
  (opt: string) => `and after some debate, the architects settled on ${opt}`,
  (opt: string) => `so the team opted for ${opt}`,
  (opt: string) => `and the architects decided on ${opt}`,
  (opt: string) => `and the team landed on ${opt}`,
  (opt: string) => `so they committed to ${opt}`,
  (opt: string) => `and with little hesitation, they picked ${opt}`,
  (opt: string) => `and eventually the team converged on ${opt}`,
  (opt: string) => `so the decision was made to go with ${opt}`,
  (opt: string) => `and after weighing the options, they chose ${opt}`,
  (opt: string) => `so the architects put their weight behind ${opt}`,
] as const;

const RATIONALE_TEMPLATES = [
  (r: string) => `"${r}," they noted.`,
  (r: string) => `"${r}," reads the decision log.`,
  (r: string) => `Their rationale: "${r}."`,
  (r: string) => `"${r}," they wrote in the margin.`,
  (r: string) => `The reasoning was simple: "${r}."`,
  (r: string) => `"${r}," the lead architect explained.`,
  (r: string) => `In the meeting notes, the reasoning was recorded as: "${r}."`,
  (r: string) => `"${r}." That was the team's reasoning.`,
  (r: string) => `It came down to one thing: "${r}."`,
  (r: string) => `"${r}," someone typed into the shared doc, and nobody disagreed.`,
] as const;

const REVISION_TEMPLATES = [
  (concern: string, from: string, to: string) =>
    `In the aftermath, they had to go back on ${concern}: ${from} was abandoned in favour of ${to}.`,
  (concern: string, from: string, to: string) =>
    `In the aftermath, the decision on ${concern} was reopened: ${from} gave way to ${to}.`,
  (concern: string, from: string, to: string) =>
    `In the aftermath, they changed their choice of ${from} for ${concern} to ${to}.`,
  (concern: string, from: string, to: string) =>
    `The event forced their hand on ${concern}: out went ${from}, in came ${to}.`,
  (concern: string, from: string, to: string) =>
    `That meant revisiting ${concern}. ${from} no longer made sense, so they switched to ${to}.`,
  (concern: string, from: string, to: string) =>
    `When the dust settled, ${concern} looked different: ${from} was replaced with ${to}.`,
  (concern: string, from: string, to: string) =>
    `They had to reconsider ${concern}. After the discussion, the team moved away from ${from} and towards ${to}.`,
] as const;

const NO_REVISION_TEMPLATES = [
  'The team pored over the blueprints, and decided their earlier choices would hold.',
  'The architects reviewed every decision made so far, and let them all stand.',
  'After a tense review of the design, the team concluded that nothing needed to change.',
  'They revisited every prior decision, and each one passed muster.',
  'The review was uncomfortable, but in the end, the architecture held up.',
  'Fingers hovered over the revision notes, but in the end, they were put down untouched.',
  'The design was pressure-tested against the new reality, and it held.',
  'Nothing was changed. The earlier decisions, it turned out, had anticipated this.',
] as const;

/** Narrative lead-in per event card, with a generic fallback */
const EVENT_LEADS: Record<string, string> = {
  'event-fire': 'Then one day, there was a fire.',
  'event-malware': 'Then came troubling news from the security desk.',
  'event-new-cto': 'Then the company hired a new CTO.',
  'event-data-protection': 'Then the regulators came knocking.',
  'event-user-survey': "Then the results of a user survey landed on the team's desk.",
};

// --------------- Text helpers ---------------

/**
 * Turn a concern description into past-tense narrative: drop the
 * trailing question ("How will the system…?") and shift the need
 * statement into past tense.
 */
function toNarrativeNeed(description: string): string {
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() && !s.trim().endsWith('?'));
  return sentences
    .join(' ')
    .replace(/\bneeds\b/g, 'needed')
    .replace(/\bneed\b/g, 'needed')
    .replace(/\bwants\b/g, 'wanted')
    .replace(/\bwant\b/g, 'wanted')
    .trim();
}

function cleanRationale(rationale: string): string {
  return rationale.trim().replace(/^["'“]+|["'”.]+$/g, '').trim();
}

/** "Alice", "Alice and Bob", "Alice, Bob and Carol" */
function listNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// --------------- Story generation ---------------

/**
 * Generate the deterministic project retrospective for a finished
 * classic-mode game. Returns null for ethics mode.
 */
export function generateStory(state: GameState): string | null {
  if (state.gameVersion !== 'classic') return null;
  if (state.groupDecisions.length === 0) return null;

  const rng = mulberry32(hashString(`${state.roomCode}:${state.startedAt ?? 0}`));
  const codename = pick(rng, CODENAMES);
  const company = pick(rng, COMPANIES);

  const paragraphs: string[] = [];

  // ---- Introduction ----
  const names = state.players.map((p) => p.name);
  const teamLine =
    names.length === 1
      ? `Its design fell to a lone architect: ${names[0]}.`
      : `Its design fell to a team of ${names.length} architects: ${listNames(names)}.`;
  paragraphs.push(
    `${codename} is a social news platform by ${company}, a place for people to write, share and read the news. ${teamLine} This is the story of what they built.`
  );

  // ---- Decisions and events, in play order ----
  const drawnEventIds = state.drawnEventIndices.map((i) => state.eventOrder[i]);
  const revisionsByEvent = new Map<string, GroupDecision[]>();
  for (const d of state.groupDecisions) {
    if (d.revisedByEvent) {
      const list = revisionsByEvent.get(d.revisedByEvent) ?? [];
      list.push(d);
      revisionsByEvent.set(d.revisedByEvent, list);
    }
  }

  let buffer: string[] = [];
  let buffered = 0;
  let eventCursor = 0;

  const flush = () => {
    if (buffer.length > 0) paragraphs.push(buffer.join(' '));
    buffer = [];
    buffered = 0;
  };

  state.groupDecisions.forEach((decision, i) => {
    const concern = CARD_DATA.concerns.find((c) => c.id === decision.concernId);
    if (concern) {
      // Narrate the choice as originally made; revisions are told
      // later, as part of the event that forced them.
      const originalId = decision.originalOptionId ?? decision.optionId;
      const original = concern.designOptions.find((o) => o.id === originalId);
      const optionName = original?.name ?? decision.optionName;

      const need = toNarrativeNeed(concern.description);
      const choice = pick(rng, CHOICE_TEMPLATES)(optionName);
      buffer.push(`${need.replace(/\.$/, '')}, ${choice}.`);

      // The stored rationale belongs to the revision once one happens,
      // so only quote it for decisions that were never revised.
      const rationale = cleanRationale(decision.rationale);
      if (!decision.revisedByEvent && rationale.length >= 8) {
        buffer.push(pick(rng, RATIONALE_TEMPLATES)(rationale));
      }
      buffered++;
    }

    // Events fire after every 4th decision (see shouldDrawEvent)
    const eventDue = (i + 1) % 4 === 0 && eventCursor < drawnEventIds.length;
    if (buffered >= 2 || eventDue) flush();

    if (eventDue) {
      const eventId = drawnEventIds[eventCursor];
      eventCursor++;
      const event = CARD_DATA.events.find((e) => e.id === eventId);
      if (event) {
        const sentences: string[] = [
          EVENT_LEADS[event.id] ?? `Then word arrived: ${event.title}.`,
          event.description,
        ];
        const revisions = revisionsByEvent.get(event.id) ?? [];
        if (revisions.length > 0) {
          for (const rev of revisions) {
            const revConcern = CARD_DATA.concerns.find((c) => c.id === rev.concernId);
            const fromName =
              revConcern?.designOptions.find((o) => o.id === rev.originalOptionId)?.name ??
              'their earlier choice';
            sentences.push(
              pick(rng, REVISION_TEMPLATES)(rev.concernTitle, fromName, rev.optionName)
            );
            const rationale = cleanRationale(rev.rationale);
            if (rationale.length >= 8) {
              sentences.push(pick(rng, RATIONALE_TEMPLATES)(rationale));
            }
          }
        } else {
          sentences.push(pick(rng, NO_REVISION_TEMPLATES));
        }
        paragraphs.push(sentences.join(' '));
      }
    }
  });
  flush();

  // ---- The verdict ----
  const score = calculateScores(state);
  if (score.lost) {
    const failed = [...new Set(score.loss?.details.map((d) => d.attribute) ?? [])];
    const failedLine =
      failed.length > 0
        ? ` The inspectors' report tore into ${listNames(failed)}, each one a wound the architecture could not survive.`
        : '';
    const lossCloser = pick(rng, [
      `${company} held an emergency board meeting. By end of day, the project was dead.`,
      `The blueprints were rolled up, the repository archived, and the team quietly reassigned. Nobody spoke of ${codename} again.`,
      `Somewhere in ${company}'s file system, a folder named "${codename}" still exists. No one opens it.`,
      `The post-mortem lasted three hours. The silence afterward lasted much longer.`,
      `${company} issued a brief internal statement. The team did not need to read it to know what it said.`,
    ] as const);
    paragraphs.push(
      `Then came the final inspection, and the verdict was merciless: ${codename} had failed. ${score.loss?.summary ?? ''}${failedLine} ${lossCloser}`
    );
  } else {
    const closer = pick(rng, [
      `And somewhere out there, right now, ${codename} is carrying the news, holding up under the weight of every decision this team ever made.`,
      `${company} uncorked a bottle in the conference room. ${codename} went live at midnight, and the servers held.`,
      `The team framed the blueprints and hung them on the wall. Months later, they would glance at them and feel something close to pride.`,
      `${codename} launched without fanfare. Then, slowly, quietly, it became something people relied on. That was enough.`,
      `The file came back approved, and the team sat in stunned silence for a moment before the cheering started. They had built something that worked.`,
    ] as const);
    paragraphs.push(
      `Then came the final inspection, and it passed. Both the User and the Owner signed off without reservation, and the file came back stamped "${score.grade.toUpperCase()}" with a final score of ${score.finalScore}. ${closer}`
    );
  }

  return paragraphs.join('\n\n');
}
