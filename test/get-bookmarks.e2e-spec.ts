import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupDatabase, setupPrisma, setupTestApp, teardownTestApp } from './test-helpers';

describe('GET /bookmarks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await setupTestApp();
    prisma = await setupPrisma();
  });

  afterAll(async () => {
    await teardownTestApp(app, prisma);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  it('should return empty array when no bookmarks exist', async () => {
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

  it('should return all bookmarks with tags', async () => {
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

  it('should support pagination', async () => {
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

  it('should order bookmarks by createdAt desc', async () => {
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

  it('should handle bookmarks without tags', async () => {
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

  describe('archived filter', () => {
    it('should filter archived bookmarks when archived=true', async () => {
      // Create archived and non-archived bookmarks
      const archivedBookmark = await prisma.bookmark.create({
        data: {
          title: 'Archived Bookmark',
          websiteURL: 'https://archived.com',
          archived: true,
        },
      });

      await prisma.bookmark.create({
        data: {
          title: 'Active Bookmark',
          websiteURL: 'https://active.com',
          archived: false,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/bookmarks?archived=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(archivedBookmark.id);
      expect(response.body.meta.total).toBe(1);
    });

    it('should filter non-archived bookmarks when archived=false', async () => {
      // Create archived and non-archived bookmarks
      await prisma.bookmark.create({
        data: {
          title: 'Archived Bookmark',
          websiteURL: 'https://archived.com',
          archived: true,
        },
      });

      const nonArchivedBookmark = await prisma.bookmark.create({
        data: {
          title: 'Active Bookmark',
          websiteURL: 'https://active.com',
          archived: false,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/bookmarks?archived=false')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(nonArchivedBookmark.id);
      expect(response.body.meta.total).toBe(1);
    });

    it('should default to archived=false when archived parameter is undefined', async () => {
      // Create archived and non-archived bookmarks
      await prisma.bookmark.create({
        data: {
          title: 'Archived Bookmark',
          websiteURL: 'https://archived.com',
          archived: true,
        },
      });

      const nonArchivedBookmark = await prisma.bookmark.create({
        data: {
          title: 'Active Bookmark',
          websiteURL: 'https://active.com',
          archived: false,
        },
      });

      const response = await request(app.getHttpServer()).get('/bookmarks').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(nonArchivedBookmark.id);
      expect(response.body.meta.total).toBe(1);
    });

    it('should combine archived filter with pagination', async () => {
      // Create archived bookmarks
      await prisma.bookmark.createMany({
        data: Array.from({ length: 15 }, (_, i) => ({
          title: `Archived Bookmark ${i + 1}`,
          websiteURL: `https://archived${i + 1}.com`,
          archived: true,
        })),
      });

      // Create non-archived bookmarks
      await prisma.bookmark.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Active Bookmark ${i + 1}`,
          websiteURL: `https://active${i + 1}.com`,
          archived: false,
        })),
      });

      // Test pagination with archived=true
      const page1Response = await request(app.getHttpServer())
        .get('/bookmarks?archived=true&page=1&limit=10')
        .expect(200);

      expect(page1Response.body.data).toHaveLength(10);
      expect(page1Response.body.meta).toEqual({
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      });

      // Test pagination with archived=false
      const activeResponse = await request(app.getHttpServer())
        .get('/bookmarks?archived=false&page=1&limit=10')
        .expect(200);

      expect(activeResponse.body.data).toHaveLength(5);
      expect(activeResponse.body.meta).toEqual({
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should correctly parse archived=false string query parameter', async () => {
      // Create archived and non-archived bookmarks
      await prisma.bookmark.create({
        data: {
          title: 'Archived Bookmark',
          websiteURL: 'https://archived.com',
          archived: true,
        },
      });

      const nonArchivedBookmark = await prisma.bookmark.create({
        data: {
          title: 'Active Bookmark',
          websiteURL: 'https://active.com',
          archived: false,
        },
      });

      // Test with string "false" (as Swagger sends it)
      const response = await request(app.getHttpServer())
        .get('/bookmarks?archived=false')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(nonArchivedBookmark.id);
      expect(response.body.meta.total).toBe(1);
    });

    it('should correctly parse archived=true string query parameter', async () => {
      // Create archived and non-archived bookmarks
      const archivedBookmark = await prisma.bookmark.create({
        data: {
          title: 'Archived Bookmark',
          websiteURL: 'https://archived.com',
          archived: true,
        },
      });

      await prisma.bookmark.create({
        data: {
          title: 'Active Bookmark',
          websiteURL: 'https://active.com',
          archived: false,
        },
      });

      // Test with string "true" (as Swagger sends it)
      const response = await request(app.getHttpServer())
        .get('/bookmarks?archived=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(archivedBookmark.id);
      expect(response.body.meta.total).toBe(1);
    });
  });

  describe('POST /bookmarks', () => {
    it('should create a bookmark with all fields', async () => {
      const createDto = {
        title: 'New Bookmark',
        description: 'A new bookmark description',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', 'Node.js'],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body.websiteURL).toBe(createDto.websiteURL);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: { title: string }) => t.title)).toEqual(
        expect.arrayContaining(['JavaScript', 'Node.js']),
      );

      // Verify in database
      const bookmark = await prisma.bookmark.findUnique({
        where: { id: response.body.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      expect(bookmark).toBeDefined();
      expect(bookmark?.tags).toHaveLength(2);
    });

    it('should create a bookmark without description', async () => {
      const createDto = {
        title: 'Bookmark Without Description',
        websiteURL: 'https://nodescription.com',
        tags: ['TypeScript'],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.title).toBe(createDto.title);
      expect(response.body.description).toBeNull();
      expect(response.body.websiteURL).toBe(createDto.websiteURL);
      expect(response.body.tags).toHaveLength(1);
    });

    it('should create a bookmark without tags', async () => {
      const createDto = {
        title: 'Untagged Bookmark',
        description: 'No tags here',
        websiteURL: 'https://notags.com',
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.title).toBe(createDto.title);
      expect(response.body.tags).toEqual([]);
    });

    it('should reuse existing tags when creating a bookmark', async () => {
      // Create an existing tag
      const existingTag = await prisma.tag.create({
        data: { title: 'JavaScript' },
      });

      const createDto = {
        title: 'Bookmark with Existing Tag',
        websiteURL: 'https://existingtag.com',
        tags: ['JavaScript', 'NewTag'],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.tags).toHaveLength(2);

      // Verify that the existing tag was reused (same ID)
      const bookmark = await prisma.bookmark.findUnique({
        where: { id: response.body.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      const reusedTag = bookmark?.tags.find((bt) => bt.tag.title === 'JavaScript');
      expect(reusedTag?.tag.id).toBe(existingTag.id);
    });

    it('should filter out duplicate tags from input', async () => {
      const createDto = {
        title: 'Bookmark with Duplicate Tags',
        websiteURL: 'https://duplicates.com',
        tags: ['JavaScript', 'JavaScript', 'Node.js', 'Node.js'],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      // Should only have 2 unique tags
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: { title: string }) => t.title)).toEqual(
        expect.arrayContaining(['JavaScript', 'Node.js']),
      );
    });

    it('should filter out empty tag strings', async () => {
      const createDto = {
        title: 'Bookmark with Empty Tags',
        websiteURL: 'https://emptytags.com',
        tags: ['JavaScript', '', '   ', 'Node.js'],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      // Should filter out empty strings
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: { title: string }) => t.title)).toEqual(
        expect.arrayContaining(['JavaScript', 'Node.js']),
      );
    });

    it('should trim whitespace from tag titles', async () => {
      const createDto = {
        title: 'Bookmark with Trimmed Tags',
        websiteURL: 'https://trimmed.com',
        tags: ['  JavaScript  ', '  Node.js  '],
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: { title: string }) => t.title)).toEqual(
        expect.arrayContaining(['JavaScript', 'Node.js']),
      );
    });

    it('should return 400 when title is missing', async () => {
      const createDto = {
        description: 'Missing title',
        websiteURL: 'https://notitle.com',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when websiteURL is missing', async () => {
      const createDto = {
        title: 'Missing URL',
        description: 'No URL provided',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when title exceeds 280 characters', async () => {
      const createDto = {
        title: 'a'.repeat(281),
        websiteURL: 'https://toolong.com',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when description exceeds 280 characters', async () => {
      const createDto = {
        title: 'Valid Title',
        description: 'a'.repeat(281),
        websiteURL: 'https://toolongdesc.com',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when websiteURL exceeds 1024 characters', async () => {
      const createDto = {
        title: 'Valid Title',
        websiteURL: 'https://example.com/' + 'a'.repeat(1024),
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when websiteURL is not a valid URL', async () => {
      const createDto = {
        title: 'Invalid URL',
        websiteURL: 'not-a-valid-url',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should return 400 when tags is not an array', async () => {
      const createDto = {
        title: 'Invalid Tags',
        websiteURL: 'https://invalidtags.com',
        tags: 'not-an-array',
      };

      await request(app.getHttpServer()).post('/bookmarks').send(createDto).expect(400);
    });

    it('should accept title with exactly 280 characters', async () => {
      const createDto = {
        title: 'a'.repeat(280),
        websiteURL: 'https://maxlength.com',
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.title).toBe('a'.repeat(280));
    });

    it('should accept description with exactly 280 characters', async () => {
      const createDto = {
        title: 'Valid Title',
        description: 'a'.repeat(280),
        websiteURL: 'https://maxdesc.com',
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.description).toBe('a'.repeat(280));
    });

    it('should accept websiteURL with exactly 1024 characters', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1024 - 23); // 23 for "https://example.com/"
      const createDto = {
        title: 'Valid Title',
        websiteURL: longUrl,
      };

      const response = await request(app.getHttpServer())
        .post('/bookmarks')
        .send(createDto)
        .expect(201);

      expect(response.body.websiteURL).toBe(longUrl);
    });
  });
});
