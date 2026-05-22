import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import {
  ProfileDto,
  ShgDetailsDto,
  NonShgRoleDto,
  ProductsDto,
  AddressDto,
  DocumentsDto,
  BankDetailsDto,
  OtherDetailsDto,
  UserType,
} from './dto/signup.dto';
import { SendOtpDto, VerifyOtpDto } from '../auth/dto/auth.dto';
import { ShgUtil } from '../common/utils/shg.util';
import { AuthService } from '../auth/auth.service';
import { UserRole, ShgRole, ProductCategory, VehicleType, StepStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SignupService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private authService: AuthService,
  ) { }

  // ─── OTP FLOW ────────────────────────────────────────────────────────────────

  async sendSignupOtp(dto: SendOtpDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber },
    });

    if (existingUser && existingUser.currentStep === 7) {
      throw new BadRequestException('This mobile number is already registered. Please log in or use a different number.');
    }

    await this.otpService.generateOtp(dto.mobileNumber, 'SIGNUP');
    return { success: true, message: 'Signup OTP sent successfully' };
  }

  async verifySignupOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.mobileNumber, dto.otp, 'SIGNUP');

    let user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: dto.mobileNumber,
          role: UserRole.INDIVIDUAL, // Default role
          isVerified: true,
          language: dto.language || 'English',
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          language: dto.language || user.language || 'English'
        },
      });
    }

    const tokens = await this.authService.getTokens(user.id, user.phoneNumber);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      transporterUniqueId: user.uniqueCode,
      userDetails: {
        userId: user.id,
        signupStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
        isNewUser: user.currentStep === 0,
        shgUniqueId: user.uniqueCode,
      },
    };
  }

  private async trackStep(userId: number, step: number, status: StepStatus = 'COMPLETED', data?: any) {
    await this.prisma.stepTracking.upsert({
      where: { userId_step: { userId, step } },
      create: {
        userId,
        step,
        status,
        data: data || {},
      },
      update: {
        status,
        data: data || {},
        updatedAt: new Date(),
      },
    });
  }

  // ─── STEP 1: Profile + Role ──────────────────────────────────────────────────

  async saveProfile(userId: number, dto: ProfileDto) {
    const userObj = await this.ensureVerified(userId);

    // Generate Unique ID early in Step 1
    let uniqueId = userObj.uniqueCode;
    if (!uniqueId) {
      const count = await this.prisma.user.count({
        where: {
          uniqueCode: { startsWith: 'LOG-' },
        },
      });
      uniqueId = ShgUtil.formatUniqueId(dto.userType, count + 1);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.userType === UserType.SHG ? UserRole.SHG : UserRole.INDIVIDUAL,
        fullName: dto.fullName,
        profilePhoto: dto.photoUrl || null,
        currentStep: 1,
        uniqueCode: uniqueId,
      },
    });

    await this.trackStep(userId, 1, 'COMPLETED', dto);

    return {
      success: true,
      message: 'Profile saved successfully',
      nextStep: user.role === UserRole.SHG ? 'SHG_DETAILS' : 'ADDRESS',
      signupStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
    };
  }

  // ─── SHG Details (SHG flow only) ────────────────────────────────────────────

  async saveShgDetails(userId: number, dto: ShgDetailsDto) {
    const user = await this.ensureVerified(userId);
    this.ensureUserType(user.role, UserRole.SHG);
    this.validateStep(user.currentStep, 1);

    await this.prisma.shgDetail.upsert({
      where: { userId },
      create: {
        userId,
        shgName: dto.shgName || null,
        shgLeaderName: dto.shgLeaderName || null,
        shgLeaderContact: dto.shgLeaderContact || null,
        shgRole: dto.shgRole,
        crpName: dto.crpName || null,
        crpMobile: dto.crpMobile || null,
        crpEmail: dto.crpEmail || null,
        groupSize: dto.shgGroupSize || null,
      },
      update: {
        shgName: dto.shgName || null,
        shgLeaderName: dto.shgLeaderName || null,
        shgLeaderContact: dto.shgLeaderContact || null,
        shgRole: dto.shgRole,
        crpName: dto.crpName || null,
        crpMobile: dto.crpMobile || null,
        crpEmail: dto.crpEmail || null,
        groupSize: dto.shgGroupSize || null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentStep: 2 },
    });

    await this.trackStep(userId, 2, 'COMPLETED', dto);

    return {
      success: true,
      message: 'SHG details saved successfully',
      nextStep: 'PRODUCT',
    };
  }

  // Save Non-SHG role
  async saveNonShgRole(userId: number, dto: NonShgRoleDto) {
    const user = await this.ensureVerified(userId);
    this.ensureUserType(user.role, UserRole.INDIVIDUAL);
    this.validateStep(user.currentStep, 1);

    // If role is DELIVERY_PARTNER or DRIVER, they register as TRANSPORTER
    const finalRole = (dto.nonShgRole === 'DELIVERY_PARTNER' || dto.nonShgRole === 'DRIVER')
      ? UserRole.TRANSPORTER
      : UserRole.INDIVIDUAL;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: finalRole,
        currentStep: 2,
      },
    });

    if (finalRole === UserRole.TRANSPORTER) {
      await this.prisma.transporterDetail.upsert({
        where: { userId },
        create: {
          userId,
          transporterCode: user.uniqueCode,
        },
        update: {},
      });
    }

    await this.trackStep(userId, 2, 'COMPLETED', dto);

    return {
      success: true,
      message: 'Role saved successfully',
      nextStep: 'ADDRESS',
    };
  }

  // ─── STEP 2 (SHG): Products ─────────────────────────────────────────────────

  async saveProducts(userId: number, dto: ProductsDto) {
    const user = await this.ensureVerified(userId);
    this.ensureUserType(user.role, UserRole.SHG);
    this.validateStep(user.currentStep, 2);

    // Delete existing products for this user first
    await this.prisma.product.deleteMany({ where: { userId } });

    if (dto.producesProduct && dto.products && dto.products.length > 0) {
      await this.prisma.product.createMany({
        data: dto.products.map((p) => ({
          userId,
          productName: p.productName,
          category: p.category,
          dailyProductionQty: p.dailyProductionQty,
          unit: p.unit,
          weeklyProduction: p.weeklyProduction || null,
          price: p.price || null,
        })),
      });
    }

    // Save business detail
    await this.prisma.businessDetail.upsert({
      where: { userId },
      create: {
        userId,
        producesProduct: dto.producesProduct,
        businessTeamSize: dto.businessTeamSize || null,
      },
      update: {
        producesProduct: dto.producesProduct,
        businessTeamSize: dto.businessTeamSize || null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentStep: 3 },
    });

    await this.trackStep(userId, 3, 'COMPLETED', dto);

    return {
      success: true,
      message: dto.producesProduct
        ? `${dto.products?.length || 0} product(s) saved successfully`
        : 'No products to save',
      nextStep: 'ADDRESS',
    };
  }

  // ─── STEP 3 (SHG) / STEP 2 (Non-SHG): Address ─────────────────────────────

  async saveAddress(userId: number, dto: AddressDto) {
    const user = await this.ensureVerified(userId);
    this.validateStep(user.currentStep, user.role === UserRole.SHG ? 3 : 2);

    await this.prisma.address.upsert({
      where: { userId },
      create: {
        userId,
        addressLine1: dto.houseNo,
        village: dto.village,
        taluka: dto.taluka,
        district: dto.district,
        state: dto.state,
        pincode: dto.pincode,
        landmark: dto.landmark || null,
      },
      update: {
        addressLine1: dto.houseNo,
        village: dto.village,
        taluka: dto.taluka,
        district: dto.district,
        state: dto.state,
        pincode: dto.pincode,
        landmark: dto.landmark || null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentStep: 4 },
    });

    await this.trackStep(userId, 4, 'COMPLETED', dto);

    return {
      success: true,
      message: 'Address saved successfully',
      nextStep: 'DOCUMENTS',
    };
  }

  // ─── STEP 4 (SHG) / STEP 3 (Non-SHG): Documents ──────────────────────────

  async saveDocuments(userId: number, dto: DocumentsDto) {
    const user = await this.ensureVerified(userId);
    this.validateStep(user.currentStep, 4);

    const doc = await this.prisma.document.findFirst({
      where: { userId },
    });

    if (doc) {
      await this.prisma.document.update({
        where: { id: doc.id },
        data: {
          aadhaarNumber: dto.aadhaarNumber,
          panNumber: dto.panNumber,
          aadhaarFrontUrl: dto.aadhaarFrontUrl || null,
          aadhaarBackUrl: dto.aadhaarBackUrl || null,
          panCardUrl: dto.panCardUrl || null,
        },
      });
    } else {
      await this.prisma.document.create({
        data: {
          userId,
          aadhaarNumber: dto.aadhaarNumber,
          panNumber: dto.panNumber,
          aadhaarFrontUrl: dto.aadhaarFrontUrl || null,
          aadhaarBackUrl: dto.aadhaarBackUrl || null,
          panCardUrl: dto.panCardUrl || null,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentStep: 5 },
    });

    await this.trackStep(userId, 5, 'COMPLETED', dto);

    return {
      success: true,
      message: 'Documents saved successfully',
      nextStep: 'BANK',
    };
  }

  // ─── STEP 5 (SHG) / STEP 4 (Non-SHG): Bank Details ───────────────────────

  async saveBankDetails(userId: number, dto: BankDetailsDto) {
    const user = await this.ensureVerified(userId);
    this.validateStep(user.currentStep, 5);

    await this.prisma.bankDetail.deleteMany({
      where: { userId },
    });

    await this.prisma.bankDetail.create({
      data: {
        userId,
        accountHolderName: dto.accountHolderName,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        upiId: dto.upiId || null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentStep: 6 },
    });

    await this.trackStep(userId, 6, 'COMPLETED', dto);

    return {
      success: true,
      message: 'Bank details saved successfully',
      nextStep: 'OTHER_DETAILS',
    };
  }

  // ─── STEP 6 (SHG) / STEP 5 (Non-SHG): Other Details + Vehicle ────────────

  async saveOtherDetails(userId: number, dto: OtherDetailsDto) {
    try {
      const user = await this.ensureVerified(userId);

      // 1. Save storage space to BusinessDetail
      await this.prisma.businessDetail.upsert({
        where: { userId },
        create: {
          userId,
          storageSpace: dto.storageSpace,
        },
        update: {
          storageSpace: dto.storageSpace,
        },
      });

      // 2. Handle Vehicle
      if (dto.hasVehicle && dto.vehicle) {
        await this.prisma.vehicle.deleteMany({ where: { userId } });
        await this.prisma.vehicle.create({
          data: {
            userId,
            vehicleType: dto.vehicle.vehicleType || VehicleType.OTHER,
            vehicleName: null,
            registrationNumber: dto.vehicle.vehicleRegistrationNo || null,
            licenseNumber: dto.vehicle.licenseNumber || dto.vehicle.drivingLicenseNumber || null,
            rcUrl: null,
            insuranceUrl: null,
            vehicleImageUrl: dto.vehicle.vehicleImageUrl || null,
          },
        });
      } else {
        await this.prisma.vehicle.deleteMany({ where: { userId } });
      }

      // 3. Ensure Unique ID exists
      let requestId = user.uniqueCode;
      if (!requestId) {
        const count = await this.prisma.user.count({
          where: {
            uniqueCode: { startsWith: 'LOG-' },
          },
        });
        requestId = ShgUtil.formatUniqueId(user.role, count + 1);

        await this.prisma.user.update({
          where: { id: userId },
          data: { uniqueCode: requestId }
        });
      }

      // 4. Mark signup as completed
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentStep: 7 },
      });

      await this.trackStep(userId, 7, 'COMPLETED', dto);

      // 5. Final Application upsert
      const application = await this.prisma.application.create({
        data: {
          userId,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        message: 'Signup completed successfully! Your application is under review.',
        requestId: requestId || user.uniqueCode,
        shgUniqueId: requestId || user.uniqueCode,
        status: application.status,
      };
    } catch (err: any) {
      console.error('Save Other Details Error:', err);
      throw new BadRequestException(err.message || 'Error saving other details');
    }
  }

  // ─── Get Signup Progress ─────────────────────────────────────────────────────

  async getSignupProgress(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shgDetail: true,
        products: true,
        address: true,
        documents: true,
        bankDetails: true,
        vehicles: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        stepTracking: {
          orderBy: { step: 'asc' }
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const latestApp = user.applications[0];

    const steps: Record<string, boolean> = {
      profile: !!user.fullName && !!user.role,
      shgDetails: !!user.shgDetail,
      product: user.role === UserRole.SHG ? user.products.length > 0 || user.currentStep > 2 : true,
      address: !!user.address,
      documents: user.documents.length > 0,
      bank: user.bankDetails.length > 0,
      otherDetails: user.currentStep >= 7,
    };

    // Reconstruct consolidated signup data from stepTracking records
    const signupData: Record<string, any> = {
      mobile: user.phoneNumber,
    };

    for (const tracking of user.stepTracking) {
      if (tracking.status === 'COMPLETED' && tracking.data) {
        const stepData = tracking.data as Record<string, any>;
        if (tracking.step === 1) {
          signupData.selectedRole = stepData.userType === 'SHG' ? 'SHG' : 'Individual';
          signupData.fullName = stepData.fullName;
          signupData.age = stepData.age?.toString();
          signupData.profileImage = stepData.photoUrl;
        } else if (tracking.step === 2) {
          if (user.role === UserRole.SHG) {
            signupData.shgRole = stepData.shgRole === 'CRP' ? 'CRP' : stepData.shgRole === 'LEADER' ? 'Leader' : 'Member';
            signupData.shgName = stepData.shgName;
            signupData.shgExperience = stepData.shgExperience === 'ONE_TO_TWO_YEARS' ? '1-2 years' : stepData.shgExperience === 'THREE_TO_FIVE_YEARS' ? '3-5 years' : stepData.shgExperience === 'FIVE_PLUS_YEARS' ? '5+ years' : 'Less than 1 year';
            signupData.shgGroupSize = stepData.shgGroupSize?.toString();
            signupData.leaderName = stepData.shgLeaderName;
            signupData.leaderMobile = stepData.shgLeaderContact;
            signupData.crpName = stepData.crpName;
            signupData.crpMobile = stepData.crpMobile;
            signupData.crpEmail = stepData.crpEmail;
            signupData.isShgLeader = stepData.shgRole === 'LEADER' ? 'Yes' : 'No';
          } else {
            const revRoleMap: Record<string, string> = {
              'DELIVERY_PARTNER': 'Delivery Partner',
              'DRIVER': 'Driver',
              'SHOPKEEPER': 'Shopkeeper / Business Owner',
              'STUDENT': 'Student / Job Seeker',
              'FARMER': 'Farmer',
              'SELF_EMPLOYED': 'Self-employed',
              'OTHER': 'Other'
            };
            signupData.individualRole = revRoleMap[stepData.nonShgRole] || 'Other';
          }
        } else if (tracking.step === 3) {
          signupData.producesProducts = stepData.producesProduct ? 'Yes' : 'No';
          signupData.businessTeamSize = stepData.businessTeamSize?.toString();
          if (stepData.products && stepData.products.length > 0) {
            const p = stepData.products[0];
            signupData.productName = p.productName;
            const revCatMap: Record<string, string> = {
              'FOOD': 'Food',
              'HANDMADE': 'Handmade',
              'AGRICULTURE': 'Agriculture',
              'OTHER': 'Other'
            };
            signupData.productCategory = revCatMap[p.category] || 'Other';
            signupData.dailyProduction = p.dailyProductionQty?.toString();
            signupData.productUnit = p.unit?.toLowerCase();
            signupData.weeklyProduction = p.weeklyProduction?.toString();
            signupData.productPrice = p.price?.toString();
          }
        } else if (tracking.step === 4) {
          signupData.pincode = stepData.pincode;
          signupData.village = stepData.village;
          signupData.taluka = stepData.taluka;
          signupData.district = stepData.district;
          signupData.stateName = stepData.state;
          signupData.houseNo = stepData.houseNo;
          signupData.landmark = stepData.landmark;
        } else if (tracking.step === 5) {
          signupData.aadhaarNumber = stepData.aadhaarNumber;
          signupData.panNumber = stepData.panNumber;
          signupData.aadhaarFront = stepData.aadhaarFrontUrl;
          signupData.aadhaarBack = stepData.aadhaarBackUrl;
          signupData.panImage = stepData.panCardUrl;
        } else if (tracking.step === 6) {
          signupData.accountName = stepData.accountHolderName;
          signupData.accountNumber = stepData.accountNumber;
          signupData.ifscCode = stepData.ifscCode;
          signupData.bankName = stepData.bankName;
          signupData.upiId = stepData.upiId;
        } else if (tracking.step === 7) {
          signupData.storageSpace = stepData.storageSpace;
          signupData.hasVehicle = stepData.hasVehicle ? 'Yes' : 'No';
          if (stepData.vehicle) {
            const revVTypeMap: Record<string, string> = {
              'TWO_WHEELER': 'Bike / Scooty',
              'THREE_WHEELER': 'Auto / Cargo',
              'FOUR_WHEELER': 'Car / Pickup',
              'OTHER': 'Other'
            };
            signupData.vehicleType = revVTypeMap[stepData.vehicle.vehicleType] || 'Other';
            signupData.vehicleRegNo = stepData.vehicle.vehicleRegistrationNo;
            signupData.dlNumber = stepData.vehicle.drivingLicenseNumber;
            signupData.dlImage = stepData.vehicle.drivingLicenseImageUrl;
            signupData.vehicleImage = stepData.vehicle.vehicleImageUrl;
          }
        }
      }
    }

    let frontendStep = 3;
    if (user.currentStep === 1) {
      frontendStep = user.role === UserRole.SHG ? 4 : 6;
    } else if (user.currentStep === 2) {
      frontendStep = user.role === UserRole.SHG ? 5 : 6;
    } else if (user.currentStep === 3) {
      frontendStep = 6;
    } else if (user.currentStep === 4) {
      frontendStep = 7;
    } else if (user.currentStep === 5) {
      frontendStep = 8;
    } else if (user.currentStep === 6) {
      frontendStep = 9;
    } else if (user.currentStep === 7) {
      frontendStep = 10;
    }

    return {
      success: true,
      userId: user.id,
      userType: user.role,
      currentStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
      isCompleted: user.currentStep === 7,
      frontendStep,
      signupData,
      steps,
      history: user.stepTracking.map(s => ({
        step: s.step,
        status: s.status,
        updatedAt: s.updatedAt
      })),
      application: latestApp
        ? {
          requestId: latestApp.id,
          status: latestApp.status,
          rejectionReason: latestApp.rejectionReason,
          approvedAt: latestApp.approvedAt,
          rejectedAt: latestApp.rejectedAt,
        }
        : null,
    };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async ensureVerified(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!user.isVerified) {
      throw new ForbiddenException('Mobile number not verified. Please verify OTP first.');
    }
    return user;
  }

  private ensureUserType(currentRole: UserRole, expectedRole: UserRole) {
    if (currentRole !== expectedRole) {
      throw new BadRequestException(
        `This endpoint is only for ${expectedRole} users. Current user role: ${currentRole}`,
      );
    }
  }

  private validateStep(currentStep: number, minRequiredStep: number) {
    if (currentStep < minRequiredStep) {
      throw new BadRequestException(`Please complete the previous steps first. Current step progress: ${currentStep}`);
    }
  }
}
