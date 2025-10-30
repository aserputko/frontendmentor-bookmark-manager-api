import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupDatabase, setupPrisma, setupTestApp, teardownTestApp } from './test-helpers';

describe('POST /bookmarks (e2e)', () => {
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

  describe('Success cases', () => {
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

  describe('Validation errors', () => {
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
  });
});
