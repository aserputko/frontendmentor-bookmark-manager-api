import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BookmarkResponseDto } from '../dto/bookmark-response.dto';
import { GetBookmarksQuery } from './get-bookmarks.query';

type BookmarkWithTags = Prisma.BookmarkGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

type TransformedBookmark = Omit<BookmarkWithTags, 'tags'> & {
  tags: Array<{ id: string; title: string; createdAt: Date; updatedAt: Date }>;
};

export interface GetBookmarksResponse {
  data: BookmarkResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@QueryHandler(GetBookmarksQuery)
export class GetBookmarksHandler implements IQueryHandler<GetBookmarksQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBookmarksQuery): Promise<GetBookmarksResponse> {
    const { page, limit, search, archived, sortBy } = query;
    const skip = (page - 1) * limit;

    const whereConditions: {
      title?: { contains: string; mode: 'insensitive' };
      archived: boolean;
    } = {
      archived: archived !== undefined ? archived : false,
    };

    if (search && search.trim().length > 0) {
      whereConditions.title = {
        contains: search,
        mode: 'insensitive' as const,
      };
    }

    const where = whereConditions;

    // Build orderBy array: pinned first, then by sortBy
    const orderBy: Array<Record<string, 'asc' | 'desc'>> = [
      {
        pinned: 'desc',
      },
    ];

    // Add secondary sort based on sortBy parameter
    switch (sortBy) {
      case 'recently-visited':
        orderBy.push({ visitedAt: 'desc' });
        // Fallback to createdAt for bookmarks without visitedAt
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'most-visited':
        orderBy.push({ visitedCount: 'desc' });
        // Fallback to createdAt for bookmarks with same visit count
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'recently-added':
      default:
        // Default to recently-added (createdAt desc)
        orderBy.push({ createdAt: 'desc' });
        break;
    }

    const [bookmarks, total]: [BookmarkWithTags[], number] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    const bookmarksWithTags: TransformedBookmark[] = bookmarks.map(
      (bookmark): TransformedBookmark => {
        const { tags, ...rest } = bookmark;
        return {
          ...rest,
          tags: tags.map(
            (bt) => bt.tag as { id: string; title: string; createdAt: Date; updatedAt: Date },
          ),
        } as TransformedBookmark;
      },
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: bookmarksWithTags.map((bookmark) => new BookmarkResponseDto(bookmark)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
