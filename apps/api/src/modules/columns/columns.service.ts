import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Column, ColumnDocument } from './schemas/column.schema';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class ColumnsService {
  constructor(
    @InjectModel(Column.name)
    private readonly columnModel: Model<ColumnDocument>,
    private readonly boardsService: BoardsService,
  ) {}

  async findByBoard(boardId: string, userId: string): Promise<ColumnDocument[]> {
    await this.boardsService.findOne(boardId, userId);
    return this.columnModel
      .find({ boardId })
      .sort({ rank: 1, createdAt: 1 })
      .exec();
  }

  async create(userId: string, dto: CreateColumnDto): Promise<ColumnDocument> {
    const board = await this.boardsService.findOne(dto.boardId, userId);

    const rank = dto.rank || this.generateRank();
    const column = new this.columnModel({
      boardId: dto.boardId,
      title: dto.title,
      status: dto.status || 'todo',
      rank,
      version: 1,
    });

    return column.save();
  }

  async findOne(id: string, userId: string): Promise<ColumnDocument> {
    const column = await this.columnModel.findById(id).exec();
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.boardsService.findOne(column.boardId.toString(), userId);
    return column;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateColumnDto,
  ): Promise<ColumnDocument> {
    const column = await this.columnModel.findById(id).exec();
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.boardsService.findOne(column.boardId.toString(), userId);

    const updates: Partial<{ title: string; status: string; rank: string }> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.rank !== undefined) updates.rank = dto.rank;

    const updated = await this.columnModel
      .findOneAndUpdate(
        { _id: id, version: dto.expectedVersion },
        { $set: updates, $inc: { version: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      const exists = await this.columnModel.findById(id).exec();
      if (!exists) {
        throw new NotFoundException('Column not found');
      }
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Column was modified by another request. Refresh and retry.',
        current: exists.toJSON(),
      });
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const column = await this.columnModel.findById(id).exec();
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.boardsService.findOne(column.boardId.toString(), userId);
    await this.columnModel.deleteOne({ _id: id }).exec();

    return { success: true };
  }

  private generateRank(): string {
    return 'a' + Math.random().toString(36).substr(2, 9);
  }
}