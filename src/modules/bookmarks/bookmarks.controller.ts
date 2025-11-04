import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateBookmarkCommand } from './commands/create-bookmark.command';
import { UpdateBookmarkCommand } from './commands/update-bookmark.command';
import { BookmarkResponseDto } from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { GetBookmarksQueryDto } from './dto/get-bookmarks-query.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
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

  @Put(':id')
  @ApiOperation({ summary: 'Update a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark updated successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new UpdateBookmarkCommand(id, dto));
  }
}
