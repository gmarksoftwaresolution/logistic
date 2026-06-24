import { IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '1111111111', description: '10 digit mobile number' })
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Mobile number must contain only digits' })
  mobileNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '1111111111', description: '10 digit mobile number' })
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Mobile number must contain only digits' })
  mobileNumber: string;

  @ApiProperty({ example: '123456', description: '6 digit OTP' })
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}

export class LoginDto {
  @ApiProperty({ example: '1111111111', description: '10 digit mobile number' })
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Mobile number must contain only digits' })
  mobileNumber: string;

  @ApiProperty({ example: '123456', description: '6 digit OTP' })
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}
