import { IsArray, IsNotEmpty, IsOptional, IsString, IsInt, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptOrdersDto {
  @ApiProperty({ type: [Number], description: 'Array of Order integer IDs to accept' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderIds: number[];
}

export class RejectOrdersDto {
  @ApiProperty({ type: [Number], description: 'Array of Order integer IDs to reject' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderIds: number[];

  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RescheduleOrdersDto {
  @ApiProperty({ type: [Number], description: 'Array of Order integer IDs to reschedule' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderIds: number[];

  @ApiProperty({ description: 'New date for the order (e.g., 18 May 2024)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'New time for the order (e.g., 11:00 AM)' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({ description: 'Reschedule reason', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
