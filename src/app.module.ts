import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BookmarksModule,
  ],
})
export class AppModule {}
