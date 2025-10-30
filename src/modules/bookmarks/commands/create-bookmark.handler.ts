import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BookmarkResponseDto } from '../dto/bookmark-response.dto';
import { CreateBookmarkCommand } from './create-bookmark.command';

type BookmarkWithTags = Prisma.BookmarkGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

type TransformedBookmark = Omit<BookmarkWithTags, 'tags'> & {
  tags: Array<{ id: string; title: string; createdAt: Date; updatedAt: Date }>;
};

@CommandHandler(CreateBookmarkCommand)
export class CreateBookmarkHandler implements ICommandHandler<CreateBookmarkCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateBookmarkCommand): Promise<BookmarkResponseDto> {
    const { dto } = command;

    // Execute everything in a single transaction
    const bookmark = await this.prisma.$transaction(async (tx) => {
      // Create bookmark
      const createdBookmark = await tx.bookmark.create({
        data: {
          title: dto.title,
          description: dto.description || null,
          websiteURL: dto.websiteURL,
        },
      });

      // Handle tags if provided
      if (dto.tags && dto.tags.length > 0) {
        // Remove duplicates and empty strings, then trim
        const uniqueTags = Array.from(
          new Set(dto.tags.filter((tag) => tag.trim().length > 0).map((tag) => tag.trim())),
        );

        if (uniqueTags.length > 0) {
          // Create tags if they don't exist (using createMany with skipDuplicates)
          await tx.tag.createMany({
            data: uniqueTags.map((title) => ({ title })),
            skipDuplicates: true,
          });

          // Get all tag IDs (both existing and newly created)
          const tags = await tx.tag.findMany({
            where: {
              title: {
                in: uniqueTags,
              },
            },
          });

          // Create bookmark-tag relationships
          if (tags.length > 0) {
            await tx.bookmarkTag.createMany({
              data: tags.map((tag) => ({
                bookmarkId: createdBookmark.id,
                tagId: tag.id,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      // Fetch the complete bookmark with tags
      const bookmarkWithTags = await tx.bookmark.findUnique({
        where: { id: createdBookmark.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Transform the bookmark to match the response format
      const { tags, ...rest } = bookmarkWithTags!;
      const transformed: TransformedBookmark = {
        ...rest,
        tags: tags.map(
          (bt) => bt.tag as { id: string; title: string; createdAt: Date; updatedAt: Date },
        ),
      } as TransformedBookmark;

      return transformed;
    });

    return new BookmarkResponseDto(bookmark);
  }
}
