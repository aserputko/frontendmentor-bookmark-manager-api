import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DeleteBookmarkCommand } from './delete-bookmark.command';

@CommandHandler(DeleteBookmarkCommand)
export class DeleteBookmarkHandler implements ICommandHandler<DeleteBookmarkCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteBookmarkCommand): Promise<void> {
    const { id } = command;

    // Check if bookmark exists
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: { id },
    });

    if (!existingBookmark) {
      throw new NotFoundException(`Bookmark with ID ${id} not found`);
    }

    // Check if bookmark is archived
    if (!existingBookmark.archived) {
      throw new BadRequestException(
        `Bookmark with ID ${id} cannot be deleted because it is not archived`,
      );
    }

    // Delete the bookmark (cascade will handle related records)
    await this.prisma.bookmark.delete({
      where: { id },
    });
  }
}
