import { IsNotEmpty, IsString, Length, Matches, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+91)?\d{10}$/, { message: 'Invalid mobile number format' })
  mobileNumber: string;

  @IsOptional()
  @IsString()
  appType?: 'SHG' | 'TRANSPORTER' | 'GMU_ADMIN' | string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+91)?\d{10}$/, { message: 'Invalid mobile number format' })
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  appType?: 'SHG' | 'TRANSPORTER' | 'GMU_ADMIN' | string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  userId: number;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
