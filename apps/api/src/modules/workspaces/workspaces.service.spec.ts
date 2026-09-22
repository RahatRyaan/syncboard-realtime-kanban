import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { Workspace } from './schemas/workspace.schema';
import { Invite } from './schemas/invite.schema';
import { UsersService } from '../users/users.service';

describe('WorkspacesService - Plan Gating & Limits', () => {
  let service: WorkspacesService;

  const mockWorkspace = {
    _id: 'ws_123',
    name: 'Free Workspace',
    plan: 'free',
    members: [
      { userId: 'user_1', role: 'owner' },
      { userId: 'user_2', role: 'member' },
    ],
    save: jest.fn().mockResolvedValue(this),
  };

  const mockWorkspaceModel: any = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockWorkspace),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockWorkspace]),
      }),
    }),
  };

  const mockInviteModel: any = {
    create: jest.fn().mockResolvedValue({
      token: 'invite_token_123',
      email: 'new@example.com',
      role: 'member',
      expiresAt: new Date(),
    }),
    findOne: jest.fn(),
  };

  const mockUsersService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: getModelToken(Workspace.name), useValue: mockWorkspaceModel },
        { provide: getModelToken(Invite.name), useValue: mockInviteModel },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  it('should reject inviting 3rd member on free plan with ForbiddenException', async () => {
    await expect(
      service.createInvite('ws_123', 'user_1', {
        email: 'new@example.com',
        role: 'member',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow plan update to pro', async () => {
    const updated = await service.updatePlan('ws_123', 'pro');
    expect(mockWorkspaceModel.findById).toHaveBeenCalledWith('ws_123');
    expect(mockWorkspace.plan).toBe('pro');
  });
});
