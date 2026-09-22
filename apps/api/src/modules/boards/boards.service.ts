import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name)
    private readonly boardModel: Model<BoardDocument>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async findByWorkspace(workspaceId: string, userId: string): Promise<BoardDocument[]> {
    // Membership verified by caller (guard); just scope the query
    return this.boardModel
      .find({ workspaceId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, dto: CreateBoardDto): Promise<BoardDocument> {
    // Verify membership (throws 403 if not a member)
    const workspace = await this.workspacesService.findById(dto.workspaceId, userId);

    // Free plan check: max 3 boards per workspace
    if (workspace.plan === 'free' || !workspace.plan) {
      const boardCount = await this.boardModel.countDocuments({ workspaceId: dto.workspaceId });
      if (boardCount >= 3) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: 'Free plan is capped at 3 boards per workspace. Upgrade to Pro for unlimited boards.',
          limit: 3,
          current: boardCount,
        });
      }
    }

    const board = new this.boardModel({
      workspaceId: dto.workspaceId,
      title: dto.title,
      description: dto.description ?? '',
      version: 1,
    });

    return board.save();
  }

  async findOne(id: string, userId: string): Promise<BoardDocument> {
    const board = await this.boardModel.findById(id).exec();
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Verify user is a member of the workspace that owns this board
    await this.workspacesService.findById(board.workspaceId.toString(), userId);

    return board;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardDocument> {
    const updates: Partial<{ title: string; description: string }> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;

    const updated = await this.boardModel
      .findOneAndUpdate(
        { _id: id, version: dto.expectedVersion },
        { $set: updates, $inc: { version: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Could be not found or version mismatch — check which
      const exists = await this.boardModel.findById(id).exec();
      if (!exists) {
        throw new NotFoundException('Board not found');
      }
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Board was modified by another request. Refresh and retry.',
        current: exists.toJSON(),
      });
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const board = await this.boardModel.findById(id).exec();
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.boardModel.deleteOne({ _id: id }).exec();
    return { success: true };
  }
}
