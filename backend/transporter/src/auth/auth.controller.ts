import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';

import { IsString, IsNotEmpty, IsOptional, Matches, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

const MOBILE_REGEX = /^[6789]\d{9}$/;


class SendOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit Indian number' })
  mobileNumber: string;

  @ApiProperty({ example: 'English' })
  @IsOptional()
  @IsString()
  @IsEnum(['English', 'Hindi', 'Marathi'])
  language?: string;
}


class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'Mobile number must be a valid 10-digit Indian number' })
  mobileNumber: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP for login' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 403, description: 'Registration incomplete. Please complete sign up first.' })
  @ApiResponse({ status: 404, description: 'User not registered. Please sign up first.' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.mobileNumber);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get JWT' })
  @ApiResponse({ status: 200, description: 'Verified' })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  @ApiResponse({ status: 403, description: 'Registration incomplete. Please complete sign up first.' })
  @ApiResponse({ status: 404, description: 'User not registered. Please sign up first.' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.mobileNumber, dto.otp);
  }
}
