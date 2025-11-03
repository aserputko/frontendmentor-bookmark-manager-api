import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BookmarksModule,
    HealthModule,
  ],
})
export class AppModule {}
