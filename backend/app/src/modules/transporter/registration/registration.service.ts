import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
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

import { LocationService } from '../../../shared/location/location.service';

@Injectable()
export class RegistrationService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private locationService: LocationService,
  ) { }

  private async trackStep(userId: number, step: number, data: any) {
    const existing = await this.prisma.stepTracking.findFirst({
      where: { userId, step },
    });

    if (existing) {
      await this.prisma.stepTracking.update({
        where: { id: existing.id },
        data: {
          status: 'COMPLETED',
          data: data || {},
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.stepTracking.create({
        data: {
          userId,
          step,
          status: 'COMPLETED',
          data: data || {},
        },
      });
    }
  }

  private async generateTransporterUniqueId(): Promise<string> {
    const count = await this.prisma.user.count({
      where: {
        role: UserRole.TRANSPORTER,
        uniqueCode: { startsWith: 'LOG-TP-' },
      },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    return `LOG-TP-${seq}`;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      mobile: user.phoneNumber,
      role: user.role,
      status: user.applicationStatus,
      // Only include uniqueCode if it exists (i.e., after full registration)
      ...(user.uniqueCode ? { transporterUniqueId: user.uniqueCode } : {})
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '90d' });

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

    if (existing && (existing.applicationStatus === ApplicationStatus.APPROVED || existing.applicationStatus === ApplicationStatus.UNDER_REVIEW || existing.applicationStatus === ApplicationStatus.COMPLETED)) {
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
          currentStep: 1,
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

  private buildUserWhereClause(userIdentifier: string | number) {
    const strVal = String(userIdentifier).trim();
    const isIntId = typeof userIdentifier === 'number' || (!isNaN(Number(strVal)) && strVal.length < 9);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strVal);

    if (isIntId) {
      return { id: Number(strVal) };
    }
    if (isUuid) {
      return { authId: strVal };
    }
    const cleaned = strVal.replace(/\D/g, '').slice(-10);
    return {
      OR: [
        { phoneNumber: cleaned },
        { phoneNumber: `+91${cleaned}` },
        { phoneNumber: strVal },
      ],
    };
  }

  async getRegistrationStatus(userIdentifier: string | number): Promise<any> {
    if (!userIdentifier) {
      throw new NotFoundException('Transporter identifier not provided');
    }

    const user: any = await this.prisma.user.findFirst({
      where: this.buildUserWhereClause(userIdentifier),
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
    try {
      if (user.transporterDetail?.vehicleCategory) {
        vehicleCategory = user.transporterDetail.vehicleCategory === VehicleType.MILK_VAN ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
      } else {
        const st4 = user.stepTracking?.find((st: any) => st.step === 4);
        if (st4 && st4.data) {
          const st4Data = typeof st4.data === 'string' ? JSON.parse(st4.data) : st4.data;
          vehicleCategory = st4Data?.vehicleCategory === 'MILK_VAN' ? VehicleCategory.MILK_VAN : VehicleCategory.PERSONAL;
        }
      }
    } catch (e) {
      // Safe fallback on invalid JSON format
    }

    const rawStatus = (user.applicationStatus || '').toUpperCase();
    let computedStatus = 'INCOMPLETE';
    if (rawStatus === 'APPROVED') {
      computedStatus = 'APPROVED';
    } else if (rawStatus === 'REJECTED') {
      computedStatus = 'REJECTED';
    } else if (rawStatus === 'COMPLETED' || rawStatus === 'UNDER_REVIEW') {
      computedStatus = 'PENDING';
    } else if ((user.currentStep || 1) >= 7) {
      computedStatus = 'PENDING';
    } else {
      computedStatus = 'INCOMPLETE';
    }

    // Map back to frontend expected structure
    return {
      ...user,
      applicationStatus: computedStatus,
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
      } : {
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: user.email,
        state: '',
        district: '',
        taluka: '',
        village: '',
        residentialAddress: '',
        pinCode: '',
        profilePhoto: user.profilePhoto,
      },
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

    const isValid = await this.locationService.validateLocation(
      dto.pinCode,
      dto.village,
      dto.taluka,
      dto.district,
      dto.state,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid location combination. Only combinations existing in India Pincodes directory are valid.');
    }

    let uniqueCode = user.uniqueCode;
    if (!uniqueCode) {
      uniqueCode = await this.generateTransporterUniqueId();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: `${dto.firstName} ${dto.lastName}`.trim(),
        email: dto.email,
        profilePhoto: dto.profilePhoto,
        uniqueCode: uniqueCode,
        currentStep: Math.max(user.currentStep, 2),
      },
    });

    const existingAddress = await this.prisma.address.findFirst({
      where: { userId: user.id },
    });

    if (existingAddress) {
      await this.prisma.address.update({
        where: { id: existingAddress.id },
        data: {
          houseNo: dto.residentialAddress,
          state: dto.state,
          district: dto.district,
          taluka: dto.taluka,
          village: dto.village,
          pincode: dto.pinCode,
          postOffice: dto.postOffice || null,
        },
      });
    } else {
      await this.prisma.address.create({
        data: {
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
    }

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
    try {
      let records = await this.locationService.findByPincode(pincode);
      if (!records || records.length === 0) {
        try {
          const live = await this.locationService.getAddressFromPincode(pincode);
          if (live && (live.state || live.district || live.villages?.length > 0)) {
            const finalDist = live.district || live.taluka || '';
            const finalTaluka = live.taluka || live.district || '';
            return {
              success: true,
              state: live.state || '',
              district: finalDist,
              taluka: finalTaluka,
              talukas: [finalTaluka].filter(Boolean),
              postOffices: live.postOffices || [],
              records: (live.villages || []).map((v: string) => ({
                name: v,
                village: v,
                taluka: finalTaluka,
                postOffice: v,
                district: finalDist,
                state: live.state || '',
              })),
            };
          }
        } catch (e) { }
        return {
          success: false,
          state: '',
          district: '',
          taluka: '',
          talukas: [],
          postOffices: [],
          records: [],
        };
      }
      const data = records[0];
      const talukas = Array.from(new Set(records.map(r => String(r.taluka || r.district || '').trim()).filter(Boolean)));
      const postOffices = Array.from(new Set(records.map(r => String(r.postOffice || r.village || '').trim()).filter(Boolean)));
      return {
        success: true,
        state: data.state || '',
        district: data.district || data.taluka || '',
        taluka: data.taluka || data.district || '',
        talukas,
        postOffices,
        records: records.map(r => ({
          name: r.village || '',
          village: r.village || '',
          taluka: r.taluka || r.district || '',
          postOffice: r.postOffice || r.village || '',
          district: r.district || r.taluka || '',
          state: r.state || '',
        })),
      };
    } catch (e) {
      console.error('getPincodeInfo error:', e);
      return {
        success: false,
        state: '',
        district: '',
        taluka: '',
        talukas: [],
        postOffices: [],
        records: [],
      };
    }
  }

  async getPincodeVillages(pincode: string) {
    try {
      const records = await this.locationService.findByPincode(pincode);
      return (records || []).map(r => ({
        name: r.village || '',
        village: r.village || '',
        taluka: r.taluka || r.district || '',
        postOffice: r.postOffice || r.village || '',
        district: r.district || '',
        state: r.state || '',
      }));
    } catch (e) {
      console.error('getPincodeVillages error:', e);
      return [];
    }
  }

  private async validateStep(
    userIdentifier: string | number,
    step: number,
    category?: VehicleCategory,
  ) {
    if (!userIdentifier) {
      throw new NotFoundException('Transporter identifier not provided.');
    }

    const user: any = await this.prisma.user.findFirst({
      where: this.buildUserWhereClause(userIdentifier),
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
    if (cleanType.includes('2') || cleanType.includes('two') || cleanType.includes('bike') || cleanType.includes('scooter')) {
      return VehicleType.TWO_WHEELER;
    }
    if (cleanType.includes('3') || cleanType.includes('three') || cleanType.includes('auto') || cleanType.includes('rickshaw')) {
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

  public parseVehicleBodyProtection(type: string) {
    if (!type) {
      return { isClosedContainer: false, isWaterproof: false, hasRoof: false };
    }
    const clean = type.toLowerCase().trim();
    const isClosedContainer = clean.includes('closed container') || clean.includes('closed cargo') || clean.includes('closed');
    const hasTarpaulin = clean.includes('tarpaulin') || clean.includes('waterproof');
    const isWaterproof = isClosedContainer || hasTarpaulin;
    const hasRoof = isClosedContainer || hasTarpaulin || clean.includes('van') || clean.includes('tempo');

    return {
      isClosedContainer,
      isWaterproof,
      hasRoof,
    };
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

    const transporterUniqueId = user.uniqueCode || (await this.generateTransporterUniqueId());

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
        const existingDriving = await tx.drivingDetail.findFirst({ where: { userId: id } });
        if (existingDriving) {
          await tx.drivingDetail.update({
            where: { id: existingDriving.id },
            data: {
              licenseNumber: s2.licenseNumber,
              expiryDate: new Date(s2.expiryDate),
              drivingExperience: s2.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
              drivingLicenseUrl: s2.licensePhoto || null,
            },
          });
        } else {
          await tx.drivingDetail.create({
            data: {
              userId: id,
              licenseNumber: s2.licenseNumber,
              expiryDate: new Date(s2.expiryDate),
              drivingExperience: s2.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
              drivingLicenseUrl: s2.licensePhoto || null,
            },
          });
        }
      }

      // 4. Transporter Detail (Step 4 & Step 2 driving experience)
      const s4 = stepData[4];
      const vehicleCategory = (s4 && s4.vehicleCategory === 'MILK_VAN') ? 'MILK_VAN' : 'OTHER';

      const existingTransporter = await tx.transporterDetail.findFirst({ where: { userId: id } });
      if (existingTransporter) {
        await tx.transporterDetail.update({
          where: { id: existingTransporter.id },
          data: {
            transporterCode: transporterUniqueId,
            vehicleCategory: vehicleCategory as any,
            experienceYears: s2?.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
          },
        });
      } else {
        await tx.transporterDetail.create({
          data: {
            userId: id,
            transporterCode: transporterUniqueId,
            vehicleCategory: vehicleCategory as any,
            experienceYears: s2?.experienceYears ? parseInt(String(s2.experienceYears), 10) : null,
          },
        });
      }

      // 5. Milk Van Detail (Step 5 Milk Van & Step 6 Milk Van)
      const s5mv = stepData[5];
      const s6mv = stepData[6];
      if (vehicleCategory === 'MILK_VAN' && (s5mv || s6mv)) {
        const existingMilkVan = await tx.milkVanDetail.findFirst({ where: { userId: id } });
        if (existingMilkVan) {
          await tx.milkVanDetail.update({
            where: { id: existingMilkVan.id },
            data: {
              sangathanName: s5mv?.sangathanName || '',
              centerName: s5mv?.centerName || '',
              assignedVillages: s6mv?.assignedVillages || null,
              morningShiftTime: s6mv?.morningShiftTime || null,
              eveningShiftTime: s6mv?.eveningShiftTime || null,
            },
          });
        } else {
          await tx.milkVanDetail.create({
            data: {
              userId: id,
              sangathanName: s5mv?.sangathanName || '',
              centerName: s5mv?.centerName || '',
              assignedVillages: s6mv?.assignedVillages || null,
              morningShiftTime: s6mv?.morningShiftTime || null,
              eveningShiftTime: s6mv?.eveningShiftTime || null,
            },
          });
        }
      }

      // Helper to resolve pincodes for a list of villages (optimized batch query)
      const resolvePincodesForVillages = async (villagesList: string[]): Promise<string[]> => {
        const cleanVillages = villagesList.map(v => v.trim()).filter(Boolean);
        if (cleanVillages.length === 0) return [];

        try {
          const records = await tx.pincodeDirectory.findMany({
            where: { village: { in: cleanVillages, mode: 'insensitive' } },
            select: { pincode: true },
            take: 100,
          });
          return [...new Set(records.map(r => r.pincode))];
        } catch (e) {
          console.warn('[resolvePincodesForVillages] Failed to fetch pincodes:', e);
          return [];
        }
      };

      // 6. Route Detail (Step 6 Personal or Step 6 Milk Van)
      const s6p = stepData[6];
      const existingRoute = await tx.routeDetail.findFirst({ where: { userId: id } });

      if (vehicleCategory === 'MILK_VAN' && s6mv) {
        const operatingAreaVal = Array.isArray(s6mv.assignedVillages)
          ? s6mv.assignedVillages.join(', ')
          : 'Milk Van Route';
        const villages = Array.isArray(s6mv.assignedVillages) ? s6mv.assignedVillages : [];
        const resolvedPincodes = await resolvePincodesForVillages(villages);

        if (existingRoute) {
          await tx.routeDetail.update({
            where: { id: existingRoute.id },
            data: {
              operatingArea: operatingAreaVal,
              pickupLocations: resolvedPincodes,
              dropLocations: resolvedPincodes,
              workingDays: s6mv.workingDays || null,
              workingSchedule: s6mv.workingSchedule || null,
            },
          });
        } else {
          await tx.routeDetail.create({
            data: {
              userId: id,
              operatingArea: operatingAreaVal,
              pickupLocations: resolvedPincodes,
              dropLocations: resolvedPincodes,
              workingDays: s6mv.workingDays || null,
              workingSchedule: s6mv.workingSchedule || null,
            },
          });
        }
      } else if (vehicleCategory !== 'MILK_VAN' && s6p) {
        const villages = s6p.operatingArea ? s6p.operatingArea.split(',').map((s: string) => s.trim()) : [];
        const resolvedPincodes = await resolvePincodesForVillages(villages);

        if (existingRoute) {
          await tx.routeDetail.update({
            where: { id: existingRoute.id },
            data: {
              operatingArea: s6p.operatingArea || '',
              pickupLocations: resolvedPincodes,
              dropLocations: resolvedPincodes,
              workingDays: s6p.workingDays || null,
              workingSchedule: s6p.workingSchedule || null,
            },
          });
        } else {
          await tx.routeDetail.create({
            data: {
              userId: id,
              operatingArea: s6p.operatingArea || '',
              pickupLocations: resolvedPincodes,
              dropLocations: resolvedPincodes,
              workingDays: s6p.workingDays || null,
              workingSchedule: s6p.workingSchedule || null,
            },
          });
        }
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
        const lVal = vehicleInfo.deckLength ? Number(vehicleInfo.deckLength) : (vehicleInfo.length ? Number(vehicleInfo.length) : null);
        const wVal = vehicleInfo.deckWidth ? Number(vehicleInfo.deckWidth) : (vehicleInfo.width ? Number(vehicleInfo.width) : null);
        const hVal = vehicleInfo.deckHeight ? Number(vehicleInfo.deckHeight) : (vehicleInfo.heihgt ? Number(vehicleInfo.heihgt) : null);
        const calcStorage = (lVal && wVal && hVal) ? `${(lVal * wVal * hVal).toFixed(1)} cu.ft` : null;

        if (existingVehicle) {
          await tx.otherDetails.update({
            where: { id: existingVehicle.id },
            data: {
              vehicleType: mappedType,
              vehicleName: vehicleInfo.make || null,
              vehicleModel: vehicleInfo.model || vehicleInfo.vehicleModel || null,
              length: lVal,
              width: wVal,
              heihgt: hVal,
              storageSpace: calcStorage,
              registrationNumber: vehicleInfo.number || null,
              rcUrl: vehicleInfo.rcUpload || null,
              insuranceUrl: vehicleInfo.insuranceUpload || null,
              wheeler: vehicleInfo.wheeler || null,
              minWeight: vehicleInfo.minWeight ? Number(vehicleInfo.minWeight) : null,
              maxWeight: vehicleInfo.maxWeight ? Number(vehicleInfo.maxWeight) : null,
              ratePerKm: vehicleInfo.ratePerKm ? Number(vehicleInfo.ratePerKm) : null,
            } as any,
          });
        } else {
          await tx.otherDetails.create({
            data: {
              userId: id,
              vehicleType: mappedType,
              vehicleName: vehicleInfo.make || null,
              vehicleModel: vehicleInfo.model || vehicleInfo.vehicleModel || null,
              length: lVal,
              width: wVal,
              heihgt: hVal,
              storageSpace: calcStorage,
              registrationNumber: vehicleInfo.number || null,
              rcUrl: vehicleInfo.rcUpload || null,
              insuranceUrl: vehicleInfo.insuranceUpload || null,
              wheeler: vehicleInfo.wheeler || null,
              minWeight: vehicleInfo.minWeight ? Number(vehicleInfo.minWeight) : null,
              maxWeight: vehicleInfo.maxWeight ? Number(vehicleInfo.maxWeight) : null,
              ratePerKm: vehicleInfo.ratePerKm ? Number(vehicleInfo.ratePerKm) : null,
            } as any,
          });
        }
      }

      return updated;
    }, { timeout: 30000 });

    return {
      message: 'Registration steps completed. Your application is under review.',
      requestId: txResult.id,
      transporterUniqueId: txResult.uniqueCode,
      status: txResult.applicationStatus,
    };
  }
}
