-- AlterTable
ALTER TABLE "bookmarks" ADD COLUMN     "visitedAt" TIMESTAMP(3),
ADD COLUMN     "visitedCount" INTEGER NOT NULL DEFAULT 0;
