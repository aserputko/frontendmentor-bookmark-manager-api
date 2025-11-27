import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksController } from './bookmarks.controller';
import { BookmarkResponseDto } from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { GetBookmarksResponse } from './queries/get-bookmarks.handler';
import { GetBookmarksQuery } from './queries/get-bookmarks.query';

describe('BookmarksController', () => {
  let controller: BookmarksController;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  const mockBookmark: BookmarkResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Bookmark',
    description: 'Test Description',
    websiteURL: 'https://example.com',
    archived: false,
    tags: [
      {
        id: 'tag-id-1',
        title: 'Test Tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TagResponseDto,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResponse: GetBookmarksResponse = {
    data: [mockBookmark],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookmarksController>(BookmarksController);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return bookmarks with default pagination', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResponse);
      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(1, 10, undefined, false));
    });

    it('should return bookmarks with custom pagination', async () => {
      const customResponse: GetBookmarksResponse = {
        ...mockResponse,
        meta: {
          ...mockResponse.meta,
          page: 2,
          limit: 5,
        },
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(customResponse);

      const result = await controller.findAll({ page: 2, limit: 5 });

      expect(result).toEqual(customResponse);
      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(2, 5, undefined, false));
    });

    it('should use default page when not provided', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      await controller.findAll({ limit: 20 });

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(1, 20, undefined, false));
    });

    it('should use default limit when not provided', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      await controller.findAll({ page: 3 });

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(3, 10, undefined, false));
    });

    it('should pass search parameter to query', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      await controller.findAll({ search: 'javascript' });

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetBookmarksQuery(1, 10, 'javascript', false),
      );
    });

    it('should pass search parameter with pagination', async () => {
      const customResponse: GetBookmarksResponse = {
        ...mockResponse,
        meta: {
          ...mockResponse.meta,
          page: 2,
          limit: 5,
        },
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(customResponse);

      await controller.findAll({ page: 2, limit: 5, search: 'react' });

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(2, 5, 'react', false));
    });

    it('should pass archived parameter to query', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      await controller.findAll({ archived: true });

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(1, 10, undefined, true));
    });

    it('should default archived to false when undefined', async () => {
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResponse);

      await controller.findAll({});

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(1, 10, undefined, false));
    });

    it('should combine archived with search and pagination', async () => {
      const customResponse: GetBookmarksResponse = {
        ...mockResponse,
        meta: {
          ...mockResponse.meta,
          page: 2,
          limit: 5,
        },
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(customResponse);

      await controller.findAll({ page: 2, limit: 5, search: 'react', archived: true });

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBookmarksQuery(2, 5, 'react', true));
    });

    it('should handle empty results', async () => {
      const emptyResponse: GetBookmarksResponse = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(emptyResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should create a bookmark', async () => {
      const dto: CreateBookmarkDto = {
        title: 'New Bookmark',
        description: 'New Description',
        websiteURL: 'https://example.com',
        tags: ['JavaScript', 'Node.js'],
      };

      jest.spyOn(commandBus, 'execute').mockResolvedValue(mockBookmark);

      const result = await controller.create(dto);

      expect(result).toEqual(mockBookmark);
      expect(commandBus.execute).toHaveBeenCalled();
    });

    it('should create a bookmark without description', async () => {
      const dto: CreateBookmarkDto = {
        title: 'New Bookmark',
        websiteURL: 'https://example.com',
      };

      const bookmarkWithoutDescription = {
        ...mockBookmark,
        description: null,
      };

      jest.spyOn(commandBus, 'execute').mockResolvedValue(bookmarkWithoutDescription);

      const result = await controller.create(dto);

      expect(result).toEqual(bookmarkWithoutDescription);
      expect(commandBus.execute).toHaveBeenCalled();
    });

    it('should create a bookmark without tags', async () => {
      const dto: CreateBookmarkDto = {
        title: 'New Bookmark',
        websiteURL: 'https://example.com',
      };

      const bookmarkWithoutTags = {
        ...mockBookmark,
        tags: [],
      };

      jest.spyOn(commandBus, 'execute').mockResolvedValue(bookmarkWithoutTags);

      const result = await controller.create(dto);

      expect(result).toEqual(bookmarkWithoutTags);
      expect(commandBus.execute).toHaveBeenCalled();
    });
  });
});
