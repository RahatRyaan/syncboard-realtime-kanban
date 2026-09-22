import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MembershipRole } from '@syncboard/shared-types';
import { Workspace, WorkspaceDocument } from '../../modules/workspaces/schemas/workspace.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User context missing');
    }

    // Extract workspace ID from route params (e.g. :id or :workspaceId) or body or query
    const workspaceId =
      request.params?.id ||
      request.params?.workspaceId ||
      request.body?.workspaceId ||
      request.query?.workspaceId;

    if (!workspaceId) {
      // No workspace context on this route, pass through
      return true;
    }

    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === user.sub,
    );

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    request.membership = member;
    request.workspace = workspace;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}, your role: ${member.role}`,
      );
    }

    return true;
  }
}
