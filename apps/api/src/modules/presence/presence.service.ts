import { Injectable } from '@nestjs/common';
import { PresenceState } from '@syncboard/shared-types';

@Injectable()
export class PresenceService {
  private readonly boardPresences = new Map<string, Map<string, PresenceState>>();

  async updatePresence(state: PresenceState): Promise<PresenceState[]> {
    if (!this.boardPresences.has(state.boardId)) {
      this.boardPresences.set(state.boardId, new Map());
    }
    const boardMap = this.boardPresences.get(state.boardId)!;
    boardMap.set(state.userId, state);
    return Array.from(boardMap.values());
  }

  async removePresence(boardId: string, userId: string): Promise<PresenceState[]> {
    const boardMap = this.boardPresences.get(boardId);
    if (boardMap) {
      boardMap.delete(userId);
      return Array.from(boardMap.values());
    }
    return [];
  }

  async getBoardPresences(boardId: string): Promise<PresenceState[]> {
    const boardMap = this.boardPresences.get(boardId);
    return boardMap ? Array.from(boardMap.values()) : [];
  }
}
