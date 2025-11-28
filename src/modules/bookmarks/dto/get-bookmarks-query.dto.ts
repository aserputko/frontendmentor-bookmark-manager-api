import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BOOKMARK_SORT_BY_OPTIONS, BookmarkSortBy } from '../queries/get-bookmarks.query';

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  // Handle array case (Express may parse query params as arrays)
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (lowerValue === 'true' || lowerValue === '1') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') {
      return false;
    }
  }
  return undefined;
}

export class GetBookmarksQueryDto {
  @ApiProperty({
    example: 1,
    description: 'Page number',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page (max 100)',
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    example: 'javascript',
    description: 'Search bookmarks by title (partial match, case-insensitive)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: false,
    description: 'Filter bookmarks by archived status (defaults to false if undefined)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  archived?: boolean;

  @ApiProperty({
    example: 'recently-added',
    description:
      'Sort order for bookmarks. Options: recently-added, recently-visited, most-visited',
    enum: BOOKMARK_SORT_BY_OPTIONS,
    required: false,
  })
  @IsOptional()
  @IsEnum(BOOKMARK_SORT_BY_OPTIONS)
  sortBy?: BookmarkSortBy;
}
