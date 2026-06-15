import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async generateTokens(user: any) {
    const payload = { 
      sub: user.id, 
      phoneNumber: user.phoneNumber, 
      role: user.role,
      status: user.applicationStatus,
      ...(user.uniqueCode ? { transporterUniqueId: user.uniqueCode } : {})
    };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '3650d' });
    
    return { accessToken, refreshToken };
  }

  async sendOtp(mobileNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: mobileNumber },
    });

    if (!user) {
      throw new NotFoundException('User not registered. Please sign up first.');
    }

    if (user.applicationStatus === ApplicationStatus.PENDING) {
      throw new ForbiddenException('Registration incomplete. Please complete sign up first.');
    }

    console.log(`Sending OTP 123456 to ${mobileNumber}`);
    return { success: true, message: 'OTP sent successfully (Simulated: 123456)' };
  }

  async verifyOtp(mobileNumber: string, otp: string) {
    if (otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: mobileNumber },
    });

    if (!user) {
      throw new NotFoundException('User not registered. Please sign up first.');
    }

    if (user.applicationStatus === ApplicationStatus.PENDING) {
      throw new ForbiddenException('Registration incomplete. Please complete sign up first.');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    const response: any = {
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
        requestId: user.id, // mapped
        transporterUniqueId: user.uniqueCode,
      },
    };

    if (user.applicationStatus === ApplicationStatus.REJECTED) {
      response.user.rejectionReason = user.rejectionReason;
    }

    return response;
  }
}
