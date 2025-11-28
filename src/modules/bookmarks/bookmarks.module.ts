import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookmarksController } from './bookmarks.controller';
import { ArchiveBookmarkHandler } from './commands/archive-bookmark.handler';
import { CreateBookmarkHandler } from './commands/create-bookmark.handler';
import { PinBookmarkHandler } from './commands/pin-bookmark.handler';
import { UnarchiveBookmarkHandler } from './commands/unarchive-bookmark.handler';
import { UnpinBookmarkHandler } from './commands/unpin-bookmark.handler';
import { UpdateBookmarkHandler } from './commands/update-bookmark.handler';
import { VisitBookmarkHandler } from './commands/visit-bookmark.handler';
import { GetBookmarksHandler } from './queries/get-bookmarks.handler';

@Module({
  imports: [CqrsModule],
  controllers: [BookmarksController],
  providers: [
    CreateBookmarkHandler,
    UpdateBookmarkHandler,
    ArchiveBookmarkHandler,
    UnarchiveBookmarkHandler,
    PinBookmarkHandler,
    UnpinBookmarkHandler,
    VisitBookmarkHandler,
    GetBookmarksHandler,
    PrismaService,
  ],
})
export class BookmarksModule {}
