import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './common/prisma/prisma.service';
import { LocationModule } from './shared/location/location.module';
import { AuthModule } from './shared/auth/auth.module';
import { QrModule } from './shared/qr/qr.module';
import { UploadsModule } from './shared/uploads/uploads.module';

// GMU Feature Modules
import { CommunityManagementModule } from './modules/gmu/community-management/community-management.module';
import { TransporterManagementModule } from './modules/gmu/transporter-management/transporter-management.module';
import { OrderManagementModule } from './modules/gmu/order-management/order-management.module';

// SHG Feature Modules
import { OrderModule as ShgOrderModule } from './modules/shg/order/order.module';
import { OrderHistoryModule } from './modules/shg/modules/order-history/order-history.module';
import { EarningsModule } from './modules/shg/earnings/earnings.module';
import { UserModule as ShgUserModule } from './modules/shg/user/user.module';
import { ApplicationModule as ShgApplicationModule } from './modules/shg/application/application.module';
import { SignupModule } from './modules/shg/signup/signup.module';

// Transporter Feature Modules
import { RegistrationModule } from './modules/transporter/registration/registration.module';
import { OrderModule as TransporterOrderModule } from './modules/transporter/order/order.module';
import { UserModule as TransporterUserModule } from './modules/transporter/user/user.module';
import { ApplicationModule as TransporterApplicationModule } from './modules/transporter/application/application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    LocationModule,
    AuthModule,
    QrModule,
    UploadsModule,
    CommunityManagementModule,
    TransporterManagementModule,
    OrderManagementModule,
    ShgOrderModule,
    OrderHistoryModule,
    EarningsModule,
    ShgUserModule,
    ShgApplicationModule,
    SignupModule,
    RegistrationModule,
    TransporterOrderModule,
    TransporterUserModule,
    TransporterApplicationModule,
  ],
})
export class AppModule {}
