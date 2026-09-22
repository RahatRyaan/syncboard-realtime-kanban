import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type CardDocument = Card & MongooseDocument;

@Schema({ _id: true, timestamps: { createdAt: 'uploadedAt', updatedAt: false } })
export class CardAttachment {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  uploadedBy: string;

  uploadedAt?: Date;
}

export const CardAttachmentSchema = SchemaFactory.createForClass(CardAttachment);

CardAttachmentSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    if (ret.uploadedBy) ret.uploadedBy = ret.uploadedBy.toString();
    return ret;
  },
});

@Schema({ timestamps: true })
export class Card {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Board',
    required: true,
  })
  boardId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Column',
    required: true,
  })
  columnId: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({
    type: String,
    required: true,
    default: 'a0',
  })
  rank: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'User',
    default: [],
  })
  assigneeIds: string[];

  @Prop({
    type: [CardAttachmentSchema],
    default: [],
  })
  attachments: CardAttachment[];

  @Prop({
    type: [String],
    default: [],
  })
  labels: string[];

  @Prop({ type: Number, default: 1, min: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const CardSchema = SchemaFactory.createForClass(Card);

CardSchema.index({ boardId: 1, columnId: 1 });
CardSchema.index({ boardId: 1, rank: 1 });
CardSchema.index({ boardId: 1, columnId: 1, rank: 1 });
CardSchema.index({ title: 'text', description: 'text' });

CardSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.boardId) ret.boardId = ret.boardId.toString();
    if (ret.columnId) ret.columnId = ret.columnId.toString();
    if (ret.assigneeIds) {
      ret.assigneeIds = ret.assigneeIds.map((id: any) => id.toString());
    }
    if (ret.attachments && Array.isArray(ret.attachments)) {
      ret.attachments = ret.attachments.map((att: any) => ({
        id: att._id ? att._id.toString() : att.id,
        name: att.name,
        key: att.key,
        url: att.url,
        size: att.size,
        mimeType: att.mimeType,
        uploadedBy: att.uploadedBy ? att.uploadedBy.toString() : att.uploadedBy,
        uploadedAt: att.uploadedAt,
      }));
    }
    return ret;
  },
});
