import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookmarksController } from './bookmarks.controller';
import { GetBookmarksHandler } from './queries/get-bookmarks.handler';

@Module({
  imports: [CqrsModule],
  controllers: [BookmarksController],
  providers: [GetBookmarksHandler, PrismaService],
})
export class BookmarksModule {}
