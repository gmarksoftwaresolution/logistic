import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  Step1PersonalDetailsDto,
  Step2DrivingDetailsDto,
  Step3BankDetailsDto,
  Step4VehicleTypeDto,
  Step5PersonalVehicleDto,
  Step6PersonalRouteDto,
  Step5MilkVanOrgDto,
  Step6MilkVanRouteDto,
  Step7MilkVanVehicleDto,
  SelectLanguageDto,
  SendOtpDto,
  VerifyOtpDto,
  MilkOrganizationDetailsDto,
} from './dto/registration.dto';

@ApiTags('Registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  // --- Public Signup Flow (Merged) ---

  @Post('select-language')
  @ApiOperation({ summary: 'Step 0: Select Language' })
  @ApiResponse({ status: 200, description: 'Language selected successfully' })
  selectLanguage(@Body() dto: SelectLanguageDto) {
    return this.registrationService.selectLanguage(dto);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Step 1: Send OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.registrationService.sendOtp(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2: Verify OTP and get JWT' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.registrationService.verifyOtp(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current registration status and data' })
  getMe(@Request() req: any) {
    return this.registrationService.getRegistrationStatus(req.user.phoneNumber);
  }

  // --- Authenticated Registration Steps ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step1')
  @ApiOperation({ summary: 'Step 1: Save Personal Details' })
  saveStep1(@Request() req: any, @Body() dto: Step1PersonalDetailsDto) {
    dto.phoneNumber = req.user.phoneNumber;
    return this.registrationService.saveStep1(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step2')
  @ApiOperation({ summary: 'Step 2: Save Driving Details' })
  saveStep2(@Request() req: any, @Body() dto: Step2DrivingDetailsDto) {
    return this.registrationService.saveStep2(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step3')
  @ApiOperation({ summary: 'Step 3: Save Bank Details' })
  saveStep3(@Request() req: any, @Body() dto: Step3BankDetailsDto) {
    return this.registrationService.saveStep3(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step4')
  @ApiOperation({ summary: 'Step 4: Save Vehicle Type Selection' })
  saveStep4(@Request() req: any, @Body() dto: Step4VehicleTypeDto) {
    return this.registrationService.saveStep4(req.user.phoneNumber, dto);
  }

  // Personal Flow
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step5-personal')
  @ApiOperation({ summary: 'Step 5 (Personal): Save Vehicle Details' })
  saveStep5Personal(@Request() req: any, @Body() dto: Step5PersonalVehicleDto) {
    return this.registrationService.saveStep5Personal(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step6-personal')
  @ApiOperation({ summary: 'Step 6 (Personal): Save Route Details & Finish' })
  saveStep6Personal(@Request() req: any, @Body() dto: Step6PersonalRouteDto) {
    return this.registrationService.saveStep6Personal(req.user.phoneNumber, dto);
  }

  // Milk Van Flow
  @Get('milk-sangathans')
  @ApiOperation({ summary: 'Get Milk Sangathan master options' })
  getMilkSangathans() {
    return this.registrationService.getMilkSangathans();
  }

  @Get('milk-centers/:sangathanName')
  @ApiOperation({ summary: 'Get related Milk Centers for a Sangathan' })
  getMilkCenters(@Param('sangathanName') sangathanName: string) {
    return this.registrationService.getMilkCenters(sangathanName);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('milk-organization-details')
  @ApiOperation({ summary: 'Save Milk Organization Details (Alternative to Step 5)' })
  saveMilkOrganizationDetails(@Request() req: any, @Body() dto: MilkOrganizationDetailsDto) {
    return this.registrationService.saveMilkOrganizationDetails(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step5-milk-van')
  @ApiOperation({ summary: 'Step 5 (Milk Van): Save Organization Details' })
  saveStep5MilkVan(@Request() req: any, @Body() dto: Step5MilkVanOrgDto) {
    return this.registrationService.saveStep5MilkVan(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step6-milk-van')
  @ApiOperation({ summary: 'Step 6 (Milk Van): Save Route Details' })
  saveStep6MilkVan(@Request() req: any, @Body() dto: Step6MilkVanRouteDto) {
    return this.registrationService.saveStep6MilkVan(req.user.phoneNumber, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('step7-milk-van')
  @ApiOperation({ summary: 'Step 7 (Milk Van): Save Vehicle Details & Finish' })
  saveStep7MilkVan(@Request() req: any, @Body() dto: Step7MilkVanVehicleDto) {
    return this.registrationService.saveStep7MilkVan(req.user.phoneNumber, dto);
  }
}
