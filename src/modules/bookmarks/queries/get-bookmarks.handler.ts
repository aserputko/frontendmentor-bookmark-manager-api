import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BookmarkResponseDto } from '../dto/bookmark-response.dto';
import { GetBookmarksQuery } from './get-bookmarks.query';

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
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
      this.prisma.bookmark.count(),
    ]);

    const bookmarksWithTags = bookmarks.map((bookmark) => ({
      ...bookmark,
      tags: bookmark.tags.map((bt) => bt.tag),
    }));

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
