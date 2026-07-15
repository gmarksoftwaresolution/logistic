import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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

  private async trackStep(userId: number, step: number, data: any) {
    await this.prisma.stepTracking.upsert({
      where: { userId_step: { userId, step } },
      create: {
        userId,
        step,
        status: 'COMPLETED',
        data: data || {},
      },
      update: {
        status: 'COMPLETED',
        data: data || {},
        updatedAt: new Date(),
      },
    });
  }

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
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '3650d' });

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

    if (existingUser.applicationStatus === ApplicationStatus.COMPLETED || existingUser.applicationStatus === ApplicationStatus.UNDER_REVIEW) {
      throw new ForbiddenException('Your application is pending approval.');
    }

    if (existingUser.applicationStatus === ApplicationStatus.REJECTED) {
      throw new ForbiddenException(
        existingUser.rejectionReason 
          ? `Your application has been rejected: ${existingUser.rejectionReason}` 
          : 'Your application has been rejected.'
      );
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

  async getRegistrationStatus(phoneNumber: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
        otherDetails: true,
        routeDetail: true,
        milkVanDetail: true,
        transporterDetail: true,
        documents: true,
        stepTracking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Transporter not found');
    }

    const [firstName, ...lastNameParts] = (user.fullName || '').split(' ');

    let vehicleCategory = null;
    if (user.transporterDetail?.vehicleCategory) {
      vehicleCategory = user.transporterDetail.vehicleCategory === VehicleType.MILK_VAN ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
    } else {
      const st4 = user.stepTracking?.find((st) => st.step === 4);
      if (st4 && st4.data) {
        const st4Data = typeof st4.data === 'string' ? JSON.parse(st4.data) : st4.data;
        vehicleCategory = st4Data.vehicleCategory === 'MILK_VAN' ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
      }
    }

    // Map back to frontend expected structure
    return {
      ...user,
      requestId: user.id,
      transporterUniqueId: user.uniqueCode,
      vehicleCategory,
      personalDetails: user.address ? {
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: user.email,
        state: user.address.state,
        district: user.address.district,
        taluka: user.address.taluka,
        village: user.address.village || '',
        residentialAddress: user.address.houseNo,
        pinCode: user.address.pincode,
        profilePhoto: user.profilePhoto,
      } : null,
      drivingDetails: user.drivingDetail ? {
        ...user.drivingDetail,
        licensePhoto: user.drivingDetail.drivingLicenseUrl || null,
        experienceYears: user.drivingDetail.drivingExperience,
      } : null,
      bankDetails: user.bankDetails?.[0] || null,
      vehicleDetails: user.otherDetails?.[0] || null,
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
        houseNo: dto.residentialAddress,
        state: dto.state,
        district: dto.district,
        taluka: dto.taluka,
        village: dto.village,
        pincode: dto.pinCode,
        postOffice: dto.postOffice || null,
      },
      create: {
        userId: user.id,
        houseNo: dto.residentialAddress,
        state: dto.state,
        district: dto.district,
        taluka: dto.taluka,
        village: dto.village,
        pincode: dto.pinCode,
        postOffice: dto.postOffice || null,
      },
    });

    await this.trackStep(user.id, 1, dto);

    return { message: 'Step 1 completed', nextStep: 2 };
  }

  async saveStep2(phoneNumber: string, dto: Step2DrivingDetailsDto) {
    const user = await this.validateStep(phoneNumber, 2);

    await this.trackStep(user.id, 2, dto);

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

    await this.trackStep(user.id, 3, dto);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 4) },
    });

    return { message: 'Step 3 completed', nextStep: 4 };
  }

  async saveStep4(phoneNumber: string, dto: Step4VehicleTypeDto) {
    const user = await this.validateStep(phoneNumber, 4);

    await this.trackStep(user.id, 4, dto);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 5) },
    });

    return { message: 'Step 4 completed', nextStep: 5 };
  }

  // PERSONAL BRANCH
  async saveStep5Personal(phoneNumber: string, dto: Step5PersonalVehicleDto) {
    const user = await this.validateStep(phoneNumber, 5, VehicleCategory.PERSONAL);

    await this.trackStep(user.id, 5, dto);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 6) },
    });

    return { message: 'Step 5 (Personal) completed', nextStep: 6 };
  }

  async saveStep6Personal(phoneNumber: string, dto: Step6PersonalRouteDto) {
    const user = await this.validateStep(phoneNumber, 6, VehicleCategory.PERSONAL);

    await this.trackStep(user.id, 6, dto);

    return this.completeRegistration(user.id);
  }

  // MILK VAN BRANCH
  async saveStep5MilkVan(phoneNumber: string, dto: Step5MilkVanOrgDto) {
    const user = await this.validateStep(phoneNumber, 5, VehicleCategory.MILK_VAN);

    await this.trackStep(user.id, 5, dto);

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

    await this.trackStep(user.id, 6, dto);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentStep: Math.max(user.currentStep, 7) },
    });

    return { message: 'Step 6 (Milk Van) completed', nextStep: 7 };
  }

  async saveStep7MilkVan(phoneNumber: string, dto: Step7MilkVanVehicleDto) {
    const user = await this.validateStep(phoneNumber, 7, VehicleCategory.MILK_VAN);

    await this.trackStep(user.id, 7, dto);

    return this.completeRegistration(user.id);
  }

  async getPincodeInfo(pincode: string) {
    const records: any[] = await this.prisma.$queryRaw`
      SELECT state, district, block AS taluka FROM public.pincodes WHERE pincode = ${pincode} LIMIT 1
    `;
    if (!records || records.length === 0) {
      throw new NotFoundException('Pincode details not found');
    }
    const data = records[0];
    return {
      success: true,
      state: data.state,
      district: data.district,
      taluka: data.taluka || data.district,
    };
  }

  async getPincodeVillages(pincode: string) {
    const records: any[] = await this.prisma.$queryRaw`
      SELECT DISTINCT village, block AS taluka, district, name AS "postOffice" FROM public.pincodes WHERE pincode = ${pincode} ORDER BY village ASC
    `;
    return records.map(r => ({
      name: r.village,
      taluka: r.taluka || r.district || '',
      postOffice: r.postOffice || '',
    }));
  }

  private async validateStep(
    phoneNumber: string,
    step: number,
    category?: VehicleCategory,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new NotFoundException('Transporter not found. Start from language selection.');
    }

    if (user.currentStep < step) {
      throw new BadRequestException(`Please complete step ${user.currentStep} first.`);
    }

    if (category) {
      let dbCategory = VehicleCategory.PERSONAL;
      const st4 = await this.prisma.stepTracking.findUnique({
        where: { userId_step: { userId: user.id, step: 4 } }
      });
      if (st4 && st4.data) {
        const st4Data = typeof st4.data === 'string' ? JSON.parse(st4.data) : st4.data;
        dbCategory = st4Data.vehicleCategory === VehicleCategory.MILK_VAN ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
      }
      if (dbCategory !== category) {
        throw new BadRequestException(`Invalid flow for your selected vehicle type.`);
      }
    }

    return user;
  }

  private mapVehicleType(type: string, category: string): VehicleType {
    if (category === 'MILK_VAN') {
      return VehicleType.MILK_VAN;
    }
    if (!type) {
      return VehicleType.OTHER;
    }
    const cleanType = type.toLowerCase().trim();
    if (cleanType.includes('2') || cleanType.includes('two')) {
      return VehicleType.TWO_WHEELER;
    }
    if (cleanType.includes('3') || cleanType.includes('three')) {
      return VehicleType.THREE_WHEELER;
    }
    if (cleanType.includes('4') || cleanType.includes('four') || 
        cleanType.includes('pickup') || cleanType.includes('bolero') || 
        cleanType.includes('mini') || cleanType.includes('tempo') || 
        cleanType.includes('tractor') || cleanType.includes('container') || 
        cleanType.includes('truck')) {
      return VehicleType.FOUR_WHEELER;
    }
    return VehicleType.OTHER;
  }

  private async completeRegistration(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Update user details
      const updated = await tx.user.update({
        where: { id },
        data: {
          applicationStatus: ApplicationStatus.COMPLETED,
          currentStep: 7, // Set to 7 as per requirement
          uniqueCode: transporterUniqueId,
        },
      });

      // 2. Fetch step tracking data
      const steps = await tx.stepTracking.findMany({ where: { userId: id } });
      const stepData: Record<number, any> = {};
      for (const s of steps) {
        stepData[s.step] = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      }

      // 3. Driving Detail (Step 2)
      const s2 = stepData[2];
      if (s2) {
        await tx.drivingDetail.upsert({
          where: { userId: id },
          update: {
            licenseNumber: s2.licenseNumber,
            expiryDate: new Date(s2.expiryDate),
            drivingExperience: s2.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
            drivingLicenseNo: s2.licenseNumber,
            drivingLicenseUrl: s2.licensePhoto || null,
          },
          create: {
            userId: id,
            licenseNumber: s2.licenseNumber,
            expiryDate: new Date(s2.expiryDate),
            drivingExperience: s2.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
            drivingLicenseNo: s2.licenseNumber,
            drivingLicenseUrl: s2.licensePhoto || null,
          },
        });
      }

      // 4. Transporter Detail (Step 4 & Step 2 driving experience)
      const s4 = stepData[4];
      const vehicleCategory = (s4 && s4.vehicleCategory === 'MILK_VAN') ? 'MILK_VAN' : 'OTHER';

      await tx.transporterDetail.upsert({
        where: { userId: id },
        update: {
          transporterCode: transporterUniqueId,
          vehicleCategory: vehicleCategory as any,
          experienceYears: s2?.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
        },
        create: {
          userId: id,
          transporterCode: transporterUniqueId,
          vehicleCategory: vehicleCategory as any,
          experienceYears: s2?.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
        },
      });

      // 5. Milk Van Detail (Step 5 Milk Van & Step 6 Milk Van)
      const s5mv = stepData[5];
      const s6mv = stepData[6];
      if (vehicleCategory === 'MILK_VAN' && (s5mv || s6mv)) {
        await tx.milkVanDetail.upsert({
          where: { userId: id },
          update: {
            sangathanName: s5mv?.sangathanName || '',
            centerName: s5mv?.centerName || '',
            assignedVillages: s6mv?.assignedVillages || null,
            morningShiftTime: s6mv?.morningShiftTime || null,
            eveningShiftTime: s6mv?.eveningShiftTime || null,
          },
          create: {
            userId: id,
            sangathanName: s5mv?.sangathanName || '',
            centerName: s5mv?.centerName || '',
            assignedVillages: s6mv?.assignedVillages || null,
            morningShiftTime: s6mv?.morningShiftTime || null,
            eveningShiftTime: s6mv?.eveningShiftTime || null,
          },
        });
      }

      // 6. Route Detail (Step 6 Personal or Step 6 Milk Van)
      const s6p = stepData[6];
      if (vehicleCategory === 'MILK_VAN' && s6mv) {
        const operatingAreaVal = Array.isArray(s6mv.assignedVillages)
          ? s6mv.assignedVillages.join(', ')
          : 'Milk Van Route';
        await tx.routeDetail.upsert({
          where: { userId: id },
          update: {
            operatingArea: operatingAreaVal,
            workingDays: s6mv.workingDays || null,
            workingSchedule: s6mv.workingSchedule || null,
          },
          create: {
            userId: id,
            operatingArea: operatingAreaVal,
            workingDays: s6mv.workingDays || null,
            workingSchedule: s6mv.workingSchedule || null,
          },
        });
      } else if (vehicleCategory !== 'MILK_VAN' && s6p) {
        await tx.routeDetail.upsert({
          where: { userId: id },
          update: {
            operatingArea: s6p.operatingArea || '',
            pickupLocations: s6p.pickupLocations || null,
            dropLocations: s6p.dropLocations || null,
            workingDays: s6p.workingDays || null,
            workingSchedule: s6p.workingSchedule || null,
          },
          create: {
            userId: id,
            operatingArea: s6p.operatingArea || '',
            pickupLocations: s6p.pickupLocations || null,
            dropLocations: s6p.dropLocations || null,
            workingDays: s6p.workingDays || null,
            workingSchedule: s6p.workingSchedule || null,
          },
        });
      }

      // 7. Other Details / Vehicle details (Step 5 Personal or Step 7 Milk Van)
      const s5p = stepData[5];
      const s7mv = stepData[7];
      const vehicleInfo = vehicleCategory === 'MILK_VAN' ? s7mv : s5p;
      if (vehicleInfo) {
        const existingVehicle = await tx.otherDetails.findFirst({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
        });

        const mappedType = this.mapVehicleType(vehicleInfo.type, vehicleCategory);

        if (existingVehicle) {
          await tx.otherDetails.update({
            where: { id: existingVehicle.id },
            data: {
              vehicleType: mappedType,
              vehicleName: vehicleInfo.make || null,
              registrationNumber: vehicleInfo.number || null,
              rcUrl: vehicleInfo.rcUpload || null,
              insuranceUrl: vehicleInfo.insuranceUpload || null,
              wheeler: vehicleInfo.wheeler || null,
            },
          });
        } else {
          await tx.otherDetails.create({
            data: {
              userId: id,
              vehicleType: mappedType,
              vehicleName: vehicleInfo.make || null,
              registrationNumber: vehicleInfo.number || null,
              rcUrl: vehicleInfo.rcUpload || null,
              insuranceUrl: vehicleInfo.insuranceUpload || null,
              wheeler: vehicleInfo.wheeler || null,
            },
          });
        }
      }

      return updated;
    });

    return {
      message: 'Registration steps completed. Your application is under review.',
      requestId: txResult.id,
      transporterUniqueId: txResult.uniqueCode,
      status: txResult.applicationStatus,
    };
  }
}
