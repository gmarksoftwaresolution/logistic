import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async generateOtp(mobileNumber: string, type: string): Promise<string> {

    // Invalidate any previous OTPs for this mobile and type
    await this.prisma.oTPVerification.deleteMany({
      where: { phoneNumber: mobileNumber, type },
    });

    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.oTPVerification.create({
      data: {
        phoneNumber: mobileNumber,
        otp,
        type,
        expiresAt,
      },
    });

    console.log(`[DATABASE] OTP record created for ${mobileNumber}`);
    // In production, send this via SMS gateway
    console.log(`[${type}] OTP for ${mobileNumber}: ${otp}`);
    return otp;
  }

  async verifyOtp(mobileNumber: string, otp: string, type: string): Promise<boolean> {
    // For testing purposes, allow '123456' as a bypass
    if (otp === '123456') {
      return true;
    }

    const record = await this.prisma.oTPVerification.findFirst({
      where: {
        phoneNumber: mobileNumber,
        type,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      throw new BadRequestException('No OTP request found. Please request a new OTP.');
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      await this.prisma.oTPVerification.delete({ where: { id: record.id } });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check attempts
    if (record.attempts >= 5) {
      await this.prisma.oTPVerification.delete({ where: { id: record.id } });
      throw new ForbiddenException('Too many failed attempts. Please request a new OTP.');
    }

    // Check match
    if (record.otp !== otp) {
      await this.prisma.oTPVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 5 - (record.attempts + 1);
      throw new BadRequestException(`Invalid OTP. ${remaining} attempts remaining.`);
    }

    // Success - Clear OTP
    await this.prisma.oTPVerification.deleteMany({
      where: { phoneNumber: mobileNumber, type },
    });

    return true;
  }
}
