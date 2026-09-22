import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type BoardDocument = Board & MongooseDocument;

@Schema({ timestamps: true })
export class Board {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  })
  workspaceId: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ type: Number, default: 1, min: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const BoardSchema = SchemaFactory.createForClass(Board);

BoardSchema.index({ workspaceId: 1, title: 1 });
BoardSchema.index({ title: 'text', description: 'text' });

BoardSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.workspaceId) ret.workspaceId = ret.workspaceId.toString();
    return ret;
  },
});
