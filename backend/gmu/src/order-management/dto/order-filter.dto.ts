import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderFilterDto {
  @ApiProperty({
    description: 'Filter orders by status',
    example: 'PENDING',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Filter orders by creation date (YYYY-MM-DD)',
    example: '2026-06-22',
    required: false,
  })
  @IsString()
  @IsOptional()
  date?: string;
}
