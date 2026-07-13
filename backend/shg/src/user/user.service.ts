import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shgDetail: true,
        products: true,
        address: true,
        documents: true,
        bankDetails: true,
        otherDetails: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Mask sensitive data
    const maskedUser = {
      ...user,
      mobileNumber: this.maskMobile(user.phoneNumber),
      document: user.documents && user.documents.length > 0
        ? {
          ...user.documents[0],
          aadhaarNumber: this.maskAadhaar(user.documents[0].aadhaarNumber || ''),
          panNumber: this.maskPan(user.documents[0].panNumber || ''),
        }
        : null,
      bankDetails: user.bankDetails.map((bd: any) => ({
        ...bd,
        accountNumber: this.maskAccount(bd.accountNumber),
      })),
    };

    return maskedUser;
  }

  async updateProfile(userId: number, updateData: any) {
    const dataToUpdate: any = {};
    if (updateData.name !== undefined) {
      dataToUpdate.fullName = updateData.name;
    }
    if (updateData.profileImage !== undefined) {
      dataToUpdate.profilePhoto = updateData.profileImage;
    }

    const addressData: any = {};
    if (updateData.pincode !== undefined) addressData.pincode = updateData.pincode;
    if (updateData.stateName !== undefined) addressData.state = updateData.stateName;
    if (updateData.district !== undefined) addressData.district = updateData.district;
    if (updateData.taluka !== undefined) addressData.taluka = updateData.taluka;
    if (updateData.village !== undefined) addressData.village = updateData.village;
    if (updateData.homeAddress !== undefined) addressData.houseNo = updateData.homeAddress;

    let user;
    if (Object.keys(dataToUpdate).length > 0 || Object.keys(addressData).length === 0) {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
    } else {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    }

    if (Object.keys(addressData).length > 0) {
      await this.prisma.address.upsert({
        where: { userId: userId },
        update: addressData,
        create: {
          ...addressData,
          userId: userId,
          houseNo: addressData.houseNo || '',
          district: addressData.district || '',
          state: addressData.state || '',
          pincode: addressData.pincode || '',
        }
      });
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user?.id,
        name: user?.fullName,
      }
    };
  }

  async getDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shgDetail: true,
        stepTracking: {
          where: { step: 2 }
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const latestApp = user.applications[0];

    let resolvedRole: string = user.role;
    if (user.role === 'SHG') {
      if (user.shgDetail?.shgRole) {
        resolvedRole = user.shgDetail.shgRole;
      } else {
        const step2 = user.stepTracking.find(t => t.step === 2);
        if (step2 && step2.data) {
          const data = step2.data as any;
          resolvedRole = data.shgRole || user.role;
        }
      }
    }

    return {
      id: user.id,
      fullName: user.fullName || 'N/A',
      userType: user.role,
      signupStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
      isCompleted: user.currentStep === 7,
      mobileNumber: this.maskMobile(user.phoneNumber),
      role: resolvedRole,
      applicationStatus: latestApp?.status || null,
      requestId: user.uniqueCode || latestApp?.id || null,
      shgUniqueId: user.uniqueCode,
    };
  }

  // ─── Masking Helpers ─────────────────────────────────────────────────────────

  private maskMobile(mobile: string): string {
    if (!mobile || mobile.length < 10) return 'XXXXXX XXXX';
    return `XXXXXX${mobile.slice(-4)}`;
  }

  private maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length < 12) return 'XXXX XXXX XXXX';
    return `XXXX XXXX ${aadhaar.slice(-4)}`;
  }

  private maskPan(pan: string): string {
    if (!pan || pan.length < 10) return 'XXXXXXXXXX';
    return `${pan.slice(0, 2)}XXXXXX${pan.slice(-2)}`;
  }

  private maskAccount(account: string): string {
    if (!account || account.length < 4) return 'XXXXXXXXXX';
    return `${'X'.repeat(account.length - 4)}${account.slice(-4)}`;
  }
}
