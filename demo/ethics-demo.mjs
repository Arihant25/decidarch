// ============================================================
// DecidArch — ETHICS-AWARE mode demo  (Library Management System)
// ------------------------------------------------------------
// Drives a real, watchable game of the Ethics-Aware mode over
// the WebSocket API with FOUR bot players, each speaking for a
// different stakeholder around the "Modesty" parameter dilemma.
// They each propose a safeguard with genuine ethical reasoning,
// debate in the chat, and the host records the agreed safeguard
// and rates its impact on every affected value — like a real table.
//
// Open the printed spectate link in a browser before kickoff and 
// watch.
//
// The script starts the dev server itself if one is not already
// running, so you can just point a recorder at the spectate link.
//
// Run:   node demo/ethics-demo.mjs            (plays the FULL game)
//        ROUNDS=1 node demo/ethics-demo.mjs   (just one round)
// Tunables: HOST=localhost:3000 STEP_MS=4500 LEAD_MS=18000 ROUNDS=all
// ============================================================

import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.HOST || 'localhost:3000';
const STEP = Number(process.env.STEP_MS || 4500); // base pause between beats
const LEAD = Number(process.env.LEAD_MS || 18000); // time to open the spectate link before kickoff
const ROUNDS = (process.env.ROUNDS || 'all').toLowerCase(); // 'all' (default), '1', or a number
const MAX_ROUNDS = ROUNDS === 'all' ? Infinity : Math.max(1, Number(ROUNDS) || 1);

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toLocaleTimeString()}]`, ...a);

// --------------- Dev-server bootstrap ---------------
// Connect to HOST; if nothing is listening, start `npm run dev` and wait for it.
function portOpen(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (v) => { sock.destroy(); resolve(v); };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.setTimeout(1500, () => done(false));
  });
}

async function ensureServer() {
  const [host, portStr] = HOST.split(':');
  const port = Number(portStr) || 3000;
  if (await portOpen(host, port)) {
    log(`Dev server already running at ${HOST}.`);
    return;
  }
  log(`No server at ${HOST} — starting "npm run dev"…`);
  const child = spawn('npm', ['run', 'dev'], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: 'ignore',
    detached: true, // survives this script so the spectate link stays live afterwards
    env: { ...process.env, PORT: String(port) },
  });
  child.unref();
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await wait(1000);
    if (await portOpen(host, port)) {
      log('Dev server is up.');
      await wait(2500); // let Next finish its first compile
      return;
    }
  }
  throw new Error(`Dev server did not come up within 90s at ${HOST}.`);
}

// --------------- Cast of stakeholders ---------------
// Alice facilitates as a product manager; the others each carry an
// ethical perspective on the "Modesty" request.
const HOST_NAME = 'Alice';   // Product manager / facilitator
const PLAYER_NAMES = ['Bilal', 'Carmen', 'David']; // join in this order
// Bilal  — advocates for the female members (Noora): Fairness, Freedom
// Carmen — privacy & GDPR specialist: Privacy, data minimisation
// David  — sponsor/business perspective: Social power, Wealth (ethically aware)

// --------------- The playbook ---------------
// One entry per ethical concern card. Ethics mode has no fixed options:
// each player writes a free-text *safeguard proposal*, then the host
// records the agreed safeguard and rates its impact (++/+/-/--) on every
// affected value. Whatever card the shuffle deals, the table is ready.
//
// players[] — each stakeholder's safeguard proposal + a short chat `say`.
// chat[]    — the consensus discussion after the reveal.
// group     — the agreed safeguard text + a rating per affected value.
const PLAYBOOK = {
  'ec-1': {
    players: [
      { name: 'Bilal', rationale: 'Do not implement Modesty as a silent hard block. Whenever a category is restricted, the system must surface open-access alternatives (public-domain texts, reputable online sources) so no member is ever simply denied knowledge.', say: 'A silent gender block is indefensible — at minimum we must point members to open-access alternatives.' },
      { name: 'Carmen', rationale: 'If a restriction must exist, never encode gender directly as the filter key. Tie it to a configurable, institution-level policy flag so we are not hard-coding a protected attribute into the system.', say: 'Whatever we do, we should not hard-code gender as a filter — that is the real red line.' },
      { name: 'David', rationale: 'A blunt gender block is a reputational landmine in equality-valuing markets. A "suggest alternatives" module lets us honour the sponsor contract while visibly reducing harm.', say: 'Business reality: a raw block will get us boycotted. Alternatives module softens that.' },
      { name: 'Alice', rationale: 'Consensus direction: no silent denial. Pair any restriction with an alternatives module and a transparent notice, and decouple the logic from gender wherever law allows.', say: 'So: never deny silently, always offer alternatives, and decouple from gender where we legally can.' },
    ],
    chat: [
      { name: 'David', text: 'I can sell "transparent restriction with alternatives" to the sponsor far more easily than a hard wall.' },
      { name: 'Carmen', text: 'And decoupling from gender keeps us defensible under anti-discrimination law.' },
      { name: 'Bilal', text: 'It does not erase the harm — but routing members to open knowledge genuinely helps Noora. I support it as harm-reduction.' },
      { name: 'Alice', text: 'Agreed. Let me record the safeguard and rate each affected value honestly — some still take a hit.' },
    ],
    group: {
      rationale: 'When a category is restricted the system never silently denies access: it returns curated open-access alternatives plus a clear explanation, and restriction logic is decoupled from gender wherever legally possible.',
      valueImpacts: { Fairness: '+', Freedom: '+', 'Cultural autonomy': '-', Hope: '+', 'Social power': '-' },
    },
  },
  'ec-2': {
    players: [
      { name: 'Carmen', rationale: 'Data minimisation (GDPR Art. 5): the system must NOT log which members attempted restricted categories. No gender-linked access logs, full stop.', say: 'Logging who tried restricted books turns a policy into surveillance. Strip it entirely.' },
      { name: 'Bilal', rationale: 'Recording attempts punishes members twice — first by denial, then by being tracked for it. Remove all per-member attempt logging.', say: 'No member should be put on a list for trying to read.' },
      { name: 'David', rationale: 'We can still give the sponsor anonymised, aggregate usage metrics for capacity planning — no per-person tracking required.', say: 'Aggregate stats keep the sponsor informed without tracking individuals.' },
      { name: 'Alice', rationale: 'Consensus: no per-member logging of restricted attempts; retain only fully anonymised aggregate counts for operations.', say: 'So zero personal logging, anonymised aggregates only.' },
    ],
    chat: [
      { name: 'Bilal', text: 'Privacy here is not a nice-to-have — it directly protects members from social consequences.' },
      { name: 'David', text: 'Aggregates cover every legitimate business need. I am fine dropping the personal logs.' },
      { name: 'Carmen', text: 'Then the privacy impact is strongly positive. Cultural-autonomy enforcement loses a little, which we should rate honestly.' },
      { name: 'Alice', text: 'Recording it now.' },
    ],
    group: {
      rationale: 'The system stores no personal record of restricted-category attempts; only fully anonymised, aggregate counts are retained for operational metrics.',
      valueImpacts: { Privacy: '++', Welfare: '+', 'Cultural autonomy': '-' },
    },
  },
  'ec-3': {
    players: [
      { name: 'David', rationale: 'Require identity verification at pickup so the policy is actually enforceable — otherwise the sponsor’s requirement is meaningless.', say: 'For the policy to mean anything we need some verification at pickup.' },
      { name: 'Carmen', rationale: 'Verification re-introduces a privacy cost. Collect the absolute minimum, never scan or store identity documents, and discard verification data immediately.', say: 'Fine, but light verification only — no scans, no retention.' },
      { name: 'Bilal', rationale: 'ID checks fall hardest on the restricted group. Keep it a lightweight membership check, not a documentary interrogation.', say: 'Make it a quick membership check, not a checkpoint that intimidates.' },
      { name: 'Alice', rationale: 'Compromise: lightweight membership verification at pickup, with no document scanning or retention.', say: 'Lightweight verification, nothing stored. That balances both concerns.' },
    ],
    chat: [
      { name: 'Carmen', text: 'The key is "no retention" — a check that leaves no trace is far less invasive.' },
      { name: 'Bilal', text: 'As long as it is light-touch and not stored, I can live with it.' },
      { name: 'David', text: 'And it keeps the policy enforceable, which the sponsor needs. Workable.' },
      { name: 'Alice', text: 'Logging it as a net-positive on privacy because nothing is retained.' },
    ],
    group: {
      rationale: 'Pickup uses lightweight membership verification only — no identity documents are scanned or stored, and verification data is discarded immediately after the loan is confirmed.',
      valueImpacts: { Privacy: '+', 'Cultural autonomy': '+' },
    },
  },
  'ec-4': {
    players: [
      { name: 'David', rationale: 'A transparent, culturally-sensitive notice protects the brand in equality-valuing markets while still honouring the sponsor — defending both Wealth and Social power.', say: 'A clear, respectful explanation module is our best shield against market backlash.' },
      { name: 'Carmen', rationale: 'The notice must be factual, non-discriminatory in tone and legally reviewed before it ships in any market.', say: 'Whatever the notice says, legal reviews it first.' },
      { name: 'Bilal', rationale: 'Transparency beats silent denial, but a polite explanation does not undo the restriction. Support it as harm-reduction, not a fix.', say: 'Transparency helps, but let us not pretend it solves the core issue.' },
      { name: 'Alice', rationale: 'Add a notification module that explains any restriction transparently and respectfully, reducing reputational and market risk.', say: 'Agreed — a transparent, legally-reviewed notice module.' },
    ],
    chat: [
      { name: 'David', text: 'Markets punish silent discrimination far harder than transparent, explained policy.' },
      { name: 'Carmen', text: 'Legally-reviewed wording keeps us out of trouble across jurisdictions.' },
      { name: 'Bilal', text: 'I will back it as harm-reduction. It genuinely lowers the reputational and emotional cost.' },
      { name: 'Alice', text: 'This one rates positively for the business values. Recording it.' },
    ],
    group: {
      rationale: 'Add a notification module that explains any restriction in a transparent, culturally-sensitive, legally-reviewed way — reducing reputational and market risk while keeping members informed.',
      valueImpacts: { 'Social power': '+', Hope: '+', Wealth: '+' },
    },
  },
  'ec-5': {
    players: [
      { name: 'Alice', rationale: 'Treat the ethical safeguards (data minimisation, alternatives, transparency) as non-negotiable scope, and negotiate a realistic timeline with the sponsor transparently rather than cutting them.', say: 'The deadline does not get to delete our ethics work — we renegotiate the date instead.' },
      { name: 'David', rationale: 'Cutting privacy work to hit a date will cost far more later in fines and reputation. Protect it even under deadline pressure.', say: 'Skipping privacy to ship faster is a false economy — it costs more later.' },
      { name: 'Carmen', rationale: 'Lock data-minimisation into the Definition of Done so deadline pressure cannot quietly erode it.', say: 'Put data-minimisation in the DoD so it cannot be silently dropped.' },
      { name: 'Bilal', rationale: 'Do not ship the discriminatory core just to meet a date — that is the one corner we must never cut.', say: 'Whatever slips, the fairness safeguards do not.' },
    ],
    chat: [
      { name: 'David', text: 'Short-term we lose a little delivery speed, so Wealth takes a small hit. Worth it.' },
      { name: 'Carmen', text: 'And privacy is protected, which is the whole point of holding the line.' },
      { name: 'Bilal', text: 'Agreed — better a slightly later launch than an unethical one.' },
      { name: 'Alice', text: 'Recording: safeguards non-negotiable, timeline renegotiated openly.' },
    ],
    group: {
      rationale: 'Ethical safeguards are non-negotiable scope; the team communicates a realistic timeline to the sponsor rather than dropping privacy or fairness work to meet the deadline.',
      valueImpacts: { Wealth: '-', Privacy: '+' },
    },
  },
  'ec-6': {
    players: [
      { name: 'Bilal', rationale: 'Replace the blunt block with a context-aware model that can grant access for research or educational use — restoring members’ well-being where a flat ban would crush it.', say: 'Context-aware access (e.g. research use) restores well-being a flat ban destroys.' },
      { name: 'Carmen', rationale: 'Any ML must be auditable and must not profile members by gender — train on content and context, never on the person.', say: 'If we use ML it must be auditable and never profile the member.' },
      { name: 'David', rationale: 'A nuanced, context-based access model is a far more sellable and future-proof product than a crude switch.', say: 'A smart, context-based model is also a better product to sell.' },
      { name: 'Alice', rationale: 'Adopt a transparent, auditable context-based access model with a human appeal path, restoring access wherever it is justified.', say: 'Context-based access + a human appeal route. That is the consensus.' },
    ],
    chat: [
      { name: 'Carmen', text: 'Auditability is the safeguard on the safeguard — without it, ML just hides the discrimination.' },
      { name: 'Bilal', text: 'A human appeal path matters too, so no member is trapped by an algorithm.' },
      { name: 'David', text: 'It softens the cultural-autonomy stance a little, but the well-being gain is large.' },
      { name: 'Alice', text: 'Rating well-being strongly positive, autonomy slightly negative. Recording.' },
    ],
    group: {
      rationale: 'Replace the blunt block with a transparent, auditable, context-based access model (e.g. research/educational exemptions) plus a human appeal path — restoring members’ access wherever justified.',
      valueImpacts: { Welfare: '++', 'Cultural autonomy': '-', Hope: '+', 'Social power': '-' },
    },
  },
};

// ------------------------------------------------------------
//  Driver
// ------------------------------------------------------------

let deck = null;
let roomCode = null;
let roundsdone = 0;
const acted = new Set();
const sockets = {}; // name -> ws

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }));
}
async function chat(name, text) {
  send(sockets[name], 'chat-message', { text });
  log(`  💬 ${name}: ${text}`);
  await wait(Math.max(900, STEP * 0.4));
}
function currentConcern(state) {
  const id = state.concernOrder[state.currentConcernIndex];
  return deck?.ethics.concerns.find((c) => c.id === id) || null;
}

let a; // host socket, created in main() after the server is confirmed up

async function main() {
  await ensureServer();
  a = new WebSocket(`ws://${HOST}/ws?action=create&name=${HOST_NAME}&version=ethics`);
  sockets[HOST_NAME] = a;
  a.on('open', () => log(`${HOST_NAME} connected (host).`));
  a.on('error', (e) => log('Host socket error:', e.message));
  a.on('message', onHostMessage);
}

async function onHostMessage(raw) {
  const msg = JSON.parse(raw.toString());

  if (msg.type === 'room-created') {
    roomCode = msg.payload.roomCode;
    send(a, 'get-card-data');
    console.log('\n============================================================');
    console.log('  DecidArch — ETHICS-AWARE demo  (Library Management System)');
    console.log(`  ROOM CODE:     ${roomCode}`);
    console.log(`  SPECTATE LINK: http://${HOST}/room/${roomCode}?spectate=1`);
    console.log(`  Kickoff in ~${Math.round(LEAD / 1000)}s — open the link to watch live.`);
    console.log('============================================================\n');
    return;
  }

  if (msg.type === 'card-data') {
    deck = msg.payload;
    log('Card data received. Seating the rest of the stakeholders…');
    await Promise.all(PLAYER_NAMES.map(connectPlayer));
    log(`Lobby ready with ${PLAYER_NAMES.length + 1} players. Kicking off in ~${Math.round(LEAD / 1000)}s…`);
    await wait(LEAD);
    log('Starting the game!');
    send(a, 'start-game');
    return;
  }

  if (msg.type === 'game-state') await onHostState(msg.payload);
}

function connectPlayer(name) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://${HOST}/ws?action=join&name=${name}&room=${roomCode}`);
    sockets[name] = ws;
    ws.on('open', () => log(`${name} connected (player).`));
    ws.on('error', (e) => log(`${name} socket error:`, e.message));
    ws.on('message', (rb) => {
      const m = JSON.parse(rb.toString());
      if (m.type === 'joined') resolve();
    });
  });
}

async function onHostState(state) {
  if (state.gameVersion !== 'ethics' || !deck) return;
  const concern = currentConcern(state);
  const tag = `${state.phase}-${state.currentConcernIndex}`;

  switch (state.phase) {
    case 'individual-prep': {
      if (acted.has(`prep-${state.currentConcernIndex}`)) break;
      acted.add(`prep-${state.currentConcernIndex}`);

      if (roundsdone >= MAX_ROUNDS) return wrapUp(state);
      if (!concern) break;

      // Intro chat goes here (not in the lobby, where the chat panel isn't shown).
      if (!acted.has('intro')) {
        acted.add('intro');
        await chat(HOST_NAME, 'Welcome team. The sponsor wants a "Modesty" parameter that refuses certain book categories to female members. Our job: design responsibly while protecting human values — Fairness, Privacy, Freedom, Welfare and more.');
        await chat(HOST_NAME, 'Each round: we each propose a safeguard from our stakeholder\u2019s view, reveal them, debate, then agree on one safeguard and rate how it affects each value. Let us begin.');
        await wait(5000); // give spectators time to read the concern card and value tooltips
      }

      const entry = PLAYBOOK[concern.id];
      log(`\n=== ROUND ${roundsdone + 1} — Ethical Concern ${state.currentConcernIndex + 1}/${state.concernOrder.length}: ${concern.title} ===`);
      log(`   ${concern.description}`);
      log(`   Affected values: ${concern.affectedValues.join(', ')}`);
      await wait(STEP);
      await chat(HOST_NAME, `Round ${roundsdone + 1}: "${concern.title}". ${concern.description} Affected values: ${concern.affectedValues.join(', ')}. Propose your safeguards.`);

      for (const p of entry.players) {
        await wait(STEP * 0.4);
        send(sockets[p.name], 'submit-decision', { optionId: '', rationale: p.rationale });
        log(`   \u270d\ufe0f  ${p.name} proposes a safeguard.`);
        await chat(p.name, p.say);
      }
      break;
    }

    case 'reveal': {
      if (acted.has(tag)) break;
      acted.add(tag);
      await wait(STEP);
      log('   📋 All safeguard proposals revealed — opening discussion.');
      await chat(HOST_NAME, 'All proposals are in. Let us find the safeguard we can all stand behind.');
      await wait(STEP * 0.6);
      send(a, 'advance-phase');
      break;
    }

    case 'group-decision': {
      if (acted.has(tag) || !concern) break;
      acted.add(tag);
      const entry = PLAYBOOK[concern.id];

      for (const line of entry.chat) {
        await chat(line.name, line.text);
      }

      // Stream the agreed-safeguard text so spectators see the host "typing".
      const r = entry.group.rationale;
      for (let i = 6; i <= r.length; i += 6) {
        send(a, 'update-group-draft', { rationale: r.slice(0, i) });
        await wait(140);
      }
      send(a, 'update-group-draft', { rationale: r });
      await wait(STEP * 0.6);

      // Reveal the value ratings one at a time so the impact table fills in live.
      const impacts = {};
      log('   ⚖️  Rating impact on each affected value:');
      for (const valueName of concern.affectedValues) {
        const imp = entry.group.valueImpacts[valueName] ?? '-';
        impacts[valueName] = imp;
        send(a, 'update-group-draft', { rationale: r, valueImpacts: { ...impacts } });
        log(`        ${valueName}: ${imp}`);
        await wait(STEP * 0.45);
      }

      await wait(STEP * 0.6);
      send(a, 'submit-group-decision', { optionId: '', rationale: r, valueImpacts: impacts });
      roundsdone += 1;
      log('   ✅ Group safeguard recorded.');
      await chat(HOST_NAME, 'Safeguard recorded with our honest value ratings. Good, thoughtful work.');
      break;
    }

    case 'event': {
      if (acted.has(tag)) break;
      acted.add(tag);
      const ev = deck.ethics.events.find((e) => e.id === state.activeEventId);
      await wait(STEP);
      log(`   ⚡ EVENT: ${ev?.title} — ${ev?.consequence}`);
      await chat(HOST_NAME, `⚡ Event card! ${ev?.title}: ${ev?.description} ${ev?.consequence}`);
      await wait(STEP * 0.6);
      send(a, 'advance-phase'); // ethics: applies the V-importance shift and moves on
      break;
    }

    case 'scoring':
    case 'finished': {
      if (acted.has('done')) break;
      acted.add('done');
      const s = state.score;
      await chat(HOST_NAME, `That completes our ethical review. Outcome: ${s?.grade} (score ${s?.finalScore}). Thank you all.`);
      console.log('\n============================================================');
      console.log(`  GAME OVER — outcome: ${s?.grade}, final score: ${s?.finalScore}`);
      console.log(`  Spectate link stays live: http://${HOST}/room/${roomCode}?spectate=1`);
      console.log('============================================================\n');
      await wait(120000);
      process.exit(0);
    }
  }
}

let wrappedUp = false;
async function wrapUp(state) {
  if (wrappedUp) return;
  wrappedUp = true;
  await wait(STEP);
  await chat(HOST_NAME, `That wraps up our preview of Ethics-Aware DecidArch! A full game works through all ${state.concernOrder.length} ethical concerns and a disruptive event or two, then reflects on how our safeguards served every stakeholder’s values.`);
  console.log('\n============================================================');
  console.log(`  DEMO COMPLETE — played ${roundsdone} round(s).`);
  console.log('  (Default is the full game; this run was limited via ROUNDS.)');
  console.log(`  Spectate link stays live: http://${HOST}/room/${roomCode}?spectate=1`);
  console.log('============================================================\n');
  await wait(120000);
  process.exit(0);
}

process.on('SIGINT', () => process.exit(0));

main().catch((e) => {
  log('Fatal:', e.message);
  process.exit(1);
});
