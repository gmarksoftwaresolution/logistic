import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private userCache = new Map<number, { user: any; expiresAt: number }>();

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'logistic-platform-jwt-secret-key-2026',
    });
  }

  async validate(payload: any) {
    const userId = Number(payload.sub);
    const now = Date.now();

    if (userId) {
      const cached = this.userCache.get(userId);
      if (cached && cached.expiresAt > now) {
        return cached.user;
      }
    }

    let user: any = null;
    if (userId && !isNaN(userId)) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
    }

    // Fallback: If user ID not found (e.g. after DB reseed/reset), lookup by phone number
    const phone = payload.phoneNumber || payload.mobile;
    if (!user && phone) {
      const cleaned = String(phone).replace(/\D/g, '').slice(-10);
      if (cleaned) {
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { phoneNumber: cleaned },
              { phoneNumber: `+91${cleaned}` },
              { phoneNumber: String(phone) },
            ],
          },
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('User not found or invalid token');
    }

    if (user.id) {
      this.userCache.set(user.id, { user, expiresAt: now + 60000 }); // cache for 60 seconds
    }
    return user;
  }
}
