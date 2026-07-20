import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommunityManagementModule } from './community-management/community-management.module';
import { TransporterManagementModule } from './transporter-management/transporter-management.module';
import { OrderManagementModule } from './order-management/order-management.module';
import { QrModule } from './qr/qr.module';
import { AppController } from './app.controller';
import { LocationModule } from './location/location.module';

// Reload trigger: 2026-07-19
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000, // Large limit for developer manual testing
    }]),
    PrismaModule,
    AuthModule,
    CommunityManagementModule,
    TransporterManagementModule,
    OrderManagementModule,
    QrModule,
    LocationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
