import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto, VerifyOtpDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const mobile = dto.mobileNumber;
    
    // Validation: Mobile = 10 digits
    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      console.log('Invalid mobile number');
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number',
      });
    }

    // Temp logic: Valid Mobile is 1111111111
    if (mobile !== '1111111111') {
      console.log('Invalid mobile number');
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number',
      });
    }

    console.log('===================================');
    console.log('GMU OTP SENT');
    console.log(`Mobile Number: ${mobile}`);
    console.log('OTP: 123456');
    console.log('===================================');

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const mobile = dto.mobileNumber;
    const otp = dto.otp;

    // Validation: Mobile = 10 digits
    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number',
      });
    }

    // Validation: OTP = 6 digits
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Wrong mobile checks
    if (mobile !== '1111111111') {
      throw new BadRequestException({
        success: false,
        message: 'Invalid mobile number',
      });
    }

    // Wrong OTP checks
    if (otp !== '123456') {
      throw new BadRequestException({
        success: false,
        message: 'Invalid OTP',
      });
    }

    console.log('===================================');
    console.log('GMU OTP VERIFIED');
    console.log(`Mobile Number: ${mobile}`);
    console.log('===================================');

    // Find admin user
    const admin = await this.prisma.adminUser.findUnique({
      where: { mobileNumber: mobile },
    });

    if (!admin) {
      throw new NotFoundException({
        success: false,
        message: 'Admin user not found',
      });
    }

    console.log('===================================');
    console.log('GMU LOGIN SUCCESS');
    console.log(`User: ${admin.name}`);
    console.log(`Role: ${admin.role}`);
    console.log('===================================');

    const tokens = await this.getTokens(admin.id, admin.mobileNumber);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: admin.id,
        mobileNumber: admin.mobileNumber,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async login(dto: LoginDto) {
    // login does the same as verify-otp as per requirements
    return this.verifyOtp({
      mobileNumber: dto.mobileNumber,
      otp: dto.otp,
    });
  }

  async getTokens(userId: string, mobile: string) {
    const payload = { sub: userId, mobile };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'GMU_SECRET_KEY',
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'GMU_REFRESH_SECRET',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
