import { IsNotEmpty, IsString, Matches, IsEnum, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export class SendOtpDto {
  @ApiProperty({ example: '9876543210', description: 'Mobile number (10 digits)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit number starting from 6' })
  mobileNumber: string;

  @ApiProperty({ example: 'English', enum: ['English', 'Hindi', 'Marathi'], required: false })
  @IsString()
  @IsOptional()
  @IsEnum(['English', 'Hindi', 'Marathi'])
  language?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210', description: 'Mobile number (10 digits)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit number starting from 6' })
  mobileNumber: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must be numeric' })
  otp: string;

  @ApiProperty({ example: 'English', enum: ['English', 'Hindi', 'Marathi'], required: false })
  @IsString()
  @IsOptional()
  @IsEnum(['English', 'Hindi', 'Marathi'])
  language?: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
