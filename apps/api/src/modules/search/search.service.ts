import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from '../boards/schemas/board.schema';
import { Card, CardDocument } from '../cards/schemas/card.schema';
import { WorkspacesService } from '../workspaces/workspaces.service';

export interface SearchResult {
  query: string;
  workspaceId: string;
  totalResults: number;
  boards: BoardDocument[];
  cards: CardDocument[];
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Board.name)
    private readonly boardModel: Model<BoardDocument>,
    @InjectModel(Card.name)
    private readonly cardModel: Model<CardDocument>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async search(
    workspaceId: string,
    query: string,
    userId: string,
  ): Promise<SearchResult> {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    if (!query || query.trim().length === 0) {
      return {
        query: '',
        workspaceId,
        totalResults: 0,
        boards: [],
        cards: [],
      };
    }

    const trimmedQuery = query.trim();

    // Verify user is a member of the workspace (throws 403 / 404 if not)
    await this.workspacesService.findById(workspaceId, userId);

    // Get all boards in the workspace to scope card search
    const allWorkspaceBoards = await this.boardModel
      .find({ workspaceId })
      .select('_id')
      .exec();
    const boardIds = allWorkspaceBoards.map((b) => b._id.toString());

    // Escape regex special characters for safe partial matching
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // Search Boards in this workspace
    const boardMatchFilter = {
      workspaceId,
      $or: [{ title: regex }, { description: regex }],
    };

    const boards = await this.boardModel
      .find(boardMatchFilter)
      .limit(20)
      .exec();

    // Search Cards across boards in this workspace
    let cards: CardDocument[] = [];
    if (boardIds.length > 0) {
      const cardMatchFilter = {
        boardId: { $in: boardIds },
        $or: [{ title: regex }, { description: regex }],
      };

      cards = await this.cardModel
        .find(cardMatchFilter)
        .limit(50)
        .exec();
    }

    return {
      query: trimmedQuery,
      workspaceId,
      totalResults: boards.length + cards.length,
      boards,
      cards,
    };
  }
}
