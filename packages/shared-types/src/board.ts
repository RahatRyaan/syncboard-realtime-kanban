import { VersionedEntity, ExpectedVersionPayload } from './versioned.js';

/**
 * Kanban Board contract.
 */
export interface Board extends VersionedEntity {
  workspaceId: string;
  title: string;
  description?: string;
  archived?: boolean;
}

/**
 * Kanban Column contract.
 */
export interface Column extends VersionedEntity {
  boardId: string;
  title: string;
  rank: string; // Fractional index string for ordering
}

/**
 * Attachment metadata on a Card.
 */
export interface CardAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Kanban Card contract.
 */
export interface Card extends VersionedEntity {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  rank: string; // Fractional index string for ordering
  documentId?: string;
  assigneeIds: string[];
  attachments: CardAttachment[];
  dueDate?: string;
  labels: string[];
}

/**
 * Rich document associated with a board or workspace.
 */
export interface Document extends VersionedEntity {
  workspaceId: string;
  boardId?: string;
  cardId?: string;
  title: string;
  body: string; // Whole-document content in v1
}

/**
 * Card comment contract.
 */
export interface Comment extends VersionedEntity {
  cardId: string;
  authorId: string;
  content: string;
  mentions: string[];
}

/**
 * Full Board aggregate with nested columns and cards for initial load.
 */
export interface BoardDetail extends Board {
  columns: Array<Column & { cards: Card[] }>;
}

/**
 * Create Board Request DTO.
 */
export interface CreateBoardDto {
  workspaceId: string;
  title: string;
  description?: string;
}

/**
 * Create Column Request DTO.
 */
export interface CreateColumnDto {
  boardId: string;
  title: string;
  rank?: string;
}

/**
 * Create Card Request DTO.
 */
export interface CreateCardDto {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  rank?: string;
  assigneeIds?: string[];
  labels?: string[];
}

/**
 * Move Card Request DTO (optimistic concurrency enforced).
 */
export interface MoveCardDto extends ExpectedVersionPayload {
  targetColumnId: string;
  targetRank: string;
}

/**
 * Update Card Request DTO.
 */
export interface UpdateCardDto extends ExpectedVersionPayload {
  title?: string;
  description?: string;
  columnId?: string;
  rank?: string;
  assigneeIds?: string[];
  dueDate?: string;
  labels?: string[];
}
