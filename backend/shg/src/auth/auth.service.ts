import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private jwtService: JwtService,
  ) {}

  async sendLoginOtp(dto: SendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber },
    });

    if (!user) {
      throw new NotFoundException('User not registered. Please sign up first.');
    }

    await this.otpService.generateOtp(dto.mobileNumber, 'LOGIN');
    return { success: true, message: 'Login OTP sent successfully' };
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.mobileNumber, dto.otp, 'LOGIN');

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.mobileNumber },
      include: {
        shgDetail: true,
        address: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const tokens = await this.getTokens(user.id, user.phoneNumber);

    const latestApp = user.applications[0];

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      transporterUniqueId: user.uniqueCode,
      userDetails: {
        id: user.id,
        fullName: user.fullName || 'N/A',
        userType: user.role, // role represents SHG, INDIVIDUAL, TRANSPORTER
        signupStep: user.currentStep === 7 ? 'COMPLETED' : 'PROFILE', // map step int to string for frontend compatibility
        mobileNumber: user.phoneNumber,
        applicationStatus: latestApp?.status || null,
        rejectionReason: latestApp?.rejectionReason || null,
        role: user.role,
        shgUniqueId: user.uniqueCode,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret',
      });
      if (payload.sub !== userId) {
        throw new NotFoundException('Access Denied');
      }
    } catch (e) {
      throw new NotFoundException('Invalid Refresh Token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const tokens = await this.getTokens(user.id, user.phoneNumber);
    return tokens;
  }

  async getTokens(userId: string, mobile: string) {
    const payload = { sub: userId, mobile };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'super-secret',
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
