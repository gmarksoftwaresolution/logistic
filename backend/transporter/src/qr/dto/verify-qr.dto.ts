import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class VerifyQrDto {
  @IsString()
  @IsNotEmpty()
  parcelId: string;

  @IsString()
  @IsOptional()
  verificationToken?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userRole?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  legType?: string;
}
