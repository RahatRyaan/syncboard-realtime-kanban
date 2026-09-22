import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';
import { MembershipRole } from '@syncboard/shared-types';

export type InviteDocument = Invite & MongooseDocument;

@Schema({ timestamps: true })
export class Invite {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
    required: true,
  })
  role: MembershipRole;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  invitedBy: string;

  @Prop({ required: true, index: { expires: '7d' } })
  expiresAt: Date;

  @Prop({ default: false })
  isAccepted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
