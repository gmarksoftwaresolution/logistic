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
        vehicles: true,
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.fullName,
      }
    };
  }

  async getDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shgDetail: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const latestApp = user.applications[0];

    return {
      id: user.id,
      fullName: user.fullName || 'N/A',
      userType: user.role,
      signupStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
      isCompleted: user.currentStep === 7,
      mobileNumber: this.maskMobile(user.phoneNumber),
      role: user.role === 'SHG'
        ? user.shgDetail?.shgRole
        : user.role,
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
