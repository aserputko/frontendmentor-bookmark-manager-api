import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TagWithCountResponseDto } from '../dto/tag-with-count-response.dto';
import { GetTagsQuery } from './get-tags.query';

export interface GetTagsResponse {
  data: TagWithCountResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@QueryHandler(GetTagsQuery)
export class GetTagsHandler implements IQueryHandler<GetTagsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTagsQuery): Promise<GetTagsResponse> {
    const { page, limit, archived } = query;
    const skip = (page - 1) * limit;

    // Default archived to false if not provided
    const archivedFilter = archived !== undefined ? archived : false;

    // First, get all bookmark IDs that match the archived filter
    const matchingBookmarkIds = await this.prisma.bookmark.findMany({
      where: {
        archived: archivedFilter,
      },
      select: {
        id: true,
      },
    });

    const bookmarkIds = matchingBookmarkIds.map((b) => b.id);

    // If no bookmarks match, return empty result
    if (bookmarkIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Group BookmarkTags by tagId and count, filtering by bookmarkIds
    const tagCounts = await this.prisma.bookmarkTag.groupBy({
      by: ['tagId'],
      where: {
        bookmarkId: {
          in: bookmarkIds,
        },
      },
      _count: {
        bookmarkId: true,
      },
    });

    // Sort by count descending
    const sortedTagCounts = tagCounts.sort(
      (a, b) => b._count.bookmarkId - a._count.bookmarkId,
    );

    // Get total count for pagination
    const total = sortedTagCounts.length;

    // Apply pagination
    const paginatedTagCounts = sortedTagCounts.slice(skip, skip + limit);

    // Fetch tag details for the paginated results
    const tagIds = paginatedTagCounts.map((tc) => tc.tagId);
    const tags = await this.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
    });

    // Create a map of tagId to tag for quick lookup
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    // Combine tag details with counts, maintaining sort order and adding secondary sort by title
    const tagsWithCounts = paginatedTagCounts
      .map((tc) => {
        const tag = tagMap.get(tc.tagId);
        if (!tag) return null;
        return new TagWithCountResponseDto({
          id: tag.id,
          title: tag.title,
          count: tc._count.bookmarkId,
        });
      })
      .filter((tag): tag is TagWithCountResponseDto => tag !== null)
      .sort((a, b) => {
        // Primary sort: count descending
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        // Secondary sort: title ascending
        return a.title.localeCompare(b.title);
      });

    const totalPages = Math.ceil(total / limit);

    return {
      data: tagsWithCounts,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

