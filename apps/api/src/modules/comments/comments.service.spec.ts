import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { Comment } from './schemas/comment.schema';
import { Notification } from './schemas/notification.schema';
import { User } from '../users/schemas/user.schema';
import { CardsService } from '../cards/cards.service';
import { RealtimeGateway } from '../realtime/gateways/realtime.gateway';

jest.mock('../realtime/gateways/realtime.gateway', () => ({
  RealtimeGateway: class RealtimeGatewayMock {},
}));

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentInstance = {
    _id: 'comment_123',
    cardId: 'card_123',
    userId: 'user_1',
    content: 'Hello @alice and @bob',
    mentions: ['user_2', 'user_3'],
    save: jest.fn().mockResolvedValue({
      _id: 'comment_123',
      cardId: 'card_123',
      userId: 'user_1',
      content: 'Hello @alice and @bob',
      mentions: ['user_2', 'user_3'],
      toJSON: () => ({ id: 'comment_123', content: 'Hello @alice and @bob' }),
    }),
  };

  const mockCommentModel: any = jest.fn().mockImplementation(() => mockCommentInstance);
  mockCommentModel.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockCommentInstance]),
        }),
      }),
    }),
  });
  mockCommentModel.findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCommentInstance),
      }),
    }),
    exec: jest.fn().mockResolvedValue(mockCommentInstance),
  });
  mockCommentModel.deleteOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  });

  const mockNotificationInstance = {
    _id: 'notif_123',
    save: jest.fn().mockResolvedValue({
      _id: 'notif_123',
      toJSON: () => ({ id: 'notif_123' }),
    }),
  };
  const mockNotificationModel: any = jest.fn().mockImplementation(() => mockNotificationInstance);
  mockNotificationModel.findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockNotificationInstance),
    }),
  });
  mockNotificationModel.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });
  mockNotificationModel.deleteMany = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  });
  mockNotificationModel.findOneAndUpdate = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'notif_123', read: true }),
    }),
  });
  mockNotificationModel.updateMany = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
  });

  const mockUserModel: any = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'user_1', name: 'Author' }),
    }),
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: 'user_2', name: 'alice', email: 'alice@example.com' },
        { _id: 'user_3', name: 'bob', email: 'bob@example.com' },
      ]),
    }),
  };

  const mockCardsService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'card_123',
      boardId: 'board_123',
      title: 'Design Logo',
    }),
  };

  const mockRealtimeGateway = {
    emitToBoard: jest.fn(),
    emitToCard: jest.fn(),
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken(Comment.name), useValue: mockCommentModel },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: CardsService, useValue: mockCardsService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list comments for a card', async () => {
    const comments = await service.findByCard('card_123', 'user_1');
    expect(comments).toBeDefined();
    expect(mockCardsService.findOne).toHaveBeenCalledWith('card_123', 'user_1');
  });

  it('should create comment, parse @mentions, and emit notifications', async () => {
    const created = await service.create('user_1', {
      cardId: 'card_123',
      content: 'Hey @alice and @bob check this out',
    });

    expect(created).toBeDefined();
    expect(mockUserModel.find).toHaveBeenCalled();
    expect(mockRealtimeGateway.emitToUser).toHaveBeenCalledWith(
      'user_2',
      'notification:new',
      expect.anything(),
    );
    expect(mockRealtimeGateway.emitToBoard).toHaveBeenCalledWith(
      'board_123',
      'comment:created',
      expect.anything(),
    );
  });
});
