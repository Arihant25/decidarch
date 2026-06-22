// ============================================================
// DecidArch LLM experiment — "table" (WebSocket seats)
// ============================================================
// Manages the agent seats as plain WebSocket clients against the
// game's PUBLIC API — exactly the protocol documented at /docs and
// used by demo/classic-demo.mjs. No game internals are touched.
//
// One seat is the host (action=create); the rest join. The host's
// broadcast stream is treated as the canonical game-state.

import WebSocket from 'ws';
import { GAME_HOST } from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Table {
  /**
   * @param seatNames first name is the host; the rest join in order.
   */
  constructor(seatNames, { log = () => {}, seed } = {}) {
    this.seatNames = seatNames;
    this.hostName = seatNames[0];
    this.log = log;
    this.seed = seed; // deterministic-deal seed (sent on the create URL)
    this.sockets = {}; // name -> ws
    this.playerIds = {}; // name -> playerId
    this.roomCode = null;
    this.deck = null;
    this.latestState = null;
    this._stateWaiters = []; // {predicate, resolve}
  }

  send(name, type, payload = {}) {
    const ws = this.sockets[name];
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }));
  }

  async chat(name, text) {
    this.send(name, 'chat-message', { text });
    this.log(`  💬 ${name}: ${text}`);
  }

  _onState(state) {
    this.latestState = state;
    const still = [];
    for (const w of this._stateWaiters) {
      if (w.predicate(state)) w.resolve(state);
      else still.push(w);
    }
    this._stateWaiters = still;
  }

  /** Resolve as soon as a broadcast game-state satisfies `predicate`. */
  waitState(predicate, { timeoutMs = 600000 } = {}) {
    if (this.latestState && predicate(this.latestState)) return Promise.resolve(this.latestState);
    return new Promise((resolve, reject) => {
      const w = { predicate, resolve };
      this._stateWaiters.push(w);
      setTimeout(() => {
        if (this._stateWaiters.includes(w)) {
          this._stateWaiters = this._stateWaiters.filter((x) => x !== w);
          reject(new Error('waitState timed out'));
        }
      }, timeoutMs);
    });
  }

  /** Create the room as host, fetch the deck, return the room code. */
  connectHost(version = 'classic') {
    return new Promise((resolve, reject) => {
      const seedParam = this.seed ? `&seed=${encodeURIComponent(this.seed)}` : '';
      const ws = new WebSocket(`ws://${GAME_HOST}/ws?action=create&name=${this.hostName}&version=${version}${seedParam}`);
      this.sockets[this.hostName] = ws;
      ws.on('error', reject);
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'room-created') {
          this.roomCode = msg.payload.roomCode;
          this.playerIds[this.hostName] = msg.payload.playerId;
          this.send(this.hostName, 'get-card-data');
        } else if (msg.type === 'card-data') {
          this.deck = msg.payload.classic;
          resolve(this.roomCode);
        } else if (msg.type === 'game-state') {
          this._onState(msg.payload);
        }
      });
    });
  }

  /** Join one non-host seat; resolves once seated. */
  connectPlayer(name) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${GAME_HOST}/ws?action=join&name=${name}&room=${this.roomCode}`);
      this.sockets[name] = ws;
      ws.on('error', reject);
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'joined') {
          this.playerIds[name] = msg.payload.playerId;
          resolve();
        }
      });
    });
  }

  async seatEveryone(version = 'classic') {
    await this.connectHost(version);
    for (const name of this.seatNames.slice(1)) await this.connectPlayer(name);
    // small settle so all joins register before start-game
    await sleep(300);
  }

  startGame() {
    this.send(this.hostName, 'start-game');
  }

  closeAll() {
    for (const ws of Object.values(this.sockets)) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }
}
