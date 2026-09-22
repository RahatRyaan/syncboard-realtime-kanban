import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type ActivityLogDocument = ActivityLog & MongooseDocument;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  })
  workspaceId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Board',
    required: false,
    index: true,
  })
  boardId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Card',
    required: false,
  })
  cardId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'board.created',
      'board.updated',
      'board.deleted',
      'card.created',
      'card.updated',
      'card.moved',
      'card.deleted',
      'column.created',
      'column.updated',
      'column.deleted',
      'member.added',
      'member.removed',
    ],
    index: true,
  })
  action: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ workspaceId: 1, createdAt: -1 });
ActivityLogSchema.index({ boardId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

ActivityLogSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.workspaceId) ret.workspaceId = ret.workspaceId.toString();
    if (ret.boardId) ret.boardId = ret.boardId.toString();
    if (ret.cardId) ret.cardId = ret.cardId.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    return ret;
  },
});
