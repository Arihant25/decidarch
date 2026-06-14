// ============================================================
// DecidArch — CLASSIC mode demo  (Social News Platform)
// ------------------------------------------------------------
// Drives a real, watchable game of the Classic (architecture)
// mode over the WebSocket API with FOUR bot players, each with a
// distinct engineering perspective. They file individual design
// proposals with genuine reasoning, debate in the chat, and the
// host locks in a group decision — exactly like a real table.
//
// Open the printed spectate link in a browser before kickoff and 
// watch.
//
// The script starts the dev server itself if one is not already
// running, so you can just point a recorder at the spectate link.
//
// Run:   node demo/classic-demo.mjs            (plays the FULL game)
//        ROUNDS=1 node demo/classic-demo.mjs   (just one round)
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

// --------------- Cast of architects ---------------
// Alice is the host/lead; the other three each champion a concern.
const HOST_NAME = 'Alice';
const PLAYER_NAMES = ['Bob', 'Chen', 'Diana']; // join in this order

// --------------- The playbook ---------------
// One entry per concern card. Whatever card the shuffle deals first,
// the table already has hand-authored reasoning, debate and a sound
// group choice for it — so the demo always looks like a real game.
//
// players[]  — each architect's individual proposal (optionId + rationale)
//              and a short `say` line they drop in chat as they file it.
// chat[]     — the group-discussion back-and-forth after the reveal.
// group      — the consensus choice the host records.
const PLAYBOOK = {
  'concern-1': {
    players: [
      { name: 'Chen', optionId: 'c1-opt2', rationale: 'Cloud gives Maintainability ++ on top of Performance + and Availability +. Articles are published content — not credentials — so the Security - trade is fine here.', say: 'Cloud for articles — Maintainability ++ and still Performance + and Availability +.' },
      { name: 'Diana', optionId: 'c1-opt2', rationale: 'Cloud storage is a maintenance dream (++) and still keeps Performance and Availability up. We are a small team; offloading ops is huge.', say: 'Cloud — Maintainability ++ matters for a small team.' },
      { name: 'Bob', optionId: 'c1-opt2', rationale: 'Articles are published content, not user credentials. Cloud Maintainability ++ is a real win; we will guard the sensitive data separately in concern-3.', say: 'Article text is public content. Save the local DB for credentials — cloud is fine here.' },
      { name: 'Alice', optionId: 'c1-opt2', rationale: 'Cloud gives Maintainability ++ alongside Performance + and Availability +. Security - is acceptable for article storage — the sensitive credential store is a separate concern.', say: 'Cloud — Maintainability ++ without compromising article-text security.' },
    ],
    chat: [
      { name: 'Bob', text: 'Security - on cloud is noted, but articles are published content — they are not secrets.' },
      { name: 'Chen', text: 'Exactly. The sensitive credential store is a separate concern we will handle with a local DB.' },
      { name: 'Diana', text: 'And cloud Maintainability ++ is a real gift for a small team. Happy to take it here.' },
      { name: 'Alice', text: 'Cloud Storage for articles. Unanimous.' },
    ],
    group: { optionId: 'c1-opt2', rationale: 'Cloud Storage: Maintainability ++, Performance + and Availability + — articles are published content so the Security - trade is acceptable; sensitive credentials go to a separate local store.' },
  },
  'concern-2': {
    players: [
      { name: 'Chen', optionId: 'c2-opt2', rationale: 'Consistent with concern 1 — cloud for ratings, comments and reviews too. Maintainability ++ with Performance + and Availability +.', say: 'Cloud again — same logic as articles. Maintainability ++ for operational data.' },
      { name: 'Diana', optionId: 'c2-opt2', rationale: 'Cloud (Maintainability ++) is the right call for operational data. None of this is credentials — same reasoning as article storage.', say: 'Cloud — Maintainability ++ for ratings and comments, same as articles.' },
      { name: 'Bob', optionId: 'c2-opt2', rationale: 'Ratings and comments are not credential data. Cloud keeps the architecture consistent and gives us Maintainability ++.', say: 'Operational data is not sensitive. Cloud coherence with concern 1.' },
      { name: 'Alice', optionId: 'c2-opt2', rationale: 'One consistent cloud pattern for all non-sensitive storage, Maintainability ++ both times. Keeps the architecture simple.', say: 'Cloud — one coherent pattern for all non-sensitive data.' },
    ],
    chat: [
      { name: 'Diana', text: 'Cloud for both concerns 1 and 2 — consistent and Maintainability ++ both times.' },
      { name: 'Bob', text: 'Operational data is not credentials. Cloud is fine.' },
      { name: 'Chen', text: 'One storage pattern for all non-sensitive data, a separate local store for sensitive data. Clean architecture.' },
      { name: 'Alice', text: 'Cloud Storage for operational data.' },
    ],
    group: { optionId: 'c2-opt2', rationale: 'Cloud Storage: Maintainability ++ with Performance + and Availability + — consistent with article storage; operational data (ratings, comments) is not sensitive, so the Security - trade is acceptable here too.' },
  },
  'concern-3': {
    players: [
      { name: 'Bob', optionId: 'c3-opt3', rationale: 'This is credentials and payment data. Single Local DB is the only option that does NOT push Security negative (it stays =).', say: 'Sensitive data — local is the only one that keeps Security out of the red.' },
      { name: 'Chen', optionId: 'c3-opt1', rationale: 'Distributed gives Performance +, but I admit Security goes - on sensitive data.', say: 'I want Performance, but - Security on credentials is scary...' },
      { name: 'Diana', optionId: 'c3-opt2', rationale: 'Cloud is Maintainability ++, but Security -- on sensitive data is hard to defend.', say: 'Cloud is -- Security here — probably a non-starter.' },
      { name: 'Alice', optionId: 'c3-opt3', rationale: 'For sensitive credentials, avoiding any negative Security is worth the Performance/Availability cost. Local it is.', say: 'For sensitive data I prioritise not going negative on Security.' },
    ],
    chat: [
      { name: 'Diana', text: 'Withdrawing cloud — -- Security on payment data is indefensible.' },
      { name: 'Chen', text: 'Yeah, I will drop distributed too. Performance is not worth weakening credential security.' },
      { name: 'Bob', text: 'Local keeps Security neutral and our QA-Scores out of the negative. That is the safe pick.' },
      { name: 'Alice', text: 'Consensus on Single Local DB for the sensitive store.' },
    ],
    group: { optionId: 'c3-opt3', rationale: 'Single Local Database is the only choice that keeps Security non-negative for credentials and payment data — protecting the whole QA-Score from going below zero.' },
  },
  'concern-4': {
    players: [
      { name: 'Bob', optionId: 'c4-opt1', rationale: 'Outsourcing to a proven payment provider means expert PCI compliance and fraud detection without the Maintainability -- of maintaining open-source payment code ourselves.', say: 'Outsource — trusted providers own PCI compliance. Maintainability + beats the -- of DIY payment code.' },
      { name: 'Chen', optionId: 'c4-opt1', rationale: 'Outsourcing gives Maintainability +. Security - means we depend on the provider, but that is exactly what Stripe and PayPal are built for.', say: 'Outsource — Maintainability + and let a proven provider own the security burden.' },
      { name: 'Diana', optionId: 'c4-opt1', rationale: 'Outsourcing is Maintainability +, far less for us to own. The provider takes on the PCI scope entirely.', say: 'Outsourcing — Maintainability + and no payment compliance for us to own.' },
      { name: 'Alice', optionId: 'c4-opt1', rationale: 'Outsource e-payment: Maintainability +, and the provider handles PCI compliance. Security - reflects provider dependency, which is an accepted industry norm for payment.', say: 'Outsource — industry norm. Providers own the PCI burden; we get Maintainability +.' },
    ],
    chat: [
      { name: 'Diana', text: 'Open-source payment is Security ++ but Maintainability --. That is enormous ongoing work for a small team.' },
      { name: 'Bob', text: 'Outsourcing to a proven provider trades a Security point for Maintainability +. The provider owns PCI compliance.' },
      { name: 'Chen', text: 'And users transact through a trusted brand — that is its own form of assurance.' },
      { name: 'Alice', text: 'Outsource E-Payment — Maintainability + and no payment compliance to maintain.' },
    ],
    group: { optionId: 'c4-opt1', rationale: 'Outsource E-Payment: Maintainability + — trusted payment providers (Stripe, PayPal) own PCI compliance and fraud detection; the Security - reflects provider dependency, an accepted industry norm.' },
  },
  'concern-5': {
    players: [
      { name: 'Bob', optionId: 'c5-opt1', rationale: 'Onion routing (TOR) is Security ++ — the strongest anonymity guarantee for at-risk journalists.', say: 'TOR is Security ++ — best protection for sources.' },
      { name: 'Chen', optionId: 'c5-opt3', rationale: 'Anonymous Guest Accounts give Usability ++ and Maintainability +, with Security still +.', say: 'Guest accounts: Usability ++ AND Maintainability + — rare combo.' },
      { name: 'Diana', optionId: 'c5-opt3', rationale: 'Guest accounts are the only anonymity option that improves Maintainability instead of hurting it.', say: 'Guest accounts actually help maintenance — unusual and welcome.' },
      { name: 'Alice', optionId: 'c5-opt3', rationale: 'Guest accounts win Usability ++, Maintainability + and Security + with no Performance hit. Best all-round.', say: 'Guest accounts are positive on every axis we care about.' },
    ],
    chat: [
      { name: 'Bob', text: 'TOR is more secure, but Performance - and it is heavy to run.' },
      { name: 'Chen', text: 'Guest accounts still give Security +, and Usability ++ is a big User win.' },
      { name: 'Bob', text: 'True — + Security with ++ Usability and + Maintainability is the better balance. I will switch.' },
      { name: 'Alice', text: 'Anonymous Guest Accounts it is.' },
    ],
    group: { optionId: 'c5-opt3', rationale: 'Anonymous Guest Accounts: Usability ++, Security +, Maintainability + and no Performance penalty — the strongest all-round option for anonymous use.' },
  },
  'concern-6': {
    players: [
      { name: 'Bob', optionId: 'c6-opt1', rationale: 'Self-owned CDN keeps Security + and Performance +, with full control of the edge.', say: 'Self-CDN keeps Security + and Performance +.' },
      { name: 'Chen', optionId: 'c6-opt2', rationale: '3rd-party CDN gives Performance + with only a small Maintainability -, and almost no ops burden.', say: '3rd-party CDN: Performance + for a tiny maintenance cost.' },
      { name: 'Diana', optionId: 'c6-opt3', rationale: 'Same web server is Maintainability ++ and Security ++, but Performance - hurts the Users.', say: 'Same-server is great for maintenance, but Performance -.' },
      { name: 'Alice', optionId: 'c6-opt2', rationale: '3rd-party CDN gives the Performance + Users want for a far smaller Maintainability hit than self-hosting (--).', say: '3rd-party CDN — Performance + without the -- maintenance of self-hosting.' },
    ],
    chat: [
      { name: 'Diana', text: 'Self-CDN is Maintainability --. That is a lot for a small team to own.' },
      { name: 'Chen', text: '3rd-party gets us the Performance + with only Maintainability -.' },
      { name: 'Diana', text: 'And same-server tanks Performance, which Users rate 2. So 3rd-party is the middle path.' },
      { name: 'Alice', text: 'Agreed — 3rd Party CDN.' },
    ],
    group: { optionId: 'c6-opt2', rationale: '3rd Party CDN delivers the Performance + Users expect with only a minor Maintainability cost — cheaper to run than a self-owned CDN (--).' },
  },
  'concern-8': {
    players: [
      { name: 'Bob', optionId: 'c8-opt2', rationale: 'Two-Factor Authentication is Security ++ — the gold standard for account takeover.', say: '2FA is Security ++ — strongest against stolen credentials.' },
      { name: 'Chen', optionId: 'c8-opt3', rationale: 'Email-based recovery is Usability + AND Security +, without 2FA’s Usability - friction.', say: 'Email recovery is + on both Usability and Security.' },
      { name: 'Diana', optionId: 'c8-opt3', rationale: 'Email recovery is the only option here that is positive on Maintainability too (+).', say: 'And email recovery is Maintainability + — the others are negative.' },
      { name: 'Alice', optionId: 'c8-opt3', rationale: 'Email recovery is + across Usability, Security and Maintainability — no negatives anywhere.', say: 'Email recovery: + everywhere, - nowhere. Hard to beat.' },
    ],
    chat: [
      { name: 'Bob', text: '2FA is the most secure, but Usability - and Maintainability -- are real costs.' },
      { name: 'Chen', text: 'Email recovery is + on Security and Usability — and keeps maintenance positive.' },
      { name: 'Bob', text: 'When one option is positive on all three, I will not fight it. Email recovery.' },
      { name: 'Alice', text: 'Locking in Email-Based Recovery.' },
    ],
    group: { optionId: 'c8-opt3', rationale: 'Email-Based Recovery is positive on Usability, Security and Maintainability with no negative anywhere — the cleanest balance for account protection.' },
  },
  'concern-9': {
    players: [
      { name: 'Chen', optionId: 'c9-opt1', rationale: 'Hosting ads internally gives Performance + and Security +, full control over what is served.', say: 'Internal ads: Performance + and Security +.' },
      { name: 'Diana', optionId: 'c9-opt2', rationale: '3rd-party ad platform is Maintainability +, almost no work for us — but Performance -.', say: '3rd-party ads = Maintainability +, least effort.' },
      { name: 'Bob', optionId: 'c9-opt3', rationale: 'The hybrid is Security + AND Usability +, with no negatives. Best blend of control and reach.', say: 'Hybrid is + on Security and Usability, neutral elsewhere.' },
      { name: 'Alice', optionId: 'c9-opt3', rationale: 'Hybrid keeps Security + and Usability + with no Performance or Maintainability penalty.', say: 'Hybrid — positive where it counts, negative nowhere.' },
    ],
    chat: [
      { name: 'Diana', text: '3rd-party is easiest, but Performance - and zero control over ad quality.' },
      { name: 'Bob', text: 'The hybrid gets Security + and Usability + with no downside columns.' },
      { name: 'Chen', text: 'I can drop pure-internal for that — hybrid keeps my Performance concern neutral, not negative.' },
      { name: 'Alice', text: 'Hybrid Approach it is.' },
    ],
    group: { optionId: 'c9-opt3', rationale: 'Hybrid Approach: Security + and Usability + with neutral Performance and Maintainability — premium control where it matters, outsourced reach where it does not.' },
  },
  'concern-10': {
    players: [
      { name: 'Chen', optionId: 'c10-opt3', rationale: 'Native + Web is incredible: Usability ++, Performance ++, Availability ++, Security +. Best possible UX — and our cloud storage decisions freed up the maintenance budget to do this.', say: 'Native + Web is ++ on Usability, Performance AND Availability — and we have the maintenance budget now.' },
      { name: 'Diana', optionId: 'c10-opt3', rationale: 'Native Maintainability -- looked scary earlier, but cloud storage gave us Maintainability ++ on both concern-1 and concern-2. We have the headroom for native now.', say: 'Cloud gave us Maintainability ++ twice. We can absorb native apps.' },
      { name: 'Bob', optionId: 'c10-opt3', rationale: 'Native apps: Performance ++ and Availability ++ hit the exact priorities of User (2) and Owner (2). Our cloud decisions gave us the maintenance runway to afford this.', say: 'Cloud freed our maintenance budget. Native gives Performance ++ and Availability ++.' },
      { name: 'Alice', optionId: 'c10-opt3', rationale: 'Native Mobile + Web: Performance ++, Availability ++ and Usability ++. The best UX we can give. Cloud decisions gave us the Maintainability headroom for this choice.', say: 'We earned the native option through smart cloud choices earlier.' },
    ],
    chat: [
      { name: 'Diana', text: 'Earlier I was worried about Maintainability -- for native, but cloud storage gave us ++ twice. The maths work now.' },
      { name: 'Bob', text: 'Performance ++ and Availability ++ — both things the User and Owner rate at 2. Hard to pass up.' },
      { name: 'Chen', text: 'And Usability ++ keeps users happy. Every core metric goes up.' },
      { name: 'Alice', text: 'Native Mobile + Web. Our cloud decisions bought us this.' },
    ],
    group: { optionId: 'c10-opt3', rationale: 'Native Mobile + Web: Performance ++, Availability ++ and Usability ++ hit every priority for both stakeholders; the Maintainability -- is offset by the ++ saved on cloud article and operational storage.' },
  },
  'concern-21': {
    players: [
      { name: 'Bob', optionId: 'c21-opt2', rationale: 'Full encryption is Security ++ — non-negotiable for sensitive data in transit and at rest.', say: 'Full encryption: Security ++. For sensitive data, mandatory.' },
      { name: 'Chen', optionId: 'c21-opt1', rationale: 'No encryption is Performance ++... but Security -- makes it indefensible for this data.', say: 'No-encryption is Performance ++ but Security -- — I cannot really argue it.' },
      { name: 'Diana', optionId: 'c21-opt3', rationale: 'Transmission-only encryption is Security + for only Performance -, a lighter footprint than full.', say: 'Transmission-only: Security + for a smaller Performance hit.' },
      { name: 'Alice', optionId: 'c21-opt3', rationale: 'Encrypt-in-transit gives Security + with only Performance -, avoiding full encryption’s Performance --.', say: 'Transmit-encrypted balances Security + against a single Performance -.' },
    ],
    chat: [
      { name: 'Bob', text: 'Full encryption is safest, but Performance -- across the whole system is steep.' },
      { name: 'Diana', text: 'Transmission-only still gets Security + and only costs Performance -.' },
      { name: 'Bob', text: 'Given we already store sensitive data locally, encrypting in transit is a reasonable balance. Agreed.' },
      { name: 'Alice', text: 'Encryption for Transmission — Security + without the full Performance penalty.' },
    ],
    group: { optionId: 'c21-opt3', rationale: 'Encryption for Transmission Only earns Security + for just a single Performance -, avoiding the system-wide Performance -- of full encryption.' },
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
  return deck?.classic.concerns.find((c) => c.id === id) || null;
}

let a; // host socket, created in main() after the server is confirmed up

async function main() {
  await ensureServer();
  a = new WebSocket(`ws://${HOST}/ws?action=create&name=${HOST_NAME}&version=classic`);
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
    console.log('  DecidArch — CLASSIC demo  (Social News Platform)');
    console.log(`  ROOM CODE:     ${roomCode}`);
    console.log(`  SPECTATE LINK: http://${HOST}/room/${roomCode}?spectate=1`);
    console.log(`  Kickoff in ~${Math.round(LEAD / 1000)}s — open the link to watch live.`);
    console.log('============================================================\n');
    return;
  }

  if (msg.type === 'card-data') {
    deck = msg.payload;
    log('Card data received. Seating the rest of the architects…');
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
  if (state.gameVersion !== 'classic' || !deck) return;
  const concern = currentConcern(state);
  const tag = `${state.phase}-${state.currentConcernIndex}`;

  switch (state.phase) {
    case 'individual-prep': {
      if (acted.has(`prep-${state.currentConcernIndex}`)) break;
      acted.add(`prep-${state.currentConcernIndex}`);

      if (roundsdoneReached()) return wrapUp(state);
      if (!concern) break;

      // Intro chat goes here (not in the lobby, where the chat panel isn't shown).
      if (!acted.has('intro')) {
        acted.add('intro');
        await chat(HOST_NAME, 'Welcome team! Project: the Social News Platform. Two stakeholders to keep happy — the User (Usability, Performance) and the Owner (Availability, Maintainability), with Security underpinning both.');
        await chat(HOST_NAME, 'Each round: we each file a private design proposal, reveal them, debate, then agree on one. Let us begin.');
        await wait(5000); // give spectators time to read the deal card and tooltips
      }

      const entry = PLAYBOOK[concern.id];
      log(`\n=== ROUND ${roundsdone + 1} — Concern ${state.currentConcernIndex + 1}/${state.concernOrder.length}: ${concern.title} ===`);
      log(`   ${concern.description}`);
      await wait(STEP);
      await chat(HOST_NAME, `Round ${roundsdone + 1}: "${concern.title}". ${concern.description} File your proposals when ready.`);

      for (const p of entry.players) {
        await wait(STEP * 0.4);
        send(sockets[p.name], 'submit-decision', { optionId: p.optionId, rationale: p.rationale });
        const optName = optionName(concern, p.optionId);
        log(`   ✍️  ${p.name} proposes "${optName}"`);
        await chat(p.name, p.say);
      }
      break;
    }

    case 'reveal': {
      if (acted.has(tag)) break;
      acted.add(tag);
      await wait(STEP);
      log('   📋 All proposals revealed — opening discussion.');
      await chat(HOST_NAME, 'All proposals are in. Let us compare the impact tables and talk it through.');
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

      await wait(STEP * 0.6);
      send(a, 'select-group-option', { optionId: entry.group.optionId });
      const optName = optionName(concern, entry.group.optionId);
      log(`   👉 Group highlights "${optName}".`);

      // Stream the rationale so spectators see the host "typing".
      const r = entry.group.rationale;
      for (let i = 6; i <= r.length; i += 6) {
        send(a, 'update-group-draft', { rationale: r.slice(0, i) });
        await wait(160);
      }
      send(a, 'update-group-draft', { rationale: r });

      await wait(STEP);
      send(a, 'submit-group-decision', { optionId: entry.group.optionId, rationale: r });
      roundsdone += 1;
      log(`   ✅ Group locks in "${optName}".`);
      await chat(HOST_NAME, `Recorded: ${optName}. Nice work, team.`);
      break;
    }

    case 'event': {
      if (acted.has(tag)) break;
      acted.add(tag);
      const ev = deck.classic.events.find((e) => e.id === state.activeEventId);
      await wait(STEP);
      log(`   ⚡ EVENT: ${ev?.title} — ${ev?.effect}`);
      await chat(HOST_NAME, `⚡ Event card! ${ev?.title}: ${ev?.effect}`);
      await wait(STEP * 0.6);
      send(a, 'advance-phase'); // -> event-revision
      break;
    }

    case 'event-revision': {
      if (acted.has(tag)) break;
      acted.add(tag);
      await wait(STEP);
      // If "Fire!" banned single local databases, revise any local-DB choice to distributed.
      const banned = state.activeEventId === 'event-fire';
      const toFix = banned
        ? state.groupDecisions.find((d) => /^(c1|c2|c3)-opt3$/.test(d.optionId))
        : null;
      if (toFix) {
        const fixedOpt = toFix.optionId.replace('-opt3', '-opt1');
        const c = deck.classic.concerns.find((cc) => cc.id === toFix.concernId);
        const rationale = `Fire policy bans single local databases — switching "${toFix.concernTitle}" to ${optionName(c, fixedOpt)} to stay compliant while keeping Security viable.`;
        await chat(HOST_NAME, `The fire policy forces a revision on "${toFix.concernTitle}". Moving it off the local database.`);
        send(a, 'revise-decision', { concernId: toFix.concernId, optionId: fixedOpt, rationale });
        log(`   🔧 Revised "${toFix.concernTitle}" → ${optionName(c, fixedOpt)}`);
        await wait(STEP);
      } else {
        await chat(HOST_NAME, 'No earlier decision needs revising after that event. Carrying on.');
      }
      send(a, 'skip-revision');
      break;
    }

    case 'scoring':
    case 'finished': {
      if (acted.has('done')) break;
      acted.add('done');
      const s = state.score;
      await chat(HOST_NAME, `That is the full design! Final grade: ${s?.grade}, score ${s?.finalScore}. Thanks for playing!`);
      console.log('\n============================================================');
      console.log(`  GAME OVER — grade: ${s?.grade}, final score: ${s?.finalScore}`);
      console.log(`  Spectate link stays live: http://${HOST}/room/${roomCode}?spectate=1`);
      console.log('============================================================\n');
      await wait(120000);
      process.exit(0);
    }
  }
}

function roundsdoneReached() {
  return roundsdone >= MAX_ROUNDS;
}
function optionName(concern, optionId) {
  return concern?.designOptions.find((o) => o.id === optionId)?.name || optionId;
}

let wrappedUp = false;
async function wrapUp(state) {
  if (wrappedUp) return;
  wrappedUp = true;
  await wait(STEP);
  await chat(HOST_NAME, `That wraps up our preview of DecidArch Classic! A full game runs through all ${state.concernOrder.length} concerns and an event or two, then scores how well we satisfied every stakeholder.`);
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
