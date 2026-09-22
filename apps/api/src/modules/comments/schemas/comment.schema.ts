import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type CommentDocument = Comment & MongooseDocument;

@Schema({ timestamps: true })
export class Comment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Card',
    required: true,
    index: true,
  })
  cardId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: string;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  content: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'User',
    default: [],
  })
  mentions: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ cardId: 1, createdAt: -1 });

CommentSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.cardId) ret.cardId = ret.cardId.toString();
    if (ret.userId) {
      if (typeof ret.userId === 'object' && ret.userId !== null) {
        ret.user = {
          id: ret.userId._id ? ret.userId._id.toString() : ret.userId.id,
          name: ret.userId.name,
          email: ret.userId.email,
          avatarUrl: ret.userId.avatarUrl,
        };
        ret.userId = ret.user.id;
      } else {
        ret.userId = ret.userId.toString();
      }
    }
    if (ret.mentions && Array.isArray(ret.mentions)) {
      ret.mentions = ret.mentions.map((m: any) =>
        typeof m === 'object' && m !== null ? (m._id ? m._id.toString() : m.id) : m.toString(),
      );
    }
    return ret;
  },
});
