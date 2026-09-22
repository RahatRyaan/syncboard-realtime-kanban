import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { Board } from './schemas/board.schema';
import { WorkspacesService } from '../workspaces/workspaces.service';

describe('BoardsService - Plan Gating', () => {
  let service: BoardsService;

  const mockBoardInstance = {
    _id: 'board_123',
    title: 'New Board',
    save: jest.fn().mockResolvedValue({ id: 'board_123', title: 'New Board' }),
  };

  const mockBoardModel: any = jest.fn().mockImplementation(() => mockBoardInstance);
  mockBoardModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockBoardInstance]),
    }),
  });
  mockBoardModel.countDocuments = jest.fn();

  const mockWorkspacesService = {
    findById: jest.fn().mockResolvedValue({
      id: 'ws_123',
      name: 'Free Workspace',
      plan: 'free',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: getModelToken(Board.name), useValue: mockBoardModel },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  it('should reject creating 4th board on free plan with ForbiddenException', async () => {
    mockBoardModel.countDocuments.mockResolvedValue(3);

    await expect(
      service.create('user_1', {
        workspaceId: 'ws_123',
        title: 'Fourth Board',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow creating board when under limit', async () => {
    mockBoardModel.countDocuments.mockResolvedValue(2);

    const created = await service.create('user_1', {
      workspaceId: 'ws_123',
      title: 'Third Board',
    });

    expect(created).toBeDefined();
    expect(mockBoardInstance.save).toHaveBeenCalled();
  });
});
