import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Bookmarks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.tag.deleteMany({});
  });

  afterEach(async () => {
    // Clean database after each test
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.tag.deleteMany({});
  });

  it('/bookmarks (GET) - should return empty array when no bookmarks exist', async () => {
    const response = await request(app.getHttpServer()).get('/bookmarks').expect(200);

    expect(response.body).toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    });
  });

  it('/bookmarks (GET) - should return all bookmarks with tags', async () => {
    // Create test tags
    const tag1 = await prisma.tag.create({
      data: { title: 'JavaScript' },
    });

    const tag2 = await prisma.tag.create({
      data: { title: 'NestJS' },
    });

    // Create test bookmarks
    const bookmark1 = await prisma.bookmark.create({
      data: {
        title: 'NestJS Official Documentation',
        description: 'Progressive Node.js framework',
        websiteURL: 'https://nestjs.com',
        tags: {
          create: [{ tag: { connect: { id: tag1.id } } }, { tag: { connect: { id: tag2.id } } }],
        },
      },
    });

    const bookmark2 = await prisma.bookmark.create({
      data: {
        title: 'TypeScript Documentation',
        description: 'Typed superset of JavaScript',
        websiteURL: 'https://www.typescriptlang.org',
        tags: {
          create: [{ tag: { connect: { id: tag1.id } } }],
        },
      },
    });

    const response = await request(app.getHttpServer()).get('/bookmarks').expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    // Verify first bookmark
    const bookmark1Response = response.body.data.find((b: { id: string }) => b.id === bookmark1.id);
    expect(bookmark1Response).toBeDefined();
    expect(bookmark1Response.title).toBe('NestJS Official Documentation');
    expect(bookmark1Response.websiteURL).toBe('https://nestjs.com');
    expect(bookmark1Response.tags).toHaveLength(2);
    expect(bookmark1Response.tags.map((t: { title: string }) => t.title)).toEqual(
      expect.arrayContaining(['JavaScript', 'NestJS']),
    );

    // Verify second bookmark
    const bookmark2Response = response.body.data.find((b: { id: string }) => b.id === bookmark2.id);
    expect(bookmark2Response).toBeDefined();
    expect(bookmark2Response.title).toBe('TypeScript Documentation');
    expect(bookmark2Response.tags).toHaveLength(1);
  });

  it('/bookmarks (GET) - should support pagination', async () => {
    // Create 15 test bookmarks
    await prisma.bookmark.createMany({
      data: Array.from({ length: 15 }, (_, i) => ({
        title: `Bookmark ${i + 1}`,
        websiteURL: `https://example${i + 1}.com`,
        description: `Description ${i + 1}`,
      })),
    });

    // Test first page
    const page1Response = await request(app.getHttpServer())
      .get('/bookmarks?page=1&limit=10')
      .expect(200);

    expect(page1Response.body.data).toHaveLength(10);
    expect(page1Response.body.meta).toEqual({
      total: 15,
      page: 1,
      limit: 10,
      totalPages: 2,
    });

    // Test second page
    const page2Response = await request(app.getHttpServer())
      .get('/bookmarks?page=2&limit=10')
      .expect(200);

    expect(page2Response.body.data).toHaveLength(5);
    expect(page2Response.body.meta).toEqual({
      total: 15,
      page: 2,
      limit: 10,
      totalPages: 2,
    });
  });

  it('/bookmarks (GET) - should order bookmarks by createdAt desc', async () => {
    // Create bookmarks with delay to ensure different timestamps
    const bookmark1 = await prisma.bookmark.create({
      data: {
        title: 'First Bookmark',
        websiteURL: 'https://first.com',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const bookmark2 = await prisma.bookmark.create({
      data: {
        title: 'Second Bookmark',
        websiteURL: 'https://second.com',
      },
    });

    const response = await request(app.getHttpServer()).get('/bookmarks').expect(200);

    expect(response.body.data).toHaveLength(2);
    // Most recent bookmark should be first
    expect(response.body.data[0].id).toBe(bookmark2.id);
    expect(response.body.data[1].id).toBe(bookmark1.id);
  });

  it('/bookmarks (GET) - should handle bookmarks without tags', async () => {
    await prisma.bookmark.create({
      data: {
        title: 'Untagged Bookmark',
        description: 'This bookmark has no tags',
        websiteURL: 'https://untagged.com',
      },
    });

    const response = await request(app.getHttpServer()).get('/bookmarks').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].tags).toEqual([]);
  });
});
