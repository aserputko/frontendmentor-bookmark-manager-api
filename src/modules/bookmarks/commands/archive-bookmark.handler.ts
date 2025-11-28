import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BookmarkResponseDto } from '../dto/bookmark-response.dto';
import { ArchiveBookmarkCommand } from './archive-bookmark.command';

type BookmarkWithTags = Prisma.BookmarkGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

type TransformedBookmark = Omit<BookmarkWithTags, 'tags'> & {
  tags: Array<{ id: string; title: string; createdAt: Date; updatedAt: Date }>;
};

@CommandHandler(ArchiveBookmarkCommand)
export class ArchiveBookmarkHandler implements ICommandHandler<ArchiveBookmarkCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ArchiveBookmarkCommand): Promise<BookmarkResponseDto> {
    const { id } = command;

    // Check if bookmark exists
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: { id },
    });

    if (!existingBookmark) {
      throw new NotFoundException(`Bookmark with ID ${id} not found`);
    }

    // Update bookmark archived status
    const bookmarkWithTags = await this.prisma.bookmark.update({
      where: { id },
      data: {
        archived: true,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Transform the bookmark to match the response format
    const { tags, ...rest } = bookmarkWithTags;
    const transformed: TransformedBookmark = {
      ...rest,
      tags: tags.map(
        (bt) => bt.tag as { id: string; title: string; createdAt: Date; updatedAt: Date },
      ),
    } as TransformedBookmark;

    return new BookmarkResponseDto(transformed);
  }
}
