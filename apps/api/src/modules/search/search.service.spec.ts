import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { Board } from '../boards/schemas/board.schema';
import { Card } from '../cards/schemas/card.schema';
import { WorkspacesService } from '../workspaces/workspaces.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockBoardModel: any = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: 'board_1' }]),
      }),
      limit: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'board_1', title: 'Sprint Board', description: 'Sprint tasks' },
        ]),
      }),
    }),
  };

  const mockCardModel: any = {
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'card_1', title: 'Implement Auth', description: 'JWT auth flow' },
        ]),
      }),
    }),
  };

  const mockWorkspacesService = {
    findById: jest.fn().mockResolvedValue({
      id: 'ws_123',
      name: 'Test Workspace',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getModelToken(Board.name), useValue: mockBoardModel },
        { provide: getModelToken(Card.name), useValue: mockCardModel },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform workspace-scoped search across boards and cards', async () => {
    const result = await service.search('ws_123', 'auth', 'user_1');

    expect(mockWorkspacesService.findById).toHaveBeenCalledWith('ws_123', 'user_1');
    expect(result.query).toBe('auth');
    expect(result.workspaceId).toBe('ws_123');
    expect(result.boards.length).toBe(1);
    expect(result.cards.length).toBe(1);
    expect(result.totalResults).toBe(2);
  });

  it('should return empty results for empty query', async () => {
    const result = await service.search('ws_123', '', 'user_1');
    expect(result.totalResults).toBe(0);
    expect(result.boards).toEqual([]);
    expect(result.cards).toEqual([]);
  });
});
