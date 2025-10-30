import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

export async function setupTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  await app.init();

  return app;
}

export async function setupPrisma(): Promise<PrismaClient> {
  const prisma = new PrismaClient();
  await prisma.$connect();
  return prisma;
}

export async function cleanupDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.bookmarkTag.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.tag.deleteMany({});
}

export async function teardownTestApp(
  app: INestApplication<App>,
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$disconnect();
  await app.close();
}
