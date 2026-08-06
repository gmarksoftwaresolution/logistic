import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRequestDto {
  @ApiProperty({ example: 'Invalid documents' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}
