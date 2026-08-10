import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'logistic-platform-jwt-secret-key-2026',
    });
  }

  async validate(payload: any) {
    if (!payload || (!payload.sub && !payload.phoneNumber && !payload.mobile)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const sub = payload.sub;
    const phone = payload.phoneNumber || payload.mobile || payload.mobileNumber;

    let user: any = null;

    // 1. Find by integer id if sub is number or integer numeric string (< 9 digits)
    if (typeof sub === 'number' || (typeof sub === 'string' && !isNaN(Number(sub)) && Number.isInteger(Number(sub)) && sub.length < 9)) {
      user = await this.prisma.user.findUnique({
        where: { id: Number(sub) },
      });
    }

    // 2. Find by authId ONLY if sub is a valid UUID v4 format
    const isUuid = (val: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (!user && typeof sub === 'string' && isUuid(sub)) {
      user = await this.prisma.user.findFirst({
        where: { authId: sub },
      });
    }

    // 3. Find by phoneNumber
    if (!user && (phone || typeof sub === 'string')) {
      const phoneToFind = String(phone || sub).trim();
      const cleaned = phoneToFind.replace(/\D/g, '').slice(-10);
      if (cleaned.length === 10) {
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { phoneNumber: cleaned },
              { phoneNumber: `+91${cleaned}` },
              { phoneNumber: phoneToFind },
            ],
          },
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('User not found or invalid token');
    }

    return user;
  }
}
