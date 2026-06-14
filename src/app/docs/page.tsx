import Link from 'next/link';
import type { Metadata } from 'next';
import { Mermaid } from '@/components/docs/Mermaid';
import styles from './docs.module.css';

export const metadata: Metadata = {
  title: 'API Docs — DecidArch',
  description:
    'A plain-English guide to driving DecidArch over WebSocket, so an AI agent (or any program) can play a full game in either mode — and anyone can watch it live.',
};

const TOC: ReadonlyArray<readonly [string, string, string]> = [
  ['overview', '01', 'Start here'],
  ['connecting', '02', 'Connect to a game'],
  ['flow', '03', 'How a game flows'],
  ['send', '04', 'Messages you send'],
  ['receive', '05', 'Messages you get'],
  ['modes', '06', 'Classic vs Ethics'],
  ['cards', '07', 'Reading the cards'],
  ['scoring', '08', 'How scoring works'],
  ['spectate', '09', 'Watch it live'],
  ['example', '10', 'A full game, step by step'],
];

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      {/* Top drafting strip */}
      <header className={styles.topbar}>
        <span className={styles.topbarCell}>DWG NO. A-103</span>
        <span className={styles.topbarCell}>DECIDARCH — API REFERENCE</span>
        <span className={styles.topbarCellWide} aria-hidden="true" />
        <Link href="/" className={styles.topbarLink}>
          ← BACK TO DRAFTING TABLE
        </Link>
        <span className={styles.topbarCellAccent}>WEBSOCKET</span>
      </header>

      <div className={styles.body}>
        {/* Left table-of-contents rail */}
        <nav className={styles.sidebar} aria-label="Table of contents">
          <p className={styles.sidebarTitle}>ON THIS PAGE</p>
          {TOC.map(([id, num, label]) => (
            <a key={id} href={`#${id}`} className={styles.sideLink}>
              <span className={styles.sideNum}>{num}</span>
              {label}
            </a>
          ))}
        </nav>

        {/* Scroll container — anchor jumps scroll this, so you can always return to the top */}
        <div className={styles.scroll}>
          <main className={styles.main}>
            <div className={styles.header}>
              <h1 className={styles.title}>API REFERENCE</h1>
              <p className={styles.subtitle}>
                DecidArch is normally played by people in a browser. This page explains how a
                program — an AI agent, a bot, a script — can play the exact same game over a
                WebSocket connection. If you can open a WebSocket and send JSON, you can play.
              </p>
              <nav className={styles.tocMobile} aria-label="Sections">
                {TOC.map(([id, , label]) => (
                  <a key={id} href={`#${id}`} className={styles.tocChip}>
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            {/* ─────────────── 01 Overview ─────────────── */}
            <section id="overview" className={styles.section}>
              <span className={styles.sectionLabel}>01 — START HERE</span>
              <h2 className={styles.sectionTitle}>The whole idea in 30 seconds</h2>
              <p className={styles.lead}>
                You connect to one address. You send small JSON messages to take actions
                (&ldquo;I choose option B&rdquo;). The server replies by sending everyone the
                full, up-to-date game in a single object. You read that object, decide your next
                move, and repeat — until the game ends and you get a score.
              </p>
              <div className={styles.prose}>
                <p>Three things worth knowing up front:</p>
                <ul>
                  <li>
                    <strong>There&apos;s no login and no REST API.</strong> Everything happens
                    over a single WebSocket at <code className={styles.code}>/ws</code>. If you
                    can reach the server, you can play.
                  </li>
                  <li>
                    <strong>The server is the referee.</strong> You never track the game
                    yourself — after every action the server sends a fresh{' '}
                    <code className={styles.code}>game-state</code> object that is the single
                    source of truth. Just read the latest one.
                  </li>
                  <li>
                    <strong>A game needs at least 2 players, and one of them is the host.</strong>{' '}
                    The host is the player who created the room, and only the host can move the
                    game forward at certain points. Want one agent to play alone? Just open two
                    connections and control both seats — the host one drives, the other fills the
                    second chair.
                  </li>
                </ul>
                <div className={styles.callout}>
                  <strong>Two conveniences built for programs:</strong>{' '}
                  <code className={styles.code}>get-card-data</code> hands you the full deck of
                  cards (so you know what the options are and what they do), and the final{' '}
                  <code className={styles.code}>score</code> is delivered to you automatically when
                  the game ends — you never have to compute it.
                </div>
              </div>
            </section>

            {/* ─────────────── 02 Connecting ─────────────── */}
            <section id="connecting" className={styles.section}>
              <span className={styles.sectionLabel}>02 — CONNECT TO A GAME</span>
              <h2 className={styles.sectionTitle}>Open a connection</h2>
              <p className={styles.lead}>
                Connect to <code className={styles.code}>ws://&lt;host&gt;/ws</code> (use{' '}
                <code className={styles.code}>wss://</code> on HTTPS). The easiest way to create or
                join a room is to put a few parameters right in the URL.
              </p>
              <div className={styles.prose}>
                <h3 className={styles.subTitle}>Start a brand-new game</h3>
                <p>
                  Add <code className={styles.code}>action=create</code>, your name, and which mode
                  you want. You become the host. The server immediately tells you the room code.
                </p>
                <pre className={styles.pre}>{`ws://localhost:3000/ws?action=create&name=Alice&version=classic
//                                              └ "classic" or "ethics"

// You'll receive, in order:
//   { "type": "room-created", "payload": { "roomCode": "ABC123", "playerId": "…" } }
//   { "type": "game-state",   "payload": { …the game… } }`}</pre>

                <h3 className={styles.subTitle}>Join a game that already has a room code</h3>
                <p>
                  Use <code className={styles.code}>action=join</code> with the room code. Everyone
                  in a room must have a different name.
                </p>
                <pre className={styles.pre}>{`ws://localhost:3000/ws?action=join&name=Bob&room=ABC123

// You'll receive:
//   { "type": "joined", "payload": { "playerId": "…", "gameState": { … } } }`}</pre>

                <div className={styles.callout}>
                  <strong>Keep your <code className={styles.code}>playerId</code>.</strong> It&apos;s
                  how the server knows which seat is yours. If you drop off, just reconnect with the
                  same name and you&apos;ll get your seat back.
                </div>
              </div>
            </section>

            {/* ─────────────── 03 Flow ─────────────── */}
            <section id="flow" className={styles.section}>
              <span className={styles.sectionLabel}>03 — HOW A GAME FLOWS</span>
              <h2 className={styles.sectionTitle}>The shape of a turn</h2>
              <p className={styles.lead}>
                A game is a series of <strong>concerns</strong> (decisions to make). For each
                concern, everyone privately proposes an answer, the proposals are revealed, the
                team agrees on one, and the host locks it in. Every 4th concern, an{' '}
                <strong>event</strong> shakes things up. After the last concern, you get a score.
              </p>
              <div className={styles.prose}>
                <p>
                  The current step is always in <code className={styles.code}>game-state.phase</code>.
                  Here&apos;s the loop, and who does what:
                </p>
                <Mermaid
                  caption="The phase loop. Edge labels show who acts and what they send."
                  chart={`flowchart TD
  L(["lobby"]) -->|"host: start-game"| P["individual-prep"]
  P -->|"everyone submits a decision"| R["reveal"]
  R -->|"host: advance-phase"| G["group-decision"]
  G -->|"host: submit-group-decision"| D{"every 4th concern?"}
  D -->|"no"| N{"more concerns left?"}
  N -->|"yes"| P
  N -->|"no"| S(["scoring / finished"])
  D -->|"yes"| E["event"]
  E -->|"host: advance-phase"| V["event-revision (classic only)"]
  V -->|"revise / skip-revision"| N`}
                />
                <p>A few rules that trip people up:</p>
                <ul>
                  <li>
                    <strong>individual-prep advances by itself.</strong> The moment every connected
                    player has submitted, the server jumps to <code className={styles.code}>reveal</code>.
                    If you control multiple seats, submit for all of them.
                  </li>
                  <li>
                    <strong>Only the host moves things forward</strong> at{' '}
                    <code className={styles.code}>reveal</code>,{' '}
                    <code className={styles.code}>group-decision</code>, and events. Non-host players
                    just submit their own proposals and wait.
                  </li>
                  <li>
                    <strong>Ethics mode has no revision step.</strong> After an event, the host sends
                    one <code className={styles.code}>advance-phase</code> and play continues.
                  </li>
                </ul>
              </div>
            </section>

            {/* ─────────────── 04 Client messages ─────────────── */}
            <section id="send" className={styles.section}>
              <span className={styles.sectionLabel}>04 — MESSAGES YOU SEND</span>
              <h2 className={styles.sectionTitle}>Your actions</h2>
              <p className={styles.lead}>
                Every message is JSON shaped like{' '}
                <code className={styles.code}>{'{ "type": "…", "payload": { … } }'}</code>. Actions
                tagged <span className={`${styles.badge} ${styles.badgeHost}`}>host</span> only work
                if you&apos;re the host; others are politely ignored.
              </p>
              <div className={styles.prose}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Send this</th>
                        <th>payload</th>
                        <th>Who</th>
                        <th>What it does</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>start-game</code></td>
                        <td><code>{'{}'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Begins the game right away (needs 2+ players).</td>
                      </tr>
                      <tr>
                        <td><code>start-countdown</code></td>
                        <td><code>{'{}'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Same, but with a 3-2-1 countdown first.</td>
                      </tr>
                      <tr>
                        <td><code>submit-decision</code></td>
                        <td><code>{'{ optionId, rationale }'}</code></td>
                        <td>any</td>
                        <td>Your private proposal for the current concern.</td>
                      </tr>
                      <tr>
                        <td><code>advance-phase</code></td>
                        <td><code>{'{}'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Move from reveal → group-decision, or trigger an event&apos;s effect.</td>
                      </tr>
                      <tr>
                        <td><code>submit-group-decision</code></td>
                        <td><code>{'{ optionId, rationale, valueImpacts? }'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Locks in the team&apos;s answer and goes to the next concern.</td>
                      </tr>
                      <tr>
                        <td><code>revise-decision</code></td>
                        <td><code>{'{ concernId, optionId, rationale }'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>(Classic events) Change a past answer. You can do this more than once.</td>
                      </tr>
                      <tr>
                        <td><code>skip-revision</code></td>
                        <td><code>{'{}'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Finish revising and continue.</td>
                      </tr>
                      <tr>
                        <td><code>get-card-data</code></td>
                        <td><code>{'{}'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeAny}`}>any</span></td>
                        <td>Ask for the full deck of cards (see §07). Reply comes only to you.</td>
                      </tr>
                      <tr>
                        <td><code>chat-message</code></td>
                        <td><code>{'{ text }'}</code></td>
                        <td>any</td>
                        <td>Say something in the room chat.</td>
                      </tr>
                      <tr>
                        <td><code>select-group-option</code> · <code>update-group-draft</code></td>
                        <td>see types</td>
                        <td>any</td>
                        <td>Optional &ldquo;live&rdquo; signals — highlight an option, or stream what
                          you&apos;re typing — so watchers see it happen in real time.</td>
                      </tr>
                      <tr>
                        <td><code>kick-player</code></td>
                        <td><code>{'{ playerId }'}</code></td>
                        <td><span className={`${styles.badge} ${styles.badgeHost}`}>host</span></td>
                        <td>Remove someone from the room.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  In <strong>classic</strong> mode, <code className={styles.code}>optionId</code> is one
                  of the option IDs from the current concern&apos;s card. In <strong>ethics</strong>{' '}
                  mode there are no fixed options, so you send{' '}
                  <code className={styles.code}>optionId: &quot;&quot;</code> and put your answer in{' '}
                  <code className={styles.code}>rationale</code> (plus{' '}
                  <code className={styles.code}>valueImpacts</code> on the group decision — see §06).
                </p>
              </div>
            </section>

            {/* ─────────────── 05 Server messages ─────────────── */}
            <section id="receive" className={styles.section}>
              <span className={styles.sectionLabel}>05 — MESSAGES YOU GET</span>
              <h2 className={styles.sectionTitle}>What the server sends back</h2>
              <p className={styles.lead}>
                The one you&apos;ll care about most is <code className={styles.code}>game-state</code>:
                it arrives after every change and contains the entire game. The rest are smaller
                notifications.
              </p>
              <div className={styles.prose}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>You receive</th>
                        <th>payload</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>game-state</code></td>
                        <td>the whole game <code>{'(+ score at the end)'}</code></td>
                        <td>After anything changes. Your source of truth.</td>
                      </tr>
                      <tr>
                        <td><code>room-created</code></td>
                        <td><code>{'{ roomCode, playerId }'}</code></td>
                        <td>After you create a room.</td>
                      </tr>
                      <tr>
                        <td><code>joined</code></td>
                        <td><code>{'{ playerId, gameState }'}</code></td>
                        <td>After you join a room.</td>
                      </tr>
                      <tr>
                        <td><code>card-data</code></td>
                        <td><code>{'{ gameVersion, classic, ethics }'}</code></td>
                        <td>Reply to your <code>get-card-data</code>.</td>
                      </tr>
                      <tr>
                        <td><code>countdown</code></td>
                        <td><code>{'{ count }'}</code></td>
                        <td>3, 2, 1 before a countdown start.</td>
                      </tr>
                      <tr>
                        <td><code>player-joined</code> · <code>player-left</code> · <code>player-kicked</code></td>
                        <td><code>{'{ player | playerId }'}</code></td>
                        <td>Someone came or went.</td>
                      </tr>
                      <tr>
                        <td><code>chat-message</code></td>
                        <td>a chat message</td>
                        <td>Someone (or the system) said something.</td>
                      </tr>
                      <tr>
                        <td><code>error</code></td>
                        <td><code>{'{ message }'}</code></td>
                        <td>Your last action wasn&apos;t allowed.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className={styles.subTitle}>The fields of game-state you&apos;ll actually use</h3>
                <pre className={styles.pre}>{`{
  phase: "individual-prep" | "reveal" | "group-decision"
       | "event" | "event-revision" | "scoring" | "finished" | "lobby",
  gameVersion: "classic" | "ethics",
  players: [{ id, name, connected, isHost }],

  currentConcernIndex: 0,          // which concern you're on
  concernOrder: ["concern-3", …],  // the concern IDs, in this game's order
  activeEventId: "event-new-cto",  // set during an event

  // What each player privately proposed this round (keyed by player id):
  individualDecisions: { "<id>": { optionId, rationale, playerName } },

  // The team's locked-in answers so far (one per finished concern):
  groupDecisions: [{ concernId, optionId, optionName, rationale, valueImpacts? }],

  score: { … }   // only appears once the game is over (see §08)
}`}</pre>
                <div className={styles.callout}>
                  Notice the game gives you <strong>IDs</strong> (like{' '}
                  <code className={styles.code}>concern-3</code> or{' '}
                  <code className={styles.code}>c1-opt2</code>), not the card text. To turn an ID into
                  a readable card with its options and effects, ask once for the deck with{' '}
                  <code className={styles.code}>get-card-data</code> (§07) and look it up.
                </div>
              </div>
            </section>

            {/* ─────────────── 06 Modes ─────────────── */}
            <section id="modes" className={styles.section}>
              <span className={styles.sectionLabel}>06 — CLASSIC vs ETHICS</span>
              <h2 className={styles.sectionTitle}>Two ways to play</h2>
              <p className={styles.lead}>
                Same flow, different kind of decision. In <strong>classic</strong> you pick from
                ready-made options. In <strong>ethics</strong> you write your own answer and rate how
                it affects people&apos;s values.
              </p>
              <div className={styles.prose}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Classic</th>
                        <th>Ethics</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>The project</strong></td>
                        <td>A Social News Platform</td>
                        <td>A Library Management System</td>
                      </tr>
                      <tr>
                        <td><strong>You&apos;re balancing</strong></td>
                        <td>Quality attributes (Performance, Security, Availability, Usability, Maintainability…)</td>
                        <td>Human values (Privacy, Fairness, Welfare, Freedom, Dignity…)</td>
                      </tr>
                      <tr>
                        <td><strong>A decision is</strong></td>
                        <td>Pick one of the listed options (each has fixed effects)</td>
                        <td>Write a safeguard in your own words</td>
                      </tr>
                      <tr>
                        <td><strong>Group decision payload</strong></td>
                        <td><code>{'{ optionId, rationale }'}</code></td>
                        <td><code>{'{ optionId: "", rationale, valueImpacts }'}</code></td>
                      </tr>
                      <tr>
                        <td><strong>What an event does</strong></td>
                        <td>Changes how much a stakeholder cares about an attribute; lets you revise a past pick</td>
                        <td>Changes how much a value matters; no revision step</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong>About <code className={styles.code}>valueImpacts</code> (ethics only):</strong>{' '}
                  when the host locks in the team&apos;s answer, they also rate how that answer affects
                  each relevant value, using <code className={styles.code}>&quot;++&quot;</code>,{' '}
                  <code className={styles.code}>&quot;+&quot;</code>,{' '}
                  <code className={styles.code}>&quot;-&quot;</code>, or{' '}
                  <code className={styles.code}>&quot;--&quot;</code>:
                </p>
                <pre className={styles.pre}>{`"valueImpacts": { "Privacy": "++", "Fairness": "+", "Welfare": "-" }`}</pre>
                <p>
                  Those symbols are worth <code className={styles.code}>+2 / +1 / -1 / -2</code> (and{' '}
                  <code className={styles.code}>&quot;=&quot;</code> is 0). The same symbols describe the
                  fixed effects of classic options.
                </p>
              </div>
            </section>

            {/* ─────────────── 07 Cards ─────────────── */}
            <section id="cards" className={styles.section}>
              <span className={styles.sectionLabel}>07 — READING THE CARDS</span>
              <h2 className={styles.sectionTitle}>Turn IDs into real cards</h2>
              <p className={styles.lead}>
                Send <code className={styles.code}>{'{ "type": "get-card-data" }'}</code> any time —
                even before joining. You get the complete deck for both modes, so you can look up any
                ID you see in the game.
              </p>
              <div className={styles.prose}>
                <pre className={styles.pre}>{`// the "card-data" reply:
{
  gameVersion: "classic",          // the mode of the room you're in, if any
  classic: {
    project,
    stakeholders: [{ id, name, role, priorities: [{ attribute, importance }] }],
    concerns:     [{ id, title, description,
                     designOptions: [{ id, name, description,
                                       impacts: { Performance: "+", Security: "-", … } }] }],
    events:       [{ id, title, description, effect }]
  },
  ethics: {
    project,
    stakeholders:  [{ id, category, goal, values: [{ name, importance }] }],
    ethicalValues: [{ id, valueName, definition }],
    concerns:      [{ id, title, description, safeguardHint, affectedValues: [] }],
    events:        [{ id, title, description, consequence, affectedValue, newImportance }]
  }
}`}</pre>
                <p>So a typical &ldquo;what are my options right now?&rdquo; lookup is:</p>
                <pre className={styles.pre}>{`const id = state.concernOrder[state.currentConcernIndex];  // e.g. "concern-3"
const concern = deck.classic.concerns.find(c => c.id === id);
// → concern.designOptions: the optionIds you can submit, and what each one does`}</pre>
              </div>
            </section>

            {/* ─────────────── 08 Scoring ─────────────── */}
            <section id="scoring" className={styles.section}>
              <span className={styles.sectionLabel}>08 — HOW SCORING WORKS</span>
              <h2 className={styles.sectionTitle}>Winning, losing, and the grade</h2>
              <p className={styles.lead}>
                You don&apos;t calculate anything. When the game ends, the final{' '}
                <code className={styles.code}>game-state</code> includes a{' '}
                <code className={styles.code}>score</code> object with the result. Here&apos;s what
                it&apos;s measuring.
              </p>
              <div className={styles.prose}>
                <h3 className={styles.subTitle}>Classic</h3>
                <ul>
                  <li>Add up the <code>+</code>/<code>-</code> effects of all your chosen options, per attribute.</li>
                  <li>If any attribute ends up <strong>negative</strong>, you lose (the system is broken).</li>
                  <li>Each stakeholder needs their priorities met. If one isn&apos;t, you lose.</li>
                  <li>Otherwise your <strong>final score</strong> is how far you exceeded everyone&apos;s needs. Grades: <code>0–9</code> Sufficient, <code>10–19</code> Good, <code>20–29</code> Very Good, <code>30+</code> Excellent.</li>
                </ul>
                <h3 className={styles.subTitle}>Ethics</h3>
                <ul>
                  <li>For each value, multiply how much it matters by the total impact your decisions had on it.</li>
                  <li>Add those up across everyone. Grades: <code>&lt;0</code> Reflection Needed, <code>0–14</code> Sufficient, <code>15–29</code> Good, <code>30–44</code> Very Good, <code>45+</code> Excellent.</li>
                </ul>
                <p>
                  Either way, <code className={styles.code}>score.finalScore</code> and{' '}
                  <code className={styles.code}>score.grade</code> give you the headline; the rest of
                  the object breaks it down per attribute / value / stakeholder.
                </p>
              </div>
            </section>

            {/* ─────────────── 09 Spectate ─────────────── */}
            <section id="spectate" className={styles.section}>
              <span className={styles.sectionLabel}>09 — WATCH IT LIVE</span>
              <h2 className={styles.sectionTitle}>Spectate any game in the browser</h2>
              <p className={styles.lead}>
                Even when agents are playing through the API, anyone can open the room in a browser
                and watch the whole thing unfold — the same polished UI players see, updating live.
              </p>
              <div className={styles.prose}>
                <p>
                  Just open the room link with <code className={styles.code}>?spectate=1</code>:
                </p>
                <pre className={styles.pre}>{`http://localhost:3000/room/ABC123?spectate=1`}</pre>
                <ul>
                  <li><strong>No seat, no name, no limit.</strong> Spectators don&apos;t take a chair and don&apos;t count toward the player total — bring as many eyes as you like.</li>
                  <li><strong>Read-only.</strong> Spectators can watch every card, decision, and event, but can&apos;t change anything.</li>
                  <li><strong>Join any time</strong>, including after a game is already in progress. (The browser also offers a &ldquo;Watch as spectator&rdquo; button if you try to join a game that&apos;s already started.)</li>
                </ul>
                <div className={styles.callout}>
                  Want the spectator view to show live typing and option highlights as your agent
                  &ldquo;thinks&rdquo;? Have it send <code className={styles.code}>update-group-draft</code>{' '}
                  and <code className={styles.code}>select-group-option</code> as it goes — those stream
                  straight to every watcher.
                </div>
              </div>
            </section>

            {/* ─────────────── 10 Example ─────────────── */}
            <section id="example" className={styles.section}>
              <span className={styles.sectionLabel}>10 — A FULL GAME, STEP BY STEP</span>
              <h2 className={styles.sectionTitle}>One agent, two seats</h2>
              <p className={styles.lead}>
                Here&apos;s the simplest complete playthrough: one agent opens two connections — a
                host (<code className={styles.code}>A</code>) and a second player (
                <code className={styles.code}>B</code>) — and plays to the final score.{' '}
                <code className={styles.code}>→</code> is something you send,{' '}
                <code className={styles.code}>⮜</code> is something you receive.
              </p>
              <div className={styles.prose}>
                <h3 className={styles.subTitle}>Classic</h3>
                <Mermaid
                  caption="A complete classic game driven by one agent holding two seats."
                  chart={`sequenceDiagram
  participant A as Host Alice
  participant B as Player Bob
  participant S as Server
  A->>S: connect — create, classic
  S-->>A: room-created
  A->>S: get-card-data
  S-->>A: card-data — the deck
  B->>S: connect — join room
  A->>S: start-game
  S-->>A: game-state — individual-prep
  S-->>B: game-state — individual-prep
  loop each concern
    A->>S: submit-decision
    B->>S: submit-decision
    S-->>A: game-state — reveal
    A->>S: advance-phase
    S-->>A: game-state — group-decision
    A->>S: submit-group-decision
    S-->>A: game-state — next concern
  end
  Note over A,S: every 4th concern adds an event, then advance-phase
  S-->>A: game-state — scoring + score`}
                />

                <h3 className={styles.subTitle}>Ethics — only two things change</h3>
                <pre className={styles.pre}>{`// 1) The team's answer is written, and rates each value:
A: → submit-group-decision {
     optionId: "",
     rationale: "Let members opt into a privacy-preserving check",
     valueImpacts: { "Privacy": "++", "Fairness": "+", "Welfare": "-" }
   }

// 2) Events apply on a single advance-phase — there's no revision step:
both: ⮜ game-state { phase: "event", activeEventId: "…" }
A: → advance-phase
both: ⮜ game-state { phase: "individual-prep", … }`}</pre>
                <p>
                  And while any of this is happening, open{' '}
                  <code className={styles.code}>/room/ABC123?spectate=1</code> in a browser to watch it
                  live.
                </p>
              </div>
            </section>

            <div className={styles.footerActions}>
              <Link href="/" className={styles.backLink}>
                ← BACK TO DRAFTING TABLE
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
