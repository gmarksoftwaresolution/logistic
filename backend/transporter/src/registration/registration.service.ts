import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { ApplicationStatus, UserRole, VehicleType } from '@prisma/client';
import { VehicleCategory } from './dto/registration.dto';
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

@Injectable()
export class RegistrationService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  private async generateTransporterUniqueId(): Promise<string> {
    // Generate a random unique ID for the transporter since sequence table is removed
    const randomCode = Math.floor(10000 + Math.random() * 90000).toString();
    return `GMU-TP-${randomCode}`;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.applicationStatus,
      // Only include uniqueCode if it exists (i.e., after full registration)
      ...(user.uniqueCode ? { transporterUniqueId: user.uniqueCode } : {})
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // In a real app we might store refresh token somewhere or in a dedicated field
    // For now we omit storing it since refreshToken field is not in new User schema

    return { accessToken, refreshToken };
  }

  async getMilkSangathans() {
    return ['Gokul Kolhapur', 'Warna Kolhapur'];
  }

  async getMilkCenters(sangathanName: string) {
    return [`${sangathanName} Main Center`, `${sangathanName} Branch`];
  }

  // --- Signup Flow (Now part of Registration) ---

  async selectLanguage(dto: SelectLanguageDto) {
    const supportedLanguages = ['English', 'Hindi', 'Marathi'];
    if (!supportedLanguages.includes(dto.language)) {
      throw new BadRequestException('Unsupported language');
    }
    return { success: true, message: 'Language selected successfully', language: dto.language };
  }

  async sendOtp(dto: SendOtpDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber }
    });

    if (existing && existing.applicationStatus !== ApplicationStatus.PENDING) {
      throw new BadRequestException('this number is already registered so enter new number');
    }

    console.log(`Sending OTP 123456 to ${dto.mobileNumber} in ${dto.language}`);

    if (!existing) {
      await this.prisma.user.create({
        data: {
          phoneNumber: dto.mobileNumber,
          language: dto.language,
          role: UserRole.TRANSPORTER,
          applicationStatus: ApplicationStatus.PENDING,
          authId: randomUUID(),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { phoneNumber: dto.mobileNumber },
        data: {
          language: dto.language,
        },
      });
    }

    return { success: true, message: 'OTP sent successfully (Simulated: 123456)' };
  }


  async verifyOtp(dto: VerifyOtpDto) {
    if (dto.otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber },
    });

    if (!existingUser) {
      throw new NotFoundException('Transporter not found');
    }

    const user = await this.prisma.user.update({
      where: { phoneNumber: dto.mobileNumber },
      data: {
        isVerified: true,
        currentStep: existingUser?.currentStep && existingUser.currentStep > 0
          ? existingUser.currentStep
          : 1,
      },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      success: true,
      message: 'OTP verified successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.applicationStatus,
        currentStep: user.currentStep,
        language: user.language,
        requestId: user.id, // mapped ID since requestId is removed
      },
    };
  }

  async getRegistrationStatus(phoneNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
        vehicles: true,
        routeDetail: true,
        milkVanDetail: true,
        transporterDetail: true,
        documents: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Transporter not found');
    }

    const [firstName, ...lastNameParts] = (user.fullName || '').split(' ');

    // Map back to frontend expected structure
    return {
      ...user,
      requestId: user.id,
      transporterUniqueId: user.uniqueCode,
      vehicleCategory: user.transporterDetail?.vehicleCategory === VehicleType.MILK_VAN ? VehicleCategory.MILK_VAN : (user.transporterDetail?.vehicleCategory ? VehicleCategory.PERSONAL : null),
      personalDetails: user.address ? {
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: user.email,
        state: user.address.state,
        district: user.address.district,
        taluka: user.address.taluka,
        residentialAddress: user.address.addressLine1,
        pinCode: user.address.pincode,
        profilePhoto: user.profilePhoto,
      } : null,
      drivingDetails: user.drivingDetail ? {
        ...user.drivingDetail,
        licensePhoto: user.documents?.[0]?.drivingLicenseUrl || null,
        experienceYears: user.drivingDetail.drivingExperience,
      } : null,
      bankDetails: user.bankDetails?.[0] || null,
      vehicleDetails: user.vehicles?.[0] || null,
      routeDetails: user.routeDetail,
      milkVanDetails: user.milkVanDetail,
      milkVanRoute: user.routeDetail,
    };
  }

  // --- Registration Steps (Authenticated) ---

  async saveStep1(dto: Step1PersonalDetailsDto) {
    const user = await this.validateStep(dto.phoneNumber, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: `${dto.firstName} ${dto.lastName}`.trim(),
        email: dto.email,
        profilePhoto: dto.profilePhoto,
        currentStep: Math.max(user.currentStep, 2),
      },
    });

    await this.prisma.address.upsert({
      where: { userId: user.id },
      update: {
        addressLine1: dto.residentialAddress,
        state: dto.state,
        district: dto.district,
        taluka: dto.taluka,
        pincode: dto.pinCode,
      },
      create: {
        userId: user.id,
        addressLine1: dto.residentialAddress,
        state: dto.state,
        district: dto.district,
        taluka: dto.taluka,
        pincode: dto.pinCode,
      },
    });

    return { message: 'Step 1 completed', nextStep: 2 };
  }

  async saveStep2(phoneNumber: string, dto: Step2DrivingDetailsDto) {
    const user = await this.validateStep(phoneNumber, 2);

    await this.prisma.drivingDetail.upsert({
      where: { userId: user.id },
      update: {
        licenseNumber: dto.licenseNumber,
        expiryDate: new Date(dto.expiryDate),
        drivingExperience: dto.experienceYears,
      },
      create: {
        userId: user.id,
        licenseNumber: dto.licenseNumber,
        expiryDate: new Date(dto.expiryDate),
        drivingExperience: dto.experienceYears,
      },
    });

    // License photo to User or Document table - putting it in Documents
    const doc = await this.prisma.document.findFirst({
      where: { userId: user.id }
    });

    if (doc) {
      await this.prisma.document.update({
        where: { id: doc.id },
        data: {
          drivingLicenseNo: dto.licenseNumber,
          drivingLicenseUrl: dto.licensePhoto,
        },
      });
    } else {
      await this.prisma.document.create({
        data: {
          userId: user.id,
          drivingLicenseNo: dto.licenseNumber,
          drivingLicenseUrl: dto.licensePhoto,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 3) },
    });

    return { message: 'Step 2 completed', nextStep: 3 };
  }

  async saveStep3(phoneNumber: string, dto: Step3BankDetailsDto) {
    const user = await this.validateStep(phoneNumber, 3);

    const existingBanks = await this.prisma.bankDetail.findMany({ where: { userId: user.id } });
    if (existingBanks.length > 0) {
      await this.prisma.bankDetail.update({
        where: { id: existingBanks[0].id },
        data: {
          accountHolderName: dto.accountHolderName,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          branchName: dto.branchName,
          upiId: dto.upiId,
        }
      });
    } else {
      await this.prisma.bankDetail.create({
        data: {
          userId: user.id,
          accountHolderName: dto.accountHolderName,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          branchName: dto.branchName,
          upiId: dto.upiId,
        }
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 4) },
    });

    return { message: 'Step 3 completed', nextStep: 4 };
  }

  async saveStep4(phoneNumber: string, dto: Step4VehicleTypeDto) {
    const user = await this.validateStep(phoneNumber, 4);

    const vehicleType = dto.vehicleCategory === VehicleCategory.MILK_VAN ? VehicleType.MILK_VAN : VehicleType.OTHER;

    await this.prisma.transporterDetail.upsert({
      where: { userId: user.id },
      update: { vehicleCategory: vehicleType },
      create: { userId: user.id, vehicleCategory: vehicleType }
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 5) },
    });

    return { message: 'Step 4 completed', nextStep: 5 };
  }

  // PERSONAL BRANCH
  async saveStep5Personal(phoneNumber: string, dto: Step5PersonalVehicleDto) {
    const user = await this.validateStep(phoneNumber, 5, VehicleCategory.PERSONAL);

    const existingVehicles = await this.prisma.vehicle.findMany({ where: { userId: user.id } });
    const data = {
      vehicleType: VehicleType.OTHER,
      vehicleName: dto.make,
      registrationNumber: dto.number,
      rcUrl: dto.rcUpload,
      insuranceUrl: dto.insuranceUpload,
    };

    if (existingVehicles.length > 0) {
      await this.prisma.vehicle.update({
        where: { id: existingVehicles[0].id },
        data,
      });
    } else {
      await this.prisma.vehicle.create({
        data: { userId: user.id, ...data },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 6) },
    });

    return { message: 'Step 5 (Personal) completed', nextStep: 6 };
  }

  async saveStep6Personal(phoneNumber: string, dto: Step6PersonalRouteDto) {
    const user = await this.validateStep(phoneNumber, 6, VehicleCategory.PERSONAL);

    await this.prisma.routeDetail.upsert({
      where: { userId: user.id },
      update: {
        operatingArea: dto.operatingArea,
        pickupLocations: dto.pickupLocations,
        dropLocations: dto.dropLocations,
        workingDays: dto.workingDays,
        workingSchedule: dto.workingSchedule,
      } as any,
      create: {
        userId: user.id,
        operatingArea: dto.operatingArea,
        pickupLocations: dto.pickupLocations,
        dropLocations: dto.dropLocations,
        workingDays: dto.workingDays,
        workingSchedule: dto.workingSchedule,
      } as any,
    });

    return this.completeRegistration(user.id);
  }

  // MILK VAN BRANCH
  async saveStep5MilkVan(phoneNumber: string, dto: Step5MilkVanOrgDto) {
    const user = await this.validateStep(phoneNumber, 5, VehicleCategory.MILK_VAN);

    await this.prisma.milkVanDetail.upsert({
      where: { userId: user.id },
      update: {
        sangathanName: dto.sangathanName,
        centerName: dto.centerName,
      },
      create: {
        userId: user.id,
        sangathanName: dto.sangathanName,
        centerName: dto.centerName,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 6) },
    });

    return { message: 'Step 5 (Milk Van) completed', nextStep: 6 };
  }

  async saveMilkOrganizationDetails(phoneNumber: string, dto: MilkOrganizationDetailsDto) {
    return this.saveStep5MilkVan(phoneNumber, dto);
  }

  async saveStep6MilkVan(phoneNumber: string, dto: Step6MilkVanRouteDto) {
    const user = await this.validateStep(phoneNumber, 6, VehicleCategory.MILK_VAN);

    await this.prisma.routeDetail.upsert({
      where: { userId: user.id },
      update: {
        operatingArea: 'Milk Van Route',
        workingDays: dto.workingDays,
        workingSchedule: dto.workingSchedule,
      } as any,
      create: {
        userId: user.id,
        operatingArea: 'Milk Van Route',
        workingDays: dto.workingDays,
        workingSchedule: dto.workingSchedule,
      } as any,
    });

    await this.prisma.milkVanDetail.update({
      where: { userId: user.id },
      data: {
        assignedVillages: dto.assignedVillages,
        morningShiftTime: dto.morningShiftTime,
        eveningShiftTime: dto.eveningShiftTime,
      } as any
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 7) },
    });

    return { message: 'Step 6 (Milk Van) completed', nextStep: 7 };
  }

  async saveStep7MilkVan(phoneNumber: string, dto: Step7MilkVanVehicleDto) {
    const user = await this.validateStep(phoneNumber, 7, VehicleCategory.MILK_VAN);

    const existingVehicles = await this.prisma.vehicle.findMany({ where: { userId: user.id } });
    const data = {
      vehicleType: VehicleType.MILK_VAN,
      vehicleName: dto.make,
      registrationNumber: dto.number,
      rcUrl: dto.rcUpload,
      insuranceUrl: dto.insuranceUpload,
    };

    if (existingVehicles.length > 0) {
      await this.prisma.vehicle.update({
        where: { id: existingVehicles[0].id },
        data,
      });
    } else {
      await this.prisma.vehicle.create({
        data: { userId: user.id, ...data },
      });
    }

    return this.completeRegistration(user.id);
  }

  private async validateStep(
    phoneNumber: string,
    step: number,
    category?: VehicleCategory,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: { transporterDetail: true }
    });

    if (!user) {
      throw new NotFoundException('Transporter not found. Start from language selection.');
    }

    if (user.currentStep < step) {
      throw new BadRequestException(`Please complete step ${user.currentStep} first.`);
    }

    if (category) {
      const dbCategory = user.transporterDetail?.vehicleCategory === VehicleType.MILK_VAN ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
      if (dbCategory !== category) {
        throw new BadRequestException(`Invalid flow for your selected vehicle type.`);
      }
    }

    return user;
  }

  private async completeRegistration(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { drivingDetail: true }
    });

    if (user.applicationStatus === ApplicationStatus.APPROVED ||
      user.applicationStatus === ApplicationStatus.UNDER_REVIEW ||
      user.applicationStatus === ApplicationStatus.COMPLETED) {
      return {
        message: 'Registration already completed',
        transporterUniqueId: user.uniqueCode,
        requestId: user.id
      };
    }

    const transporterUniqueId = await this.generateTransporterUniqueId();

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        applicationStatus: ApplicationStatus.COMPLETED,
        currentStep: 7, // Set to 7 as per requirement
        uniqueCode: transporterUniqueId,
      },
    });

    // Save transporter details in TransporterDetail table
    await this.prisma.transporterDetail.upsert({
      where: { userId: id },
      update: {
        transporterCode: transporterUniqueId,
        experienceYears: user.drivingDetail?.drivingExperience || null
      },
      create: {
        userId: id,
        transporterCode: transporterUniqueId,
        experienceYears: user.drivingDetail?.drivingExperience || null
      }
    });

    return {
      message: 'Registration steps completed. Your application is under review.',
      requestId: updated.id,
      transporterUniqueId: updated.uniqueCode,
      status: updated.applicationStatus,
    };
  }
}
