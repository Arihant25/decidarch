// ============================================================
// DecidArch V2 — Shared Type Definitions
// ============================================================

// --------------- Quality Attributes ---------------

export type QualityAttribute =
  | 'Performance'
  | 'Security'
  | 'Modifiability'
  | 'Availability'
  | 'Usability'
  | 'Maintainability';

export const ALL_QUALITY_ATTRIBUTES: QualityAttribute[] = [
  'Performance',
  'Security',
  'Availability',
  'Usability',
  'Maintainability',
];

/** Impact of a design option on a quality attribute */
export type Impact = '--' | '-' | '=' | '+' | '++';

/** Numeric value for each impact level */
export const IMPACT_VALUES: Record<Impact, number> = {
  '--': -2,
  '-': -1,
  '=': 0,
  '+': 1,
  '++': 2,
};

// --------------- Card Types ---------------

export interface DesignOption {
  id: string;
  name: string;
  description: string;
  impacts: Record<string, Impact>;
}

export interface ConcernCard {
  id: string;
  title: string;
  description: string;
  designOptions: DesignOption[];
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  effect: string;
  imageUrl?: string;
}

export interface StakeholderCard {
  id: string;
  name: string;
  role: string;
  description: string;
  priorities: {
    attribute: QualityAttribute;
    importance: number; // QA-Priority numeric value
  }[];
}

export interface ProjectCard {
  title: string;
  description: string;
  context: string;
}

// --------------- Game State ---------------

export type GamePhase =
  | 'lobby'
  | 'individual-prep'
  | 'reveal'
  | 'group-decision'
  | 'event'
  | 'event-revision'
  | 'scoring'
  | 'finished';

export interface PlayerDecision {
  playerId: string;
  playerName: string;
  optionId: string;
  rationale: string;
  submittedAt: number;
}

export interface GroupDecision {
  concernId: string;
  concernTitle: string;
  optionId: string;
  optionName: string;
  rationale: string;
  revisedByEvent?: string;
  originalOptionId?: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  maxPlayers: number;
  currentConcernIndex: number;
  currentRound: number;
  concernOrder: string[];
  eventOrder: string[];
  drawnEventIndices: number[];
  individualDecisions: Record<string, PlayerDecision>;
  groupDecisions: GroupDecision[];
  chatMessages: ChatMessage[];
  startedAt?: number;
  timerDuration: number; // in seconds
  activeEventId?: string;
  hostSelectedOptionId?: string | null;
}

// --------------- WebSocket Messages ---------------

export type ClientMessage =
  | { type: 'join'; payload: { roomCode: string; playerName: string } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'submit-decision'; payload: { optionId: string; rationale: string } }
  | { type: 'submit-group-decision'; payload: { optionId: string; rationale: string } }
  | { type: 'select-group-option'; payload: { optionId: string | null } }
  | { type: 'advance-phase'; payload: Record<string, never> }
  | { type: 'revise-decision'; payload: { concernId: string; optionId: string; rationale: string } }
  | { type: 'skip-revision'; payload: Record<string, never> }
  | { type: 'chat-message'; payload: { text: string } }
  | { type: 'kick-player'; payload: { playerId: string } };

export type ServerMessage =
  | { type: 'game-state'; payload: GameState }
  | { type: 'error'; payload: { message: string } }
  | { type: 'player-joined'; payload: { player: Player } }
  | { type: 'player-left'; payload: { playerId: string } }
  | { type: 'player-kicked'; payload: { playerId: string } }
  | { type: 'room-created'; payload: { roomCode: string; playerId: string } }
  | { type: 'joined'; payload: { playerId: string; gameState: GameState } }
  | { type: 'chat-message'; payload: ChatMessage };
