import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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
import { ArchiveBookmarkCommand } from './commands/archive-bookmark.command';
import { CreateBookmarkCommand } from './commands/create-bookmark.command';
import { DeleteBookmarkCommand } from './commands/delete-bookmark.command';
import { PinBookmarkCommand } from './commands/pin-bookmark.command';
import { UnarchiveBookmarkCommand } from './commands/unarchive-bookmark.command';
import { UnpinBookmarkCommand } from './commands/unpin-bookmark.command';
import { UpdateBookmarkCommand } from './commands/update-bookmark.command';
import { VisitBookmarkCommand } from './commands/visit-bookmark.command';
import { BookmarkResponseDto } from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { GetBookmarksQueryDto } from './dto/get-bookmarks-query.dto';
import { GetTagsQueryDto } from './dto/get-tags-query.dto';
import { TagWithCountResponseDto } from './dto/tag-with-count-response.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { GetBookmarksResponse } from './queries/get-bookmarks.handler';
import { GetBookmarksQuery } from './queries/get-bookmarks.query';
import { GetTagsResponse } from './queries/get-tags.handler';
import { GetTagsQuery } from './queries/get-tags.query';

@Controller('bookmarks')
@ApiTags('bookmarks')
@ApiExtraModels(BookmarkResponseDto, TagWithCountResponseDto)
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
  @ApiQuery({ name: 'search', required: false, type: String, example: '' })
  @ApiQuery({ name: 'archived', required: false, type: Boolean, example: false })
  async findAll(
    @Query() query: GetBookmarksQueryDto,
    @Query('archived') rawArchived?: string | boolean,
  ): Promise<GetBookmarksResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    // Parse archived value - prioritize raw value to avoid transformation issues
    let archived: boolean;
    if (rawArchived !== undefined) {
      // Parse raw value directly to avoid DTO transformation issues
      const lowerValue = String(rawArchived).toLowerCase().trim();
      archived = lowerValue === 'true' || lowerValue === '1';
    } else if (query.archived !== undefined && typeof query.archived === 'boolean') {
      archived = query.archived;
    } else {
      archived = false;
    }

    return this.queryBus.execute(new GetBookmarksQuery(page, limit, query.search, archived));
  }

  @Get('tag-filters')
  @ApiOperation({ summary: 'Get all tag filters' })
  @ApiResponse({
    status: 200,
    description: 'List of tags with counts',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(TagWithCountResponseDto) },
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
  @ApiQuery({ name: 'archived', required: false, type: Boolean, example: false })
  async getFilters(
    @Query() query: GetTagsQueryDto,
    @Query('archived') rawArchived?: string | boolean,
  ): Promise<GetTagsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    // Parse archived value - prioritize raw value to avoid transformation issues
    let archived: boolean | undefined;
    if (rawArchived !== undefined) {
      // Parse raw value directly to avoid DTO transformation issues
      const lowerValue = String(rawArchived).toLowerCase().trim();
      archived = lowerValue === 'true' || lowerValue === '1';
    } else if (query.archived !== undefined && typeof query.archived === 'boolean') {
      archived = query.archived;
    }
    // If archived is undefined, it will default to false in the handler

    return this.queryBus.execute(new GetTagsQuery(page, limit, archived));
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

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark archived successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async archive(@Param('id') id: string): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new ArchiveBookmarkCommand(id));
  }

  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark unarchived successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async unarchive(@Param('id') id: string): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new UnarchiveBookmarkCommand(id));
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Pin a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark pinned successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async pin(@Param('id') id: string): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new PinBookmarkCommand(id));
  }

  @Patch(':id/unpin')
  @ApiOperation({ summary: 'Unpin a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark unpinned successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async unpin(@Param('id') id: string): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new UnpinBookmarkCommand(id));
  }

  @Patch(':id/visit')
  @ApiOperation({ summary: 'Record a visit to a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark visit recorded successfully',
    type: BookmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async visit(@Param('id') id: string): Promise<BookmarkResponseDto> {
    return this.commandBus.execute(new VisitBookmarkCommand(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark' })
  @ApiParam({
    name: 'id',
    description: 'Bookmark ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Bookmark deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bookmark cannot be deleted because it is not archived',
  })
  @ApiResponse({
    status: 404,
    description: 'Bookmark not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteBookmarkCommand(id));
  }
}
