import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';
import { CreateBookmarkCommand } from './create-bookmark.command';
import { CreateBookmarkHandler } from './create-bookmark.handler';

describe('CreateBookmarkHandler', () => {
  let handler: CreateBookmarkHandler;

  const mockTransaction = jest.fn();

  const mockPrismaService = {
    $transaction: mockTransaction,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBookmarkHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<CreateBookmarkHandler>(CreateBookmarkHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a bookmark without tags', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        description: 'Test Description',
        websiteURL: 'https://example.com',
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: dto.description,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          description: dto.description || null,
          websiteURL: dto.websiteURL,
        },
      });
      expect(mockTx.bookmark.findUnique).toHaveBeenCalledWith({
        where: { id: mockBookmark.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toBeInstanceOf(Object);
      expect(result.id).toBe(mockBookmark.id);
      expect(result.title).toBe(dto.title);
      expect(result.description).toBe(dto.description);
      expect(result.websiteURL).toBe(dto.websiteURL);
      expect(result.tags).toEqual([]);
    });

    it('should create a bookmark with new tags', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        description: 'Test Description',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', 'Node.js'],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: dto.description,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
        bookmarkTag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.create).toHaveBeenCalled();
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
      expect(mockTx.tag.findMany).toHaveBeenCalledWith({
        where: {
          title: {
            in: ['JavaScript', 'Node.js'],
          },
        },
      });
      expect(mockTx.bookmarkTag.createMany).toHaveBeenCalledWith({
        data: [
          { bookmarkId: mockBookmark.id, tagId: mockTags[0].id },
          { bookmarkId: mockBookmark.id, tagId: mockTags[1].id },
        ],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0].title).toBe('JavaScript');
      expect(result.tags[1].title).toBe('Node.js');
    });

    it('should reuse existing tags when provided', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', 'TypeScript'],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'TypeScript', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }), // No new tags created
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
        bookmarkTag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.tag.createMany).toHaveBeenCalled(); // Still called, but no duplicates created
      expect(mockTx.tag.findMany).toHaveBeenCalled();
      expect(mockTx.bookmarkTag.createMany).toHaveBeenCalled();
      expect(result.tags).toHaveLength(2);
    });

    it('should filter out duplicate tags from input', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', 'JavaScript', 'Node.js', 'Node.js'],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
        bookmarkTag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      // Should only create 2 unique tags, not 4
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
    });

    it('should filter out empty tag strings', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', '', '   ', 'Node.js'],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
        bookmarkTag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      // Should filter out empty strings and whitespace-only strings
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
      expect(result.tags).toHaveLength(2);
    });

    it('should handle bookmark with null description', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          description: null,
          websiteURL: dto.websiteURL,
        },
      });
      expect(result.description).toBeNull();
    });

    it('should trim tag titles before creating them', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: ['  JavaScript  ', '  Node.js  '],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTags = [
        { id: 'tag-id-1', title: 'JavaScript', createdAt: new Date(), updatedAt: new Date() },
        { id: 'tag-id-2', title: 'Node.js', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [{ tag: mockTags[0] }, { tag: mockTags[1] }],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
          findMany: jest.fn().mockResolvedValue(mockTags),
        },
        bookmarkTag: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      await handler.execute(command);

      // Should trim whitespace from tag titles
      expect(mockTx.tag.createMany).toHaveBeenCalledWith({
        data: [{ title: 'JavaScript' }, { title: 'Node.js' }],
        skipDuplicates: true,
      });
    });

    it('should not create tags or relationships when tags array is empty', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: [],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn(),
          findMany: jest.fn(),
        },
        bookmarkTag: {
          createMany: jest.fn(),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.create).toHaveBeenCalled();
      expect(mockTx.tag.createMany).not.toHaveBeenCalled();
      expect(mockTx.tag.findMany).not.toHaveBeenCalled();
      expect(mockTx.bookmarkTag.createMany).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
    });

    it('should handle all tags being filtered out (empty strings only)', async () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        websiteURL: 'https://example.com',
        tags: ['', '   ', '\t'],
      };

      const mockBookmark = {
        id: 'bookmark-id-1',
        title: dto.title,
        description: null,
        websiteURL: dto.websiteURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBookmarkWithTags = {
        ...mockBookmark,
        tags: [],
      };

      const mockTx = {
        bookmark: {
          create: jest.fn().mockResolvedValue(mockBookmark),
          findUnique: jest.fn().mockResolvedValue(mockBookmarkWithTags),
        },
        tag: {
          createMany: jest.fn(),
          findMany: jest.fn(),
        },
        bookmarkTag: {
          createMany: jest.fn(),
        },
      };

      mockTransaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return await callback(mockTx);
        },
      );

      const command = new CreateBookmarkCommand(dto);
      const result = await handler.execute(command);

      expect(mockTx.bookmark.create).toHaveBeenCalled();
      expect(mockTx.tag.createMany).not.toHaveBeenCalled();
      expect(mockTx.tag.findMany).not.toHaveBeenCalled();
      expect(mockTx.bookmarkTag.createMany).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
    });
  });
});
