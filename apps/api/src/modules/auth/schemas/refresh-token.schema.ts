import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & MongooseDocument;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ required: true, index: { expires: '7d' } })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
