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
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where =
      search && search.trim().length > 0
        ? {
            title: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : undefined;

    const [bookmarks, total]: [BookmarkWithTags[], number] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
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
