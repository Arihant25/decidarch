# DecidArch

![DecidArch screenshot](./screenshot.png)

A real-time, multiplayer card game that teaches **software architecture decision-making**. A
team of "architects" works through a series of design *concerns*, weighs the trade-offs, agrees
on a decision for each, and rides out *events* that change the requirements underneath them —
then gets scored on how well the final design served its stakeholders.

It ships with two modes:

| Mode | Project | You balance | A decision is… |
| --- | --- | --- | --- |
| **Classic** | Social News Platform | Quality attributes (Performance, Security, Availability, Usability, Maintainability…) | picking one of the listed design options |
| **Ethics-Aware** | Library Management System | Human values (Privacy, Fairness, Welfare, Freedom, Dignity…) | writing a safeguard and rating its impact on each value |

Everything is played in the browser, in real time, over a single WebSocket — and that same
WebSocket is a fully documented **API**, so AI agents or scripts can play a complete game too,
while anyone watches live.

---

## Getting started

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Create a room, share the code (or the room link), and once two or
more players have joined, the host starts the game.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the custom server (Next.js + WebSocket) via `tsx server.ts` |
| `npm run build` | Production build (`next build`) |
| `npm run start` | Run the production server |
| `npm run lint` | ESLint |

> The app uses a **custom Node server** (`server.ts`) rather than `next dev`, because the
> WebSocket endpoint (`/ws`) is attached to the same HTTP server that serves the Next.js app.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home — create or join a game |
| `/rules` | How to play (Classic & Ethics) |
| `/docs` | **API reference** for driving a game over WebSocket |
| `/room/[code]` | The live game board |
| `/room/[code]?spectate=1` | Watch a game read-only (see below) |

---

## Playing programmatically (the API)

The entire game is driven over one WebSocket at `ws://<host>/ws`. There's no REST API and no
authentication — if you can open a WebSocket and send JSON, you can play. The full, plain-English
reference (with diagrams and a worked example) lives at **[`/docs`](http://localhost:3000/docs)**.

The essentials:

- **Create / join via the connection URL**
  - `…/ws?action=create&name=Alice&version=classic` → you're the host; you get a `room-created`
    message with the room code.
  - `…/ws?action=join&name=Bob&room=ABC123` → join an existing room.
- **The server is the referee.** After every action it broadcasts the entire `game-state`
  object — your single source of truth. React to `game-state.phase` and send the next action.
- **Two conveniences for programs:**
  - `get-card-data` returns the full deck for both modes, so you can turn the IDs in `game-state`
    (concerns, options, events) into readable cards with their effects.
  - When the game ends, the final `game-state` includes a computed `score` — you never have to
    re-implement the scoring rules.

A game needs at least two players and one host. To have a single agent play solo, just open two
connections and control both seats.

### Demo scripts

The `demo/` folder has two self-contained, **recordable** demo scripts — one per game mode. Each
seats **four bot players** with distinct perspectives who file individual proposals with real
reasoning, debate in the chat, and reach a group decision over the API, slowly enough to film:

```bash
node demo/classic-demo.mjs   # Classic — Social News Platform (architecture trade-offs)
node demo/ethics-demo.mjs    # Ethics-Aware — Library Management System ("Modesty" dilemma)
```

Each script creates a room, prints a spectate link, brings in the other three players, then plays
**one full round** like a real table: private proposals → reveal → chat discussion → a streamed
group rationale (and, in ethics mode, live per-value impact ratings). Open the printed spectate
link in a browser before kickoff to watch and record.

```bash
# Play the whole game through to a final score instead of one round:
ROUNDS=all node demo/classic-demo.mjs

# Tunables (env vars): HOST=localhost:3000 STEP_MS=4500 LEAD_MS=18000 ROUNDS=1
```

---

## Spectator mode

Anyone can watch any game live in the browser — even games being played by agents through the API,
and even after a game has already started:

```
/room/<CODE>?spectate=1
```

- **No seat, no name, no limit** — spectators don't take a chair and don't count toward the
  player total.
- **Strictly read-only** — enforced on the server; spectators can watch every card, decision and
  event but can't change anything.
- A **"Watch as spectator"** option also appears in the browser if you try to join a game that's
  already in progress.

To make a spectator view show live typing and option highlights as an agent "thinks", have the
agent send `update-group-draft` and `select-group-option` as it goes (the demo scripts do this).

---

## How scoring works

- **Classic** — each chosen option has `+`/`-` effects on quality attributes. Add them up per
  attribute; any attribute that ends up negative loses the game, and every stakeholder's
  priorities must be met. Your final score is how far you exceeded everyone's needs
  (Sufficient → Good → Very Good → Excellent).
- **Ethics** — for each value, multiply how much it matters by the total impact your decisions had
  on it, summed across stakeholders (Reflection Needed → … → Excellent).

The scoring logic is authoritative in `src/lib/scoring.ts` and delivered to clients in the
end-of-game `game-state`.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**, TypeScript throughout
- **Custom HTTP server** (`server.ts`) with a **`ws`** WebSocket on `/ws`
- **In-memory rooms** (`src/lib/roomManager.ts`) — ephemeral, auto-expiring (no database)
- **Mermaid** for the rendered diagrams on the docs page
- **Motion** for animations, **Lucide** for icons

## Project structure

```
server.ts                     Custom Next.js + WebSocket server
src/
  app/
    page.tsx                  Home (create/join)
    rules/                    How to play
    docs/                     API reference (WebSocket), with Mermaid diagrams
    room/[code]/              Game board + spectator mode
  components/
    game/                     Phase UIs (IndividualPrep, GroupDecision, EventPhase, ScoreBoard…)
    lobby/                    Waiting room
    docs/                     Mermaid renderer
  context/GameContext.tsx     Client game state + WebSocket actions
  hooks/useSocket.ts          WebSocket connection hook
  lib/
    types.ts                  Shared types + WebSocket message protocol
    gameEngine.ts             Pure game state machine
    scoring.ts                Score calculation (classic + ethics)
    socketManager.ts          WebSocket message handling
    roomManager.ts            In-memory room store
    cardData.ts               Classic deck
    cardDataEthics.ts         Ethics deck
demo/
  classic-demo.mjs            4-bot Classic demo / spectator showcase
  ethics-demo.mjs             4-bot Ethics-Aware demo / spectator showcase
```
