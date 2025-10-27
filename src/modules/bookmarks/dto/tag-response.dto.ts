import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Tag ID',
  })
  id: string;

  @ApiProperty({
    example: 'JavaScript',
    description: 'Tag title',
  })
  title: string;

  @ApiProperty({
    description: 'Tag creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Tag last update timestamp',
  })
  updatedAt: Date;

  constructor(partial: Partial<TagResponseDto>) {
    Object.assign(this, partial);
  }
}
