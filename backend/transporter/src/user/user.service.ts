import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { VehicleType } from '@prisma/client';
import { VehicleCategory } from '../registration/dto/registration.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
        vehicles: true,
        routeDetail: true,
        milkVanDetail: true,
        transporterDetail: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [firstName, ...lastNameParts] = (user.fullName || '').split(' ');

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
      drivingDetails: user.drivingDetail,
      bankDetails: user.bankDetails?.[0] || null,
      vehicleDetails: user.vehicles?.[0] || null,
      routeDetails: user.routeDetail,
      milkVanDetails: user.milkVanDetail,
      milkVanRoute: user.routeDetail,
    };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        vehicles: true,
        routeDetail: true,
        transporterDetail: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userName = user.fullName || user.phoneNumber;
    const completionPercentage = this.calculateCompletion(user);

    return {
      userName,
      profileCompletion: completionPercentage,
      currentStep: user.currentStep,
      applicationStatus: user.applicationStatus,
      highlights: {
        vehicle: user.vehicles?.[0]?.vehicleName || 'Not updated',
        category: user.transporterDetail?.vehicleCategory || 'Not selected',
        route: user.routeDetail?.operatingArea || 'Not updated',
      },
    };
  }

  private calculateCompletion(user: any): number {
    if (user.currentStep >= 8) return 100;
    
    const maxSteps = user.transporterDetail?.vehicleCategory === VehicleType.MILK_VAN ? 7 : 6;
    const current = Math.min(user.currentStep, maxSteps);
    
    return Math.round((current / maxSteps) * 100);
  }
}
