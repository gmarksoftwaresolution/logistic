import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendOtpDto, VerifyOtpDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  private sanitizeMobile(mobile: string): string {
    return (mobile || '').replace(/\D/g, '').slice(-10);
  }

  async generateOtp(mobileNumber: string, type: string): Promise<string> {
    const cleaned = this.sanitizeMobile(mobileNumber);
    await this.prisma.oTPVerification.deleteMany({
      where: { phoneNumber: cleaned, type },
    });

    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.oTPVerification.create({
      data: {
        phoneNumber: cleaned,
        otp,
        type,
        expiresAt,
      },
    });

    console.log(`[AUTH] OTP generated for ${cleaned}: ${otp}`);
    return otp;
  }

  async verifyOtp(mobileNumber: string, otp: string, type: string): Promise<boolean> {
    const cleaned = this.sanitizeMobile(mobileNumber);

    // Bypass check for default test OTP
    if (otp === '123456') {
      return true;
    }

    const record = await this.prisma.oTPVerification.findFirst({
      where: {
        phoneNumber: cleaned,
        otp,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.oTPVerification.delete({
      where: { id: record.id },
    });

    return true;
  }

  async sendLoginOtp(dto: SendOtpDto) {
    const cleaned = this.sanitizeMobile(dto.mobileNumber);
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleaned },
          { phoneNumber: `+91${cleaned}` },
          { phoneNumber: dto.mobileNumber }
        ]
      },
    });

    if (user && dto.appType) {
      if (dto.appType === 'SHG' && user.role === 'TRANSPORTER') {
        throw new BadRequestException('This mobile number is registered as a Transporter. Please log in using the Transporter App.');
      }
      if (dto.appType === 'TRANSPORTER' && user.role === 'SHG') {
        throw new BadRequestException('This mobile number is registered as an SHG Member. Please log in using the SHG App.');
      }
    }

    if (!user) {
      if (dto.appType === 'TRANSPORTER') {
        throw new BadRequestException('This mobile number is not registered as a Transporter. Please sign up first.');
      }
      // GMU Admin or default fallback
      user = await this.prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: cleaned,
          fullName: 'GMU Coordinator',
          role: 'INDIVIDUAL',
          applicationStatus: 'APPROVED',
          uniqueCode: `GMU-${cleaned.slice(-4)}`,
        }
      });
    }

    await this.generateOtp(cleaned, 'LOGIN');
    return { success: true, message: 'Login OTP sent successfully' };
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    const cleaned = this.sanitizeMobile(dto.mobileNumber);
    await this.verifyOtp(cleaned, dto.otp, 'LOGIN');

    let userAny: any = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleaned },
          { phoneNumber: `+91${cleaned}` },
          { phoneNumber: dto.mobileNumber }
        ]
      },
      include: {
        shgDetail: true,
        address: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!userAny) {
      if (dto.appType === 'TRANSPORTER') {
        throw new BadRequestException('This account is not registered. Please register as a Transporter first.');
      }
      userAny = await this.prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: cleaned,
          fullName: 'GMU Coordinator',
          role: 'INDIVIDUAL',
          applicationStatus: 'APPROVED',
          uniqueCode: `GMU-${cleaned.slice(-4)}`,
        },
        include: {
          shgDetail: true,
          address: true,
          applications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        }
      });
    }

    // Role Enforcement:
    if (dto.appType === 'SHG' && userAny.role === 'TRANSPORTER') {
      throw new BadRequestException('This account is registered as a Transporter. Please log in using the Transporter App.');
    }
    if (dto.appType === 'TRANSPORTER' && userAny.role === 'SHG') {
      throw new BadRequestException('This account is registered as an SHG Member. Please log in using the SHG App.');
    }
    if (dto.appType === 'TRANSPORTER' && userAny.role === 'INDIVIDUAL') {
      await this.prisma.user.update({
        where: { id: userAny.id },
        data: { role: 'TRANSPORTER' },
      });
      userAny.role = 'TRANSPORTER';
    }

    const tokens = await this.getTokens(userAny.id, userAny.phoneNumber);
    const latestApp = userAny.applications ? userAny.applications[0] : null;

    const rawStatus = (userAny.applicationStatus || latestApp?.status || '').toUpperCase();
    let computedAppStatus = 'INCOMPLETE';
    if (rawStatus === 'APPROVED') {
      computedAppStatus = 'APPROVED';
    } else if (rawStatus === 'REJECTED') {
      computedAppStatus = 'REJECTED';
    } else if (rawStatus === 'COMPLETED' || rawStatus === 'UNDER_REVIEW') {
      computedAppStatus = 'PENDING';
    } else if ((userAny.currentStep || 1) >= 7) {
      computedAppStatus = 'PENDING';
    } else {
      computedAppStatus = 'INCOMPLETE';
    }

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      transporterUniqueId: userAny.uniqueCode,
      userDetails: {
        id: userAny.id,
        fullName: userAny.fullName || 'N/A',
        userType: userAny.role,
        signupStep: userAny.currentStep === 7 ? 'COMPLETED' : 'PROFILE',
        currentStep: userAny.currentStep || 1,
        mobileNumber: userAny.phoneNumber,
        applicationStatus: computedAppStatus,
        rejectionReason: userAny.rejectionReason || latestApp?.rejectionReason || null,
        role: userAny.role,
        shgUniqueId: userAny.uniqueCode,
        pincode: userAny.address?.pincode || '',
        stateName: userAny.address?.state || '',
        district: userAny.address?.district || '',
        taluka: userAny.address?.taluka || '',
        village: userAny.address?.village || '',
        homeAddress: userAny.address?.houseNo || '',
        profileImage: userAny.profilePhoto || null,
      },
    };
  }

  async login(dto: LoginDto) {
    return this.verifyLoginOtp({ mobileNumber: dto.mobileNumber, otp: dto.otp });
  }

  async refreshTokens(userId: number, refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'logistic-platform-jwt-refresh-secret-2026',
      });
      if (payload.sub !== userId) {
        throw new NotFoundException('Access Denied');
      }
    } catch (e) {
      throw new NotFoundException('Invalid Refresh Token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.getTokens(user.id, user.phoneNumber);
  }

  async getTokens(userId: number, mobile: string) {
    const payload = { sub: userId, mobile, phoneNumber: mobile };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'logistic-platform-jwt-secret-key-2026',
        expiresIn: '30d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'logistic-platform-jwt-refresh-secret-2026',
        expiresIn: '90d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
