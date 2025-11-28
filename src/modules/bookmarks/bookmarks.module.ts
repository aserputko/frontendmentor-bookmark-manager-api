import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookmarksController } from './bookmarks.controller';
import { ArchiveBookmarkHandler } from './commands/archive-bookmark.handler';
import { CreateBookmarkHandler } from './commands/create-bookmark.handler';
import { DeleteBookmarkHandler } from './commands/delete-bookmark.handler';
import { PinBookmarkHandler } from './commands/pin-bookmark.handler';
import { UnarchiveBookmarkHandler } from './commands/unarchive-bookmark.handler';
import { UnpinBookmarkHandler } from './commands/unpin-bookmark.handler';
import { UpdateBookmarkHandler } from './commands/update-bookmark.handler';
import { VisitBookmarkHandler } from './commands/visit-bookmark.handler';
import { GetBookmarksHandler } from './queries/get-bookmarks.handler';
import { GetTagsHandler } from './queries/get-tags.handler';

@Module({
  imports: [CqrsModule],
  controllers: [BookmarksController],
  providers: [
    CreateBookmarkHandler,
    UpdateBookmarkHandler,
    ArchiveBookmarkHandler,
    UnarchiveBookmarkHandler,
    DeleteBookmarkHandler,
    PinBookmarkHandler,
    UnpinBookmarkHandler,
    VisitBookmarkHandler,
    GetBookmarksHandler,
    GetTagsHandler,
    PrismaService,
  ],
})
export class BookmarksModule {}
