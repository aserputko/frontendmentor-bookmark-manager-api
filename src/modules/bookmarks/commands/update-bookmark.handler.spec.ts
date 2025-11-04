import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpdateBookmarkDto } from '../dto/update-bookmark.dto';
import { UpdateBookmarkCommand } from './update-bookmark.command';
import { UpdateBookmarkHandler } from './update-bookmark.handler';

describe('UpdateBookmarkHandler', () => {
  let handler: UpdateBookmarkHandler;

  const mockTransaction = jest.fn();
  const mockFindUnique = jest.fn();

  const mockPrismaService = {
    $transaction: mockTransaction,
    bookmark: {
      findUnique: mockFindUnique,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBookmarkHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<UpdateBookmarkHandler>(UpdateBookmarkHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const bookmarkId = 'bookmark-id-1';

    it('should update a bookmark without tags', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        description: 'Updated Description',
        websiteURL: 'https://updated.com',
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: 'Original Description',
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        description: dto.description,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: bookmarkId },
      });
      expect(mockTx.bookmark.update).toHaveBeenCalledWith({
        where: { id: bookmarkId },
        data: {
          title: dto.title,
          description: dto.description || null,
          websiteURL: dto.websiteURL,
        },
      });
      // When tags is undefined, we should not delete existing tags
      expect(mockTx.bookmarkTag.deleteMany).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(Object);
      expect(result.id).toBe(bookmarkId);
      expect(result.title).toBe(dto.title);
      expect(result.description).toBe(dto.description);
      expect(result.websiteURL).toBe(dto.websiteURL);
      expect(result.tags).toEqual([]);
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
      };

      mockFindUnique.mockResolvedValue(null);

      const command = new UpdateBookmarkCommand(bookmarkId, dto);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        `Bookmark with ID ${bookmarkId} not found`,
      );
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should update a bookmark with new tags', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: ['TypeScript', 'NestJS'],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'TypeScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'NestJS', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmarkTag.deleteMany).toHaveBeenCalledWith({
        where: {
          bookmarkId,
        },
      });
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'TypeScript' }, { title: 'NestJS' }],
        skipDuplicates: true,
      });
      expect(mockTx.tag.findMany).toHaveBeenCalledWith({
        where: {
          title: {
            in: ['TypeScript', 'NestJS'],
          },
        },
      });
      expect(mockTx.bookmarkTag.createMany).toHaveBeenCalledWith({
        data: [
          { bookmarkId, tagId: mockTags[0].id },
          { bookmarkId, tagId: mockTags[1].id },
        ],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0].title).toBe('TypeScript');
      expect(result.tags[1].title).toBe('NestJS');
    });

    it('should update a bookmark and remove all tags when tags array is empty', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: [],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn(),
          findMany: jest.fn(),
        },
        bookmarkTagCreate: {
          createMany: jest.fn(),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmarkTag.deleteMany).toHaveBeenCalledWith({
        where: {
          bookmarkId,
        },
      });
      expect(mockTx.tag.createMany).not.toHaveBeenCalled();
      expect(mockTx.tag.findMany).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
    });

    it('should update a bookmark and replace existing tags', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: ['NewTag1', 'NewTag2'],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'NewTag1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'NewTag2', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      // Should delete old tags first
      expect(mockTx.bookmarkTag.deleteMany).toHaveBeenCalledWith({
        where: {
          bookmarkId,
        },
      });
      // Then create new tags
      expect(mockTx.tag.createMany).toHaveBeenCalled();
      expect(mockTx.bookmarkTag.createMany).toHaveBeenCalled();
      expect(result.tags).toHaveLength(2);
    });

    it('should handle null description in update', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: 'Original Description',
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.update).toHaveBeenCalledWith({
        where: { id: bookmarkId },
        data: {
          title: dto.title,
          description: null,
          websiteURL: dto.websiteURL,
        },
      });
      expect(result.description).toBeNull();
    });

    it('should filter out duplicate tags from input', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: ['JavaScript', 'JavaScript', 'Node.js', 'Node.js'],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      // Should only create 2 unique tags, not 4
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
    });

    it('should filter out empty tag strings', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: ['JavaScript', '', '   ', 'Node.js'],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      // Should filter out empty strings and whitespace-only strings
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
    });

    it('should trim tag titles before creating them', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
        tags: ['  JavaScript  ', '  Node.js  '],
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      await handler.execute(command);

      // Should trim whitespace from tag titles
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
    });

    it('should not update tags when tags property is undefined', async () => {
      const dto: UpdateBookmarkDto = {
        title: 'Updated Bookmark',
        websiteURL: 'https://updated.com',
      };

      const mockExistingBookmark = {
        id: bookmarkId,
        title: 'Original Title',
        description: null,
        websiteURL: 'https://original.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBookmark = {
        ...mockExistingBookmark,
        title: dto.title,
        websiteURL: dto.websiteURL,
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockUpdatedBookmark,
        tags: [
          {
            tag: {
              id: 'tag-id-1',
              title: 'ExistingTag',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      mockFindUnique.mockResolvedValue(mockExistingBookmark);

      const mockTx = {
        bookmark: {
          update: jest.fn().mockResolvedValue(mockUpdatedBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        bookmarkTag: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        tag: {
          createMany: jest.fn(),
          findMany: jest.fn(),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new UpdateBookmarkCommand(bookmarkId, dto);
      const result = await handler.execute(command);

      // Should not touch tags when tags property is undefined
      expect(mockTx.bookmarkTag.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.tag.createMany).not.toHaveBeenCalled();
      expect(mockTx.tag.findMany).not.toHaveBeenCalled();
      expect(mockTx.bookmarkTag.createMany).not.toHaveBeenCalled();
      // Tags should remain unchanged
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].title).toBe('ExistingTag');
    });
  });
});

