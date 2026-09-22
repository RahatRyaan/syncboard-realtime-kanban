import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type ColumnDocument = Column & MongooseDocument;

@Schema({ timestamps: true })
export class Column {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Board',
    required: true,
  })
  boardId: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({
    type: String,
    required: true,
    default: 'todo',
    enum: ['todo', 'in-progress', 'review', 'done', 'backlog'],
  })
  status: string;

  @Prop({
    type: String,
    required: true,
    default: 'a0',
  })
  rank: string;

  @Prop({ type: Number, default: 1, min: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ColumnSchema = SchemaFactory.createForClass(Column);

ColumnSchema.index({ boardId: 1 });
ColumnSchema.index({ boardId: 1, rank: 1 });

ColumnSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.boardId) ret.boardId = ret.boardId.toString();
    return ret;
  },
});
