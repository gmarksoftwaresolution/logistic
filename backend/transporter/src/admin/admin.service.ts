import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ApplicationStatus, VehicleType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getRequests(status?: ApplicationStatus) {
    return this.prisma.user.findMany({
      where: status ? { applicationStatus: status } : {},
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
      },
    });
  }

  async approveRequest(requestId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
      include: { drivingDetail: true }
    });

    if (!user) {
      throw new NotFoundException('Application request not found');
    }

    if (user.applicationStatus === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application already approved');
    }

    if (user.applicationStatus === ApplicationStatus.REJECTED) {
      throw new BadRequestException('Cannot approve a rejected application');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        applicationStatus: ApplicationStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // Save all transporter details in their respective tables upon approval
    await this.populateTransporterDetails(user.id);

    return {
      success: true,
      message: 'Application processed successfully',
      transporterId: updated.uniqueCode,
      status: updated.applicationStatus,
    };
  }

  async rejectRequest(requestId: number, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
    });

    if (!user) {
      throw new NotFoundException('Application request not found');
    }

    if (
      user.applicationStatus !== ApplicationStatus.PENDING &&
      user.applicationStatus !== ApplicationStatus.UNDER_REVIEW &&
      user.applicationStatus !== ApplicationStatus.COMPLETED
    ) {
      throw new BadRequestException('Application already processed');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        applicationStatus: ApplicationStatus.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Application processed successfully',
      status: updated.applicationStatus,
    };
  }

  private async populateTransporterDetails(userId: number) {
    const steps = await this.prisma.stepTracking.findMany({
      where: { userId },
    });

    const stepData: Record<number, any> = {};
    for (const step of steps) {
      stepData[step.step] = typeof step.data === 'string' ? JSON.parse(step.data) : step.data;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: true,
        bankDetails: true,
      }
    });

    if (!user) return;

    // 1. Driving Detail (Step 2)
    const s2 = stepData[2];
    if (s2) {
      await this.prisma.drivingDetail.upsert({
        where: { userId },
        update: {
          licenseNumber: s2.licenseNumber,
          expiryDate: new Date(s2.expiryDate),
          drivingExperience: s2.experienceYears,
          drivingLicenseNo: s2.licenseNumber,
          drivingLicenseUrl: s2.licensePhoto,
        },
        create: {
          userId,
          licenseNumber: s2.licenseNumber,
          expiryDate: new Date(s2.expiryDate),
          drivingExperience: s2.experienceYears,
          drivingLicenseNo: s2.licenseNumber,
          drivingLicenseUrl: s2.licensePhoto,
        },
      });
    }

    // 2. Transporter Detail (Step 4 & Step 2 driving experience)
    const s4 = stepData[4];
    const vehicleCategory = (s4 && s4.vehicleCategory === 'MILK_VAN') ? 'MILK_VAN' : 'OTHER';

    const existingTd = await this.prisma.transporterDetail.findUnique({
      where: { userId }
    });
    const trCode = existingTd?.transporterCode || user.uniqueCode || `TR-${userId}`;

    await this.prisma.transporterDetail.upsert({
      where: { userId },
      update: {
        transporterCode: trCode,
        vehicleCategory: vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER',
        experienceYears: s2?.experienceYears || null,
      },
      create: {
        userId,
        transporterCode: trCode,
        vehicleCategory: vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER',
        experienceYears: s2?.experienceYears || null,
      },
    });

    // 3. Milk Van Detail (Step 5 Milk Van & Step 6 Milk Van)
    const s5mv = stepData[5];
    const s6mv = stepData[6];
    if (vehicleCategory === 'MILK_VAN') {
      if (s5mv || s6mv) {
        await this.prisma.milkVanDetail.upsert({
          where: { userId },
          update: {
            sangathanName: s5mv?.sangathanName || '',
            centerName: s5mv?.centerName || '',
            assignedVillages: s6mv?.assignedVillages || null,
            morningShiftTime: s6mv?.morningShiftTime || null,
            eveningShiftTime: s6mv?.eveningShiftTime || null,
          },
          create: {
            userId,
            sangathanName: s5mv?.sangathanName || '',
            centerName: s5mv?.centerName || '',
            assignedVillages: s6mv?.assignedVillages || null,
            morningShiftTime: s6mv?.morningShiftTime || null,
            eveningShiftTime: s6mv?.eveningShiftTime || null,
          },
        });
      }
    }

    // 4. Route Detail (Step 6 Personal or Step 6 Milk Van)
    const s6p = stepData[6];
    if (vehicleCategory === 'MILK_VAN') {
      if (s6mv) {
        const operatingAreaVal = Array.isArray(s6mv.assignedVillages)
          ? s6mv.assignedVillages.join(', ')
          : 'Milk Van Route';
        await this.prisma.routeDetail.upsert({
          where: { userId },
          update: {
            operatingArea: operatingAreaVal,
            workingDays: s6mv.workingDays || null,
            workingSchedule: s6mv.workingSchedule || null,
          },
          create: {
            userId,
            operatingArea: operatingAreaVal,
            workingDays: s6mv.workingDays || null,
            workingSchedule: s6mv.workingSchedule || null,
          },
        });
      }
    } else {
      if (s6p) {
        await this.prisma.routeDetail.upsert({
          where: { userId },
          update: {
            operatingArea: s6p.operatingArea || '',
            pickupLocations: s6p.pickupLocations || null,
            dropLocations: s6p.dropLocations || null,
            workingDays: s6p.workingDays || null,
            workingSchedule: s6p.workingSchedule || null,
          },
          create: {
            userId,
            operatingArea: s6p.operatingArea || '',
            pickupLocations: s6p.pickupLocations || null,
            dropLocations: s6p.dropLocations || null,
            workingDays: s6p.workingDays || null,
            workingSchedule: s6p.workingSchedule || null,
          },
        });
      }
    }

    // 5. Other Details (Step 5 Personal or Step 7 Milk Van)
    const s5p = stepData[5];
    const s7mv = stepData[7];
    const vehicleInfo = vehicleCategory === 'MILK_VAN' ? s7mv : s5p;
    if (vehicleInfo) {
      const existingVehicles = await this.prisma.otherDetails.findMany({ where: { userId } });
      if (existingVehicles.length > 0) {
        await this.prisma.otherDetails.update({
          where: { id: existingVehicles[0].id },
          data: {
            vehicleType: vehicleInfo.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
            vehicleName: vehicleInfo.make || null,
            registrationNumber: vehicleInfo.number || null,
            rcUrl: vehicleInfo.rcUpload || null,
            insuranceUrl: vehicleInfo.insuranceUpload || null,
            wheeler: vehicleInfo.wheeler || null,
          },
        });
      } else {
        await this.prisma.otherDetails.create({
          data: {
            userId,
            vehicleType: vehicleInfo.type || (vehicleCategory === 'MILK_VAN' ? 'MILK_VAN' : 'OTHER'),
            vehicleName: vehicleInfo.make || null,
            registrationNumber: vehicleInfo.number || null,
            rcUrl: vehicleInfo.rcUpload || null,
            insuranceUrl: vehicleInfo.insuranceUpload || null,
            wheeler: vehicleInfo.wheeler || null,
          },
        });
      }
    }
  }
}
