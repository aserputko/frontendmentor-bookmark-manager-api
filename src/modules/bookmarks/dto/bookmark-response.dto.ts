import { ApiProperty } from '@nestjs/swagger';
import { TagResponseDto } from './tag-response.dto';

export class BookmarkResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Bookmark ID',
  })
  id: string;

  @ApiProperty({
    example: 'NestJS Official Documentation',
    description: 'Bookmark title',
  })
  title: string;

  @ApiProperty({
    example: 'Progressive Node.js framework',
    description: 'Bookmark description',
    required: false,
  })
  description: string | null;

  @ApiProperty({
    example: 'https://nestjs.com',
    description: 'Website URL',
  })
  websiteURL: string;

  @ApiProperty({
    example: false,
    description: 'Whether the bookmark is archived',
    default: false,
  })
  archived: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the bookmark is pinned',
    default: false,
  })
  pinned: boolean;

  @ApiProperty({
    type: [TagResponseDto],
    description: 'List of associated tags',
  })
  tags: TagResponseDto[];

  @ApiProperty({
    description: 'Bookmark creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Bookmark last update timestamp',
  })
  updatedAt: Date;

  constructor(partial: Partial<BookmarkResponseDto>) {
    Object.assign(this, partial);
    if (partial.tags) {
      this.tags = partial.tags.map((tag) => new TagResponseDto(tag));
    }
  }
}
