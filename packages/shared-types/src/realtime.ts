import { Card, Column, Board } from './board.js';
import { ApiError } from './api.js';

/**
 * Ephemeral collaborator presence state on a Board.
 */
export interface PresenceState {
  userId: string;
  name: string;
  avatarUrl?: string;
  boardId: string;
  activeCardId?: string;
  isTyping?: boolean;
  lastActiveAt: string;
}

/**
 * Socket.io events enumeration.
 */
export const SocketEvents = {
  // Connection / Room lifecycle
  BOARD_JOIN: 'board:join',
  BOARD_LEAVE: 'board:leave',
  WORKSPACE_JOIN: 'workspace:join',
  WORKSPACE_LEAVE: 'workspace:leave',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_SYNC: 'presence:sync',
  PRESENCE_HEARTBEAT: 'presence:heartbeat',

  // Real-time mutations & broadcasts
  CARD_CREATED: 'card:created',
  CARD_UPDATED: 'card:updated',
  CARD_MOVED: 'card:moved',
  CARD_DELETED: 'card:deleted',
  CARD_MOVE_REJECTED: 'card:move:rejected',

  COLUMN_CREATED: 'column:created',
  COLUMN_UPDATED: 'column:updated',
  COLUMN_DELETED: 'column:deleted',

  BOARD_UPDATED: 'board:updated',
  COMMENT_CREATED: 'comment:created',
  NOTIFICATION_RECEIVED: 'notification:received',

  // Concurrency conflict
  ENTITY_CONFLICT: 'entity:conflict',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

/**
 * Typed Payload for Card Moved event.
 */
export interface CardMovedPayload {
  cardId: string;
  boardId: string;
  sourceColumnId: string;
  targetColumnId: string;
  rank: string;
  version: number;
  updatedBy: string;
  card: Card;
}

/**
 * Typed Payload for Card Move Rejected (Conflict) event.
 */
export interface CardMoveRejectedPayload {
  cardId: string;
  boardId: string;
  error: ApiError;
  currentCard: Card;
}

/**
 * Typed Payload for Conflict event.
 */
export interface EntityConflictPayload {
  entityType: 'board' | 'column' | 'card' | 'document';
  entityId: string;
  currentVersion: number;
  currentEntity: unknown;
  error: ApiError;
}
