import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    
    if (userId === undefined || userId === null) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
    if (isNaN(parsedUserId)) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsedUserId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    console.log('--- JWT AUTH VALIDATION ---');
    console.log(`User ID: ${user.id} | Phone: ${user.phoneNumber} | Role: ${user.role}`);
    console.log('---------------------------');

    return user;
  }
}
