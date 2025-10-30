import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({
    example: 'NestJS Official Documentation',
    description: 'Bookmark title',
    maxLength: 280,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(280)
  title: string;

  @ApiProperty({
    example: 'Progressive Node.js framework',
    description: 'Bookmark description',
    required: false,
    maxLength: 280,
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @ApiProperty({
    example: 'https://nestjs.com',
    description: 'Website URL',
    maxLength: 1024,
  })
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(1024)
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
