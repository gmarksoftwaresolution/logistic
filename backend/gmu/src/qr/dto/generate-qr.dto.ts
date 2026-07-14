import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class GenerateQrDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsBoolean()
  @IsOptional()
  regenerate?: boolean;
}
