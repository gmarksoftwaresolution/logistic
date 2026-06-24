import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShgActionDto {
  @ApiProperty({ example: 'SHG-MC-111' })
  @IsString()
  @IsNotEmpty()
  shgId: string;
}

export class ShgRescheduleDto {
  @ApiProperty({ example: 'SHG-MC-111' })
  @IsString()
  @IsNotEmpty()
  shgId: string;

  @ApiProperty({ example: '2 HOURS' })
  @IsString()
  @IsNotEmpty()
  duration: string; // e.g. "2 HOURS", "24 HOURS"
}

export class TransporterActionDto {
  @ApiProperty({ example: 'RP-TR-111' })
  @IsString()
  @IsNotEmpty()
  transporterId: string;
}

export class TransporterRescheduleDto {
  @ApiProperty({ example: 'RP-TR-111' })
  @IsString()
  @IsNotEmpty()
  transporterId: string;
}
