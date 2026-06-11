// ============================================================
// DecidArch — Game Engine (Pure State Machine)
// ============================================================

import {
  GameState,
  GamePhase,
  GameVersion,
  Player,
  PlayerDecision,
  GroupDecision,
  ChatMessage,
  Impact,
  EthicsConcernCard,
  EthicsEventCard,
} from './types';
import { CARD_DATA } from './cardData';
import { ETHICS_CARD_DATA } from './cardDataEthics';

// --------------- Helpers ---------------

/** Shuffle array in-place (Fisher-Yates) */
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------- Game Creation ---------------

export function createGame(
  roomCode: string,
  players: Player[],
  gameVersion: GameVersion = 'classic'
): GameState {
  const cardData = gameVersion === 'ethics' ? ETHICS_CARD_DATA : CARD_DATA;
  const shuffledConcerns = shuffle(cardData.concerns.map((c) => c.id));
  const shuffledEvents = shuffle(cardData.events.map((e) => e.id));

  return {
    roomCode,
    phase: 'individual-prep',
    players,
    maxPlayers: 8,
    currentConcernIndex: 0,
    currentRound: 1,
    concernOrder: shuffledConcerns,
    eventOrder: shuffledEvents,
    drawnEventIndices: [],
    individualDecisions: {},
    groupDecisions: [],
    chatMessages: [],
    startedAt: Date.now(),
    timerDuration: 45 * 60, // 45 minutes
    gameVersion,
    stakeholderVImportanceOverrides: {},
  };
}

// --------------- Queries ---------------

export function getCurrentConcern(state: GameState) {
  const id = state.concernOrder[state.currentConcernIndex];
  return CARD_DATA.concerns.find((c) => c.id === id) || null;
}

export function getCurrentEthicsConcern(state: GameState): EthicsConcernCard | null {
  const id = state.concernOrder[state.currentConcernIndex];
  return ETHICS_CARD_DATA.concerns.find((c) => c.id === id) || null;
}

export function getCurrentEvent(state: GameState) {
  if (!state.activeEventId) return null;
  return CARD_DATA.events.find((e) => e.id === state.activeEventId) || null;
}

export function getCurrentEthicsEvent(state: GameState): EthicsEventCard | null {
  if (!state.activeEventId) return null;
  return ETHICS_CARD_DATA.events.find((e) => e.id === state.activeEventId) || null;
}

export function allDecisionsSubmitted(state: GameState): boolean {
  const connectedPlayers = state.players.filter((p) => p.connected);
  return connectedPlayers.every((p) => state.individualDecisions[p.id] !== undefined);
}

/** After every 4th concern card, draw an event */
export function shouldDrawEvent(state: GameState): boolean {
  const concernNumber = state.currentConcernIndex + 1; // 1-based
  // Events after concern 4 and 8
  return concernNumber % 4 === 0 && concernNumber < state.concernOrder.length;
}

export function isGameOver(state: GameState): boolean {
  return state.currentConcernIndex >= state.concernOrder.length;
}

export function isOptionDisabled(state: GameState, optionId: string): boolean {
  // Ethics mode has no fixed design options
  if (state.gameVersion === 'ethics') return false;

  const drawnEvents = state.drawnEventIndices.map((i) => state.eventOrder[i]);

  if (drawnEvents.includes('event-fire')) {
    if (['c1-opt3', 'c2-opt3', 'c3-opt3'].includes(optionId)) {
      return true;
    }
  }

  if (drawnEvents.includes('event-data-protection')) {
    if (optionId === 'c3-opt2') {
      return true;
    }
  }

  return false;
}

// --------------- State Transitions ---------------

export function submitIndividualDecision(
  state: GameState,
  playerId: string,
  optionId: string,
  rationale: string
): GameState {
  if (state.phase !== 'individual-prep') return state;
  if (state.individualDecisions[playerId]) return state; // already submitted

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const newDecisions = {
    ...state.individualDecisions,
    [playerId]: {
      playerId,
      playerName: player.name,
      optionId,
      rationale,
      submittedAt: Date.now(),
    } as PlayerDecision,
  };

  const newState = { ...state, individualDecisions: newDecisions };

  // Auto-advance to reveal when all players have submitted
  if (allDecisionsSubmitted(newState)) {
    return { ...newState, phase: 'reveal' as GamePhase };
  }

  return newState;
}

export function advanceToGroupDecision(state: GameState): GameState {
  if (state.phase !== 'reveal') return state;
  return { ...state, phase: 'group-decision' };
}

export function submitGroupDecision(
  state: GameState,
  optionId: string,
  rationale: string,
  valueImpacts?: Partial<Record<string, Impact>>
): GameState {
  if (state.phase !== 'group-decision') return state;

  let decision: GroupDecision;

  if (state.gameVersion === 'ethics') {
    const concern = getCurrentEthicsConcern(state);
    if (!concern) return state;
    decision = {
      concernId: concern.id,
      concernTitle: concern.title,
      optionId: '',
      optionName: rationale.length > 60 ? rationale.slice(0, 57) + '...' : rationale,
      rationale,
      valueImpacts,
    };
  } else {
    const concern = getCurrentConcern(state);
    if (!concern) return state;
    const option = concern.designOptions.find((o) => o.id === optionId);
    if (!option) return state;
    decision = {
      concernId: concern.id,
      concernTitle: concern.title,
      optionId,
      optionName: option.name,
      rationale,
    };
  }

  const newGroupDecisions = [...state.groupDecisions, decision];
  const newConcernIndex = state.currentConcernIndex + 1;

  // Check if we should draw an event card
  if (shouldDrawEvent({ ...state, currentConcernIndex: state.currentConcernIndex })) {
    const eventIndex = state.drawnEventIndices.length;
    if (eventIndex < state.eventOrder.length) {
      const eventId = state.eventOrder[eventIndex];
      return {
        ...state,
        groupDecisions: newGroupDecisions,
        currentConcernIndex: newConcernIndex,
        individualDecisions: {},
        activeEventId: eventId,
        hostSelectedOptionId: null,
        groupDraftRationale: undefined,
        groupDraftValueImpacts: undefined,
        drawnEventIndices: [...state.drawnEventIndices, eventIndex],
        phase: 'event',
        currentRound: state.currentRound + 1,
      };
    }
  }

  // Check if game is over
  if (newConcernIndex >= state.concernOrder.length) {
    return {
      ...state,
      groupDecisions: newGroupDecisions,
      currentConcernIndex: newConcernIndex,
      individualDecisions: {},
      hostSelectedOptionId: null,
      groupDraftRationale: undefined,
      groupDraftValueImpacts: undefined,
      phase: 'scoring',
    };
  }

  // Advance to next concern
  return {
    ...state,
    groupDecisions: newGroupDecisions,
    currentConcernIndex: newConcernIndex,
    individualDecisions: {},
    hostSelectedOptionId: null,
    groupDraftRationale: undefined,
    groupDraftValueImpacts: undefined,
    phase: 'individual-prep',
  };
}

export function advanceToEventRevision(state: GameState): GameState {
  if (state.phase !== 'event') return state;
  if (state.gameVersion === 'ethics') {
    // Ethics mode: apply V-importance change and skip the revision phase
    return advanceAfterEvent(applyEthicsEvent(state));
  }
  return { ...state, phase: 'event-revision' };
}

/** Apply an ethics event's V-importance override to game state */
function applyEthicsEvent(state: GameState): GameState {
  if (!state.activeEventId) return state;
  const event = ETHICS_CARD_DATA.events.find((e) => e.id === state.activeEventId);
  if (!event) return state;

  return {
    ...state,
    stakeholderVImportanceOverrides: {
      ...state.stakeholderVImportanceOverrides,
      [event.stakeholderId]: {
        ...(state.stakeholderVImportanceOverrides[event.stakeholderId] ?? {}),
        [event.affectedValue]: event.newImportance,
      },
    },
  };
}

export function reviseDecision(
  state: GameState,
  concernId: string,
  newOptionId: string,
  rationale: string
): GameState {
  if (state.phase !== 'event-revision') return state;

  const concern = CARD_DATA.concerns.find((c) => c.id === concernId);
  if (!concern) return state;

  const option = concern.designOptions.find((o) => o.id === newOptionId);
  if (!option) return state;

  const newGroupDecisions = state.groupDecisions.map((d) => {
    if (d.concernId === concernId) {
      return {
        ...d,
        originalOptionId: d.originalOptionId ?? d.optionId,
        optionId: newOptionId,
        optionName: option.name,
        rationale,
        revisedByEvent: state.activeEventId,
      };
    }
    return d;
  });

  // Stay in event-revision so the host can make additional revisions.
  // The phase advances only when skipRevision() is called.
  return {
    ...state,
    groupDecisions: newGroupDecisions,
    revisionDraftConcernId: null,
    revisionDraftOptionId: null,
    revisionDraftRationale: undefined,
  };
}

export function skipRevision(state: GameState): GameState {
  if (state.phase !== 'event-revision') return state;
  return advanceAfterEvent(state);
}

function advanceAfterEvent(state: GameState): GameState {
  // Check if game is over
  if (state.currentConcernIndex >= state.concernOrder.length) {
    return {
      ...state,
      activeEventId: undefined,
      phase: 'scoring',
    };
  }

  return {
    ...state,
    activeEventId: undefined,
    phase: 'individual-prep',
  };
}

export function finishGame(state: GameState): GameState {
  return { ...state, phase: 'finished' };
}

// --------------- Chat ---------------

export function addChatMessage(
  state: GameState,
  playerId: string,
  text: string
): { state: GameState; message: ChatMessage } {
  const player = state.players.find((p) => p.id === playerId);
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    playerId,
    playerName: player?.name || 'Unknown',
    text,
    timestamp: Date.now(),
  };

  return {
    state: {
      ...state,
      chatMessages: [...state.chatMessages, message],
    },
    message,
  };
}

export function addSystemMessage(
  state: GameState,
  text: string
): { state: GameState; message: ChatMessage } {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    playerId: 'system',
    playerName: 'System',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };

  return {
    state: {
      ...state,
      chatMessages: [...state.chatMessages, message],
    },
    message,
  };
}

// --------------- Player Management ---------------

export function addPlayer(state: GameState, player: Player): GameState {
  if (state.players.length >= state.maxPlayers) return state;
  if (state.players.find((p) => p.id === player.id)) return state;
  return { ...state, players: [...state.players, player] };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, connected: false } : p
    ),
  };
}

export function reconnectPlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, connected: true } : p
    ),
  };
}
