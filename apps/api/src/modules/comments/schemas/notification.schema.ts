import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & MongooseDocument;

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipientId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  senderId: string;

  @Prop({
    type: String,
    required: true,
    enum: ['mention', 'comment', 'assignment'],
    default: 'mention',
  })
  type: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
  })
  workspaceId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Board',
  })
  boardId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Card',
  })
  cardId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Comment',
  })
  commentId?: string;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Boolean, default: false, index: true })
  read: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

NotificationSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.recipientId) ret.recipientId = ret.recipientId.toString();
    if (ret.senderId) {
      if (typeof ret.senderId === 'object' && ret.senderId !== null) {
        ret.sender = {
          id: ret.senderId._id ? ret.senderId._id.toString() : ret.senderId.id,
          name: ret.senderId.name,
          email: ret.senderId.email,
        };
        ret.senderId = ret.sender.id;
      } else {
        ret.senderId = ret.senderId.toString();
      }
    }
    if (ret.workspaceId) ret.workspaceId = ret.workspaceId.toString();
    if (ret.boardId) ret.boardId = ret.boardId.toString();
    if (ret.cardId) ret.cardId = ret.cardId.toString();
    if (ret.commentId) ret.commentId = ret.commentId.toString();
    return ret;
  },
});
