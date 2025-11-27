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
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
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

    it('should filter bookmarks by search term', async () => {
      const filteredBookmarks = [mockBookmarks[0]];
      const query = new GetBookmarksQuery(1, 10, 'Bookmark 1');

      mockPrismaService.bookmark.findMany.mockResolvedValue(filteredBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'Bookmark 1',
            mode: 'insensitive',
          },
          archived: false,
        },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'Bookmark 1',
            mode: 'insensitive',
          },
          archived: false,
        },
      });
    });

    it('should perform case-insensitive search', async () => {
      const filteredBookmarks = [mockBookmarks[0]];
      const query = new GetBookmarksQuery(1, 10, 'bookmark 1');

      mockPrismaService.bookmark.findMany.mockResolvedValue(filteredBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            title: {
              contains: 'bookmark 1',
              mode: 'insensitive',
            },
            archived: false,
          },
        }),
      );
    });

    it('should perform partial match search', async () => {
      const filteredBookmarks = [mockBookmarks[0]];
      const query = new GetBookmarksQuery(1, 10, 'mark');

      mockPrismaService.bookmark.findMany.mockResolvedValue(filteredBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            title: {
              contains: 'mark',
              mode: 'insensitive',
            },
            archived: false,
          },
        }),
      );
    });

    it('should apply search filter to count query', async () => {
      const query = new GetBookmarksQuery(1, 10, 'javascript');

      mockPrismaService.bookmark.findMany.mockResolvedValue([]);
      mockPrismaService.bookmark.count.mockResolvedValue(5);

      const result = await handler.execute(query);

      expect(result.meta.total).toBe(5);
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'javascript',
            mode: 'insensitive',
          },
          archived: false,
        },
      });
    });

    it('should combine search with pagination', async () => {
      const query = new GetBookmarksQuery(2, 5, 'react');

      mockPrismaService.bookmark.findMany.mockResolvedValue([mockBookmarks[0]]);
      mockPrismaService.bookmark.count.mockResolvedValue(12);

      const result = await handler.execute(query);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.total).toBe(12);
      expect(result.meta.totalPages).toBe(3); // Math.ceil(12 / 5) = 3
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            title: {
              contains: 'react',
              mode: 'insensitive',
            },
            archived: false,
          },
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should not apply search filter when search is undefined', async () => {
      const query = new GetBookmarksQuery(1, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
    });

    it('should not apply search filter when search is empty string', async () => {
      const query = new GetBookmarksQuery(1, 10, '');

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
    });

    it('should not apply search filter when search is only whitespace', async () => {
      const query = new GetBookmarksQuery(1, 10, '   ');

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
    });

    it('should filter bookmarks by archived=true', async () => {
      const archivedBookmarks = [mockBookmarks[0]];
      const query = new GetBookmarksQuery(1, 10, undefined, true);

      mockPrismaService.bookmark.findMany.mockResolvedValue(archivedBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: true },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: true } });
    });

    it('should filter bookmarks by archived=false', async () => {
      const query = new GetBookmarksQuery(1, 10, undefined, false);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
    });

    it('should default archived to false when undefined', async () => {
      const query = new GetBookmarksQuery(1, 10);

      mockPrismaService.bookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(2);

      await handler.execute(query);

      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: { archived: false },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({ where: { archived: false } });
    });

    it('should combine archived filter with search filter', async () => {
      const filteredBookmarks = [mockBookmarks[0]];
      const query = new GetBookmarksQuery(1, 10, 'Bookmark 1', true);

      mockPrismaService.bookmark.findMany.mockResolvedValue(filteredBookmarks);
      mockPrismaService.bookmark.count.mockResolvedValue(1);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'Bookmark 1',
            mode: 'insensitive',
          },
          archived: true,
        },
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
      expect(mockPrismaService.bookmark.count).toHaveBeenCalledWith({
        where: {
          title: {
            contains: 'Bookmark 1',
            mode: 'insensitive',
          },
          archived: true,
        },
      });
    });
  });
});
