import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GetBookmarksHandler } from './get-bookmarks.handler';
import { GetBookmarksQuery } from './get-bookmarks.query';

describe('GetBookmarksHandler', () => {
  let handler: GetBookmarksHandler;

  const mockBookmarks = [
    {
      id: 'bookmark-id-1',
      title: 'Bookmark 1',
      description: 'Description 1',
      websiteURL: 'https://example1.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [
        {
          tag: {
            id: 'tag-id-1',
            title: 'Tag 1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
    {
      id: 'bookmark-id-2',
      title: 'Bookmark 2',
      description: 'Description 2',
      websiteURL: 'https://example2.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [
        {
          tag: {
            id: 'tag-id-2',
            title: 'Tag 2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
  ];

  const mockPrismaService = {
    bookmark: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBookmarksHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<GetBookmarksHandler>(GetBookmarksHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return paginated bookmarks with tags', async () => {
      const query = new GetBookmarksQuery(1, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    it('should calculate skip correctly for page 2', async () => {
      const query = new GetBookmarksQuery(2, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue([]);
      mockPrismaService.bookmark.count.mockResolvedValue(20);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      const query = new GetBookmarksQuery(1, 5);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(17);

      const result = await handler.execute(query);

      expect(result.meta.totalPages).toBe(4); // Math.ceil(17 / 5) = 4
    });

    it('should transform bookmarks with tags correctly', async () => {
      const query = new GetBookmarksQuery(1, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      const result = await handler.execute(query);

      expect(result.data[0].tags).toBeDefined();
      expect(result.data[0].tags[0]).toHaveProperty('id');
      expect(result.data[0].tags[0]).toHaveProperty('title');
    });

    it('should return empty array when no bookmarks exist', async () => {
      const query = new GetBookmarksQuery(1, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue([]);
      mockPrismaService.bookmark.count.mockResolvedValue(0);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should handle bookmarks without tags', async () => {
      const bookmarkWithoutTags = [
        {
          id: 'bookmark-id-3',
          title: 'Bookmark 3',
          description: 'Description 3',
          websiteURL: 'https://example3.com',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
        },
      ];

      mockPrismaService.bookmark.findMany.mockResolvedValue(bookmarkWithoutTags);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      const result = await handler.execute(new GetBookmarksQuery(1, 10));

      expect(result.data[0].tags).toHaveLength(0);
    });
  });
});
