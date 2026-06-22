// ============================================================
// DecidArch LLM experiment — generic game runner
// ============================================================
// Drives one full Classic game over the public WebSocket API, stepping
// deterministically through phases and delegating the per-phase agent
// behaviour to the chosen pattern (propose / decide). Revision after a
// banning event is handled uniformly by the neutral facilitator.

import { currentConcern, reviseBanned } from './agents.mjs';

const isTerminal = (p) => p.phase === 'scoring' || p.phase === 'finished';

/**
 * @returns the final game-state payload (with .score attached by the server).
 */
export async function runGame({ pattern, table, llm, log }) {
  const deck = table.deck;
  const host = pattern.host;
  const scratchByConcern = {};
  const ctxFor = (state) => ({
    table,
    llm,
    deck,
    log,
    scratch: (scratchByConcern[state.currentConcernIndex] ||= {}),
  });

  table.startGame();
  await table.waitState((p) => p.phase !== 'lobby');

  while (true) {
    const s = table.latestState;
    if (isTerminal(s)) break;
    const concern = currentConcern(deck, s);

    switch (s.phase) {
      case 'individual-prep': {
        log(`\n— concern ${s.currentConcernIndex + 1}/${s.concernOrder.length}: ${concern?.title}`);
        await pattern.propose(ctxFor(s), s, concern);
        await table.waitState((p) => p.phase === 'reveal' || isTerminal(p));
        break;
      }
      case 'reveal': {
        table.send(host, 'advance-phase'); // -> group-decision
        await table.waitState((p) => p.phase === 'group-decision' || isTerminal(p));
        break;
      }
      case 'group-decision': {
        await pattern.decide(ctxFor(s), s, concern);
        await table.waitState((p) => p.phase !== 'group-decision' || isTerminal(p));
        break;
      }
      case 'event': {
        const ev = deck.events.find((e) => e.id === s.activeEventId);
        log(`  ⚡ event: ${ev?.title} — ${ev?.effect}`);
        table.send(host, 'advance-phase'); // -> event-revision (classic)
        await table.waitState((p) => p.phase === 'event-revision' || isTerminal(p));
        break;
      }
      case 'event-revision': {
        await reviseBanned({ table, host, llm, deck, state: s, log });
        table.send(host, 'skip-revision');
        await table.waitState((p) => p.phase !== 'event-revision' || isTerminal(p));
        break;
      }
      default:
        await table.waitState((p) => p.phase !== s.phase || isTerminal(p));
    }
  }

  return table.latestState;
}
