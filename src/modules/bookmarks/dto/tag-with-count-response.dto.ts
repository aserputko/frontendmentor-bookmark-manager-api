import { ApiProperty } from '@nestjs/swagger';

export class TagWithCountResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Tag ID',
  })
  id: string;

  @ApiProperty({
    example: 'Figma',
    description: 'Tag title',
  })
  title: string;

  @ApiProperty({
    example: 6,
    description: 'Number of bookmarks with this tag',
  })
  count: number;

  constructor(partial: Partial<TagWithCountResponseDto>) {
    Object.assign(this, partial);
  }
}

