import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Card, CardDocument } from './schemas/card.schema';
import { Column, ColumnDocument } from '../columns/schemas/column.schema';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { BoardsService } from '../boards/boards.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CardsService {
  constructor(
    @InjectModel(Card.name)
    private readonly cardModel: Model<CardDocument>,
    @InjectModel(Column.name)
    private readonly columnModel: Model<ColumnDocument>,
    private readonly boardsService: BoardsService,
    private readonly storageService: StorageService,
  ) {}

  async findByBoard(boardId: string, columnId?: string): Promise<CardDocument[]> {
    const query: any = { boardId };
    if (columnId) {
      query.columnId = columnId;
    }
    return this.cardModel
      .find(query)
      .sort({ rank: 1, createdAt: 1 })
      .exec();
  }

  async create(userId: string, dto: CreateCardDto): Promise<CardDocument> {
    const board = await this.boardsService.findOne(dto.boardId, userId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const column = await this.columnModel.findById(dto.columnId).exec();
    if (!column || column.boardId.toString() !== dto.boardId) {
      throw new NotFoundException('Column not found in this board');
    }

    const rank = dto.rank || this.generateRank();
    const card = new this.cardModel({
      boardId: dto.boardId,
      columnId: dto.columnId,
      title: dto.title,
      description: dto.description ?? '',
      rank,
      assigneeIds: dto.assigneeIds ?? [],
      labels: dto.labels ?? [],
      version: 1,
    });

    return card.save();
  }

  async findOne(id: string, userId: string): Promise<CardDocument> {
    const card = await this.cardModel.findById(id).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);
    return card;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCardDto,
  ): Promise<CardDocument> {
    const card = await this.cardModel.findById(id).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);

    const updates: Partial<{
      title: string;
      description: string;
      rank: string;
      columnId: string;
      assigneeIds: string[];
      labels: string[];
    }> = {};

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.rank !== undefined) updates.rank = dto.rank;
    if (dto.columnId !== undefined) {
      const targetColumn = await this.columnModel.findById(dto.columnId).exec();
      if (!targetColumn || targetColumn.boardId.toString() !== card.boardId.toString()) {
        throw new BadRequestException('Target column not found in this board');
      }
      updates.columnId = dto.columnId;
    }
    if (dto.assigneeIds !== undefined) updates.assigneeIds = dto.assigneeIds;
    if (dto.labels !== undefined) updates.labels = dto.labels;

    const updated = await this.cardModel
      .findOneAndUpdate(
        { _id: id, version: dto.expectedVersion },
        { $set: updates, $inc: { version: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      const exists = await this.cardModel.findById(id).exec();
      if (!exists) {
        throw new NotFoundException('Card not found');
      }
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Card was modified by another request. Refresh and retry.',
        current: exists.toJSON(),
      });
    }

    return updated;
  }

  async move(
    id: string,
    userId: string,
    dto: MoveCardDto,
  ): Promise<CardDocument> {
    const card = await this.cardModel.findById(id).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);

    const targetColumn = await this.columnModel.findById(dto.targetColumnId).exec();
    if (!targetColumn || targetColumn.boardId.toString() !== card.boardId.toString()) {
      throw new BadRequestException('Target column not found in this board');
    }

    const updated = await this.cardModel
      .findOneAndUpdate(
        { _id: id, version: dto.expectedVersion },
        {
          $set: { columnId: dto.targetColumnId, rank: dto.targetRank },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      const exists = await this.cardModel.findById(id).exec();
      if (!exists) {
        throw new NotFoundException('Card not found');
      }
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Card was modified by another request. Refresh and retry.',
        current: exists.toJSON(),
      });
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const card = await this.cardModel.findById(id).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);
    await this.cardModel.deleteOne({ _id: id }).exec();

    return { success: true };
  }

  async getPresignedAttachmentUrl(
    cardId: string,
    userId: string,
    dto: PresignAttachmentDto,
  ) {
    const card = await this.findOne(cardId, userId);
    return this.storageService.createPresignedUploadUrl({
      folder: `cards/${card.id}`,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      expiresInSeconds: 300,
    });
  }

  async addAttachment(
    cardId: string,
    userId: string,
    dto: AddAttachmentDto,
  ): Promise<CardDocument> {
    const card = await this.cardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);

    const newAttachment = {
      name: dto.name,
      key: dto.key,
      url: dto.url,
      size: dto.size,
      mimeType: dto.mimeType,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    const updated = await this.cardModel
      .findByIdAndUpdate(
        cardId,
        {
          $push: { attachments: newAttachment },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Card not found');
    }

    return updated;
  }

  async removeAttachment(
    cardId: string,
    attachmentId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const card = await this.cardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.boardsService.findOne(card.boardId.toString(), userId);

    const attachment = card.attachments.find(
      (a: any) => (a._id ? a._id.toString() : a.id) === attachmentId,
    );

    if (attachment && attachment.key) {
      await this.storageService.deleteFile(attachment.key);
    }

    await this.cardModel
      .findByIdAndUpdate(
        cardId,
        {
          $pull: { attachments: { _id: attachmentId } },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .exec();

    return { success: true };
  }

  private generateRank(): string {
    return 'a' + Math.random().toString(36).substr(2, 9);
  }
}
