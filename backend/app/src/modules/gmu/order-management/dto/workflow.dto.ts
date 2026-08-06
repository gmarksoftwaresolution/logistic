import { IsString, IsNotEmpty } from 'class-validator';
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
  duration: string;
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
