import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async findByWorkspace(
    workspaceId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: ActivityLogDocument[]; nextCursor: string | null }> {
    const query: any = { workspaceId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const logs = await this.activityLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const lastLog = logs[limit - 1];
      nextCursor = lastLog.createdAt.toISOString();
      logs.pop();
    }

    return { data: logs, nextCursor };
  }

  async findByBoard(
    boardId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: ActivityLogDocument[]; nextCursor: string | null }> {
    const query: any = { boardId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const logs = await this.activityLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const lastLog = logs[limit - 1];
      nextCursor = lastLog.createdAt.toISOString();
      logs.pop();
    }

    return { data: logs, nextCursor };
  }

  async findByCard(
    cardId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ data: ActivityLogDocument[]; nextCursor: string | null }> {
    const query: any = { cardId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const logs = await this.activityLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const lastLog = logs[limit - 1];
      nextCursor = lastLog.createdAt.toISOString();
      logs.pop();
    }

    return { data: logs, nextCursor };
  }

  async log(params: {
    workspaceId: string;
    userId: string;
    action: string;
    boardId?: string;
    cardId?: string;
    metadata?: Record<string, any>;
  }): Promise<ActivityLogDocument> {
    const log = new this.activityLogModel({
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: params.action,
      boardId: params.boardId,
      cardId: params.cardId,
      metadata: params.metadata || {},
      createdAt: new Date(),
    });

    return log.save();
  }

  async logBatch(
    logs: Array<{
      workspaceId: string;
      userId: string;
      action: string;
      boardId?: string;
      cardId?: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<number> {
    if (logs.length === 0) return 0;

    const docs = logs.map((l) => ({
      ...l,
      metadata: l.metadata || {},
      createdAt: new Date(),
    }));

    const result = await this.activityLogModel.insertMany(docs);
    return result.length;
  }
}