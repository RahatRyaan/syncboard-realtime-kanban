import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CardsService } from './cards.service';
import { Card } from './schemas/card.schema';
import { Column } from '../columns/schemas/column.schema';
import { BoardsService } from '../boards/boards.service';
import { StorageService } from '../storage/storage.service';

describe('CardsService', () => {
  let service: CardsService;

  const mockCardInstance: any = {
    _id: 'card_123',
    id: 'card_123',
    boardId: 'board_123',
    columnId: 'col_123',
    title: 'Test Card',
    description: 'Test Description',
    rank: 'a0',
    attachments: [
      {
        _id: 'att_123',
        id: 'att_123',
        name: 'spec.pdf',
        key: 'cards/card_123/spec.pdf',
        url: 'https://s3.amazonaws.com/spec.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      },
    ],
    version: 1,
    save: jest.fn().mockResolvedValue({
      id: 'card_123',
      title: 'Test Card',
      version: 1,
    }),
    toJSON: () => ({ id: 'card_123', title: 'Test Card' }),
  };

  const mockCardModel: any = jest.fn().mockImplementation(() => mockCardInstance);
  mockCardModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockCardInstance]),
    }),
  });
  mockCardModel.findById = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockCardInstance),
  });
  mockCardModel.findByIdAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({
      ...mockCardInstance,
      version: 2,
    }),
  });
  mockCardModel.findOneAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockCardInstance),
  });
  mockCardModel.deleteOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  });

  const mockColumnModel: any = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'col_123',
        boardId: 'board_123',
      }),
    }),
  };

  const mockBoardsService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'board_123',
      title: 'Main Board',
    }),
  };

  const mockStorageService = {
    createPresignedUploadUrl: jest.fn().mockResolvedValue({
      presignedUrl: 'https://s3.amazonaws.com/upload-url',
      key: 'cards/card_123/file.pdf',
      url: 'https://s3.amazonaws.com/file.pdf',
      expiresIn: 300,
    }),
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        { provide: getModelToken(Card.name), useValue: mockCardModel },
        { provide: getModelToken(Column.name), useValue: mockColumnModel },
        { provide: BoardsService, useValue: mockBoardsService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return presigned URL for attachment upload', async () => {
    const result = await service.getPresignedAttachmentUrl('card_123', 'user_1', {
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.presignedUrl).toBeDefined();
    expect(mockStorageService.createPresignedUploadUrl).toHaveBeenCalled();
  });

  it('should add attachment to card', async () => {
    const updated = await service.addAttachment('card_123', 'user_1', {
      name: 'document.pdf',
      key: 'cards/card_123/document.pdf',
      url: 'https://s3.amazonaws.com/document.pdf',
      size: 2048,
      mimeType: 'application/pdf',
    });

    expect(updated).toBeDefined();
    expect(mockCardModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('should remove attachment from card and delete from S3', async () => {
    const result = await service.removeAttachment('card_123', 'att_123', 'user_1');

    expect(result.success).toBe(true);
    expect(mockStorageService.deleteFile).toHaveBeenCalledWith('cards/card_123/spec.pdf');
  });
});
