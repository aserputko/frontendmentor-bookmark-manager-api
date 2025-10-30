import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateBookmarkCommand } from './commands/create-bookmark.command';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarkResponseDto } from './dto/bookmark-response.dto';
import { GetBookmarksQueryDto } from './dto/get-bookmarks-query.dto';
import { GetBookmarksResponse } from './queries/get-bookmarks.handler';
import { GetBookmarksQuery } from './queries/get-bookmarks.query';

@Controller('bookmarks')
@ApiTags('bookmarks')
@ApiExtraModels(BookmarkResponseDto)
export class BookmarksController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookmarks' })
  @ApiResponse({
    status: 200,
    description: 'List of bookmarks',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(BookmarkResponseDto) },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async findAll(@Query() query: GetBookmarksQueryDto): Promise<GetBookmarksResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    return this.queryBus.execute(new GetBookmarksQuery(page, limit));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new bookmark' })
  @ApiResponse({
    status: 201,
    description: 'Bookmark created successfully',
    type: BookmarkResponseDto,
  })
  async create(@Body() dto: CreateBookmarkDto): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new CreateBookmarkCommand(dto));
  }
}
