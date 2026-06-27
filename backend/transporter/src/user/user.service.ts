import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { VehicleType } from '@prisma/client';
import { VehicleCategory } from '../registration/dto/registration.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
        otherDetails: true,
        routeDetail: true,
        milkVanDetail: true,
        transporterDetail: true,
        stepTracking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
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
        residentialAddress: user.address.houseNo,
        pinCode: user.address.pincode,
        profilePhoto: user.profilePhoto,
      } : null,
      drivingDetails: user.drivingDetail,
      bankDetails: user.bankDetails?.[0] || null,
      vehicleDetails: user.otherDetails?.[0] || null,
      routeDetails: user.routeDetail,
      milkVanDetails: user.milkVanDetail,
      milkVanRoute: user.routeDetail,
    };
  }

  async getDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        otherDetails: true,
        routeDetail: true,
        transporterDetail: true,
        stepTracking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let vehicleCategory = 'Not selected';
    if (user.transporterDetail?.vehicleCategory) {
      vehicleCategory = user.transporterDetail.vehicleCategory;
    } else {
      const st4 = user.stepTracking?.find((st) => st.step === 4);
      if (st4 && st4.data) {
        const st4Data = typeof st4.data === 'string' ? JSON.parse(st4.data) : st4.data;
        vehicleCategory = st4Data.vehicleCategory || 'Not selected';
      }
    }

    const userName = user.fullName || user.phoneNumber;
    const completionPercentage = this.calculateCompletion(user);

    return {
      userName,
      profileCompletion: completionPercentage,
      currentStep: user.currentStep,
      applicationStatus: user.applicationStatus,
      highlights: {
        vehicle: user.otherDetails?.[0]?.vehicleName || 'Not updated',
        category: vehicleCategory,
        route: user.routeDetail?.operatingArea || 'Not updated',
      },
    };
  }

  private calculateCompletion(user: any): number {
    if (user.currentStep >= 8) return 100;
    
    let isMilkVan = false;
    if (user.transporterDetail?.vehicleCategory) {
      isMilkVan = user.transporterDetail.vehicleCategory === VehicleType.MILK_VAN;
    } else {
      const st4 = user.stepTracking?.find((st: any) => st.step === 4);
      if (st4 && st4.data) {
        const st4Data = typeof st4.data === 'string' ? JSON.parse(st4.data) : st4.data;
        isMilkVan = st4Data.vehicleCategory === 'MILK_VAN';
      }
    }

    const maxSteps = isMilkVan ? 7 : 6;
    const current = Math.min(user.currentStep, maxSteps);
    
    return Math.round((current / maxSteps) * 100);
  }
}
