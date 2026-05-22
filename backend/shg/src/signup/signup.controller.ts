import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignupService } from './signup.service';
import { SendOtpDto, VerifyOtpDto } from '../auth/dto/auth.dto';
import {
  ProfileDto,
  ShgDetailsDto,
  NonShgRoleDto,
  ProductsDto,
  AddressDto,
  DocumentsDto,
  BankDetailsDto,
  OtherDetailsDto,
} from './dto/signup.dto';
import { GetUser } from '../common/decorators/user.decorator';
import { User } from '@prisma/client';

@ApiTags('Signup')
@Controller('signup')
export class SignupController {
  constructor(private signupService: SignupService) {}

  // ─── OTP ENDPOINTS ──────────────────────────────────────────────────────────

  @Post('send-otp')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for signup' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendSignupOtp(@Body() dto: SendOtpDto) {
    return this.signupService.sendSignupOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get JWT token' })
  @ApiResponse({ status: 200, description: 'OTP verified, JWT token returned' })
  async verifySignupOtp(@Body() dto: VerifyOtpDto) {
    return this.signupService.verifySignupOtp(dto);
  }

  // ─── STEP 1: Profile ────────────────────────────────────────────────────────

  @Post('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Step 1: Save profile (userType, fullName, age, photo)' })
  @ApiResponse({ status: 201, description: 'Profile saved' })
  async saveProfile(@GetUser() user: User, @Body() dto: ProfileDto) {
    return this.signupService.saveProfile(user.id, dto);
  }

  // ─── SHG Details (SHG flow only) ────────────────────────────────────────────

  @Post('shg-details')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'SHG Flow: Save SHG group details and role' })
  @ApiResponse({ status: 201, description: 'SHG details saved' })
  async saveShgDetails(@GetUser() user: User, @Body() dto: ShgDetailsDto) {
    return this.signupService.saveShgDetails(user.id, dto);
  }

  // ─── Non-SHG Role (Non-SHG flow only) ───────────────────────────────────────

  @Post('non-shg-role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Non-SHG Flow: Save role selection' })
  @ApiResponse({ status: 201, description: 'Non-SHG role saved' })
  async saveNonShgRole(@GetUser() user: User, @Body() dto: NonShgRoleDto) {
    return this.signupService.saveNonShgRole(user.id, dto);
  }

  // ─── STEP 2 (SHG): Products ─────────────────────────────────────────────────

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'SHG Flow Step 2: Save product details' })
  @ApiResponse({ status: 201, description: 'Products saved' })
  async saveProducts(@GetUser() user: User, @Body() dto: ProductsDto) {
    return this.signupService.saveProducts(user.id, dto);
  }

  // ─── Address ─────────────────────────────────────────────────────────────────

  @Post('address')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save address details' })
  @ApiResponse({ status: 201, description: 'Address saved' })
  async saveAddress(@GetUser() user: User, @Body() dto: AddressDto) {
    return this.signupService.saveAddress(user.id, dto);
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  @Post('documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save document details (Aadhaar, PAN)' })
  @ApiResponse({ status: 201, description: 'Documents saved' })
  async saveDocuments(@GetUser() user: User, @Body() dto: DocumentsDto) {
    return this.signupService.saveDocuments(user.id, dto);
  }

  // ─── Bank Details ───────────────────────────────────────────────────────────

  @Post('bank-details')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save bank account details' })
  @ApiResponse({ status: 201, description: 'Bank details saved' })
  async saveBankDetails(@GetUser() user: User, @Body() dto: BankDetailsDto) {
    return this.signupService.saveBankDetails(user.id, dto);
  }

  // ─── Other Details (Final Step) ─────────────────────────────────────────────

  @Post('other-details')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Final step: Save availability, work area, vehicle details' })
  @ApiResponse({ status: 201, description: 'Signup completed, application submitted' })
  async saveOtherDetails(@GetUser() user: User, @Body() dto: OtherDetailsDto) {
    return this.signupService.saveOtherDetails(user.id, dto);
  }

  // ─── Progress ───────────────────────────────────────────────────────────────

  @Get('progress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current signup progress and step status' })
  @ApiResponse({ status: 200, description: 'Signup progress returned' })
  async getProgress(@GetUser() user: User) {
    return this.signupService.getSignupProgress(user.id);
  }
}
