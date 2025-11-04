import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { BOOKMARK_CONSTANTS } from '../constants/bookmark.constants';
export class CreateBookmarkDto {
  @ApiProperty({
    example: 'NestJS Official Documentation',
    description: 'Bookmark title',
    maxLength: BOOKMARK_CONSTANTS.MAX_TITLE_LENGTH,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(BOOKMARK_CONSTANTS.MAX_TITLE_LENGTH)
  title: string;

  @ApiProperty({
    example: 'Progressive Node.js framework',
    description: 'Bookmark description',
    required: false,
    maxLength: BOOKMARK_CONSTANTS.MAX_DESCRIPTION_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOKMARK_CONSTANTS.MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiProperty({
    example: 'https://nestjs.com',
    description: 'Website URL',
    maxLength: BOOKMARK_CONSTANTS.MAX_URL_LENGTH,
  })
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(BOOKMARK_CONSTANTS.MAX_URL_LENGTH)
  websiteURL: string;

  @ApiProperty({
    example: ['JavaScript', 'Node.js', 'Framework'],
    description: 'List of tag names',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
