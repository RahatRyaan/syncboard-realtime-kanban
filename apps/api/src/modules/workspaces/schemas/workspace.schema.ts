import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';
import { MembershipRole } from '@syncboard/shared-types';

export type WorkspaceDocument = Workspace & MongooseDocument;

@Schema({ _id: false })
export class WorkspaceMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: 'member',
    required: true,
  })
  role: MembershipRole;

  @Prop({ default: Date.now })
  joinedAt: Date;
}

export const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

@Schema({ timestamps: true })
export class Workspace {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: string;

  @Prop({
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  })
  plan: 'free' | 'pro' | 'enterprise';

  @Prop({ type: [WorkspaceMemberSchema], default: [] })
  members: WorkspaceMember[];

  createdAt: Date;
  updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);

WorkspaceSchema.index({ 'members.userId': 1 });

WorkspaceSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.members) {
      ret.members = ret.members.map((m: any) => ({
        userId: m.userId.toString(),
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    }
    return ret;
  },
});
