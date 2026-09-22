import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { Invite, InviteDocument } from './schemas/invite.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(Invite.name)
    private readonly inviteModel: Model<InviteDocument>,
    private readonly usersService: UsersService,
  ) {}

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base || 'workspace'}-${suffix}`;
  }

  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceDocument> {
    const slug = this.slugify(dto.name);
    const workspace = new this.workspaceModel({
      name: dto.name,
      slug,
      ownerId: userId,
      plan: 'free',
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
    });

    return workspace.save();
  }

  async findAllForUser(userId: string): Promise<WorkspaceDocument[]> {
    return this.workspaceModel
      .find({ 'members.userId': userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(id).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return workspace;
  }

  async update(
    id: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(id).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (dto.name) workspace.name = dto.name;
    if (dto.plan) workspace.plan = dto.plan;

    return workspace.save();
  }

  async createInvite(
    workspaceId: string,
    inviterId: string,
    dto: InviteMemberDto,
  ) {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Free plan check: max 2 members per workspace
    if (workspace.plan === 'free' || !workspace.plan) {
      if (workspace.members.length >= 2) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: 'Free plan is capped at 2 members per workspace. Upgrade to Pro for unlimited members.',
          limit: 2,
          current: workspace.members.length,
        });
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.inviteModel.create({
      workspaceId,
      email: dto.email.toLowerCase().trim(),
      role: dto.role,
      token,
      invitedBy: inviterId,
      expiresAt,
    });

    return {
      inviteToken: invite.token,
      email: invite.email,
      role: invite.role,
      workspaceName: workspace.name,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInvite(token: string, userId: string): Promise<WorkspaceDocument> {
    const invite = await this.inviteModel.findOne({ token }).exec();
    if (!invite) {
      throw new NotFoundException('Invalid or expired invite token');
    }

    if (invite.isAccepted) {
      throw new BadRequestException('Invite has already been accepted');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    const workspace = await this.workspaceModel.findById(invite.workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is already a member
    const existingMember = workspace.members.find(
      (m) => m.userId.toString() === userId,
    );

    if (!existingMember) {
      workspace.members.push({
        userId,
        role: invite.role,
        joinedAt: new Date(),
      });
      await workspace.save();
    }

    invite.isAccepted = true;
    await invite.save();

    return workspace;
  }

  async updatePlan(
    workspaceId: string,
    plan: 'free' | 'pro' | 'enterprise',
  ): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    workspace.plan = plan;
    return workspace.save();
  }
}
