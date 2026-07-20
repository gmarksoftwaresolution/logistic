import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './application/application.module';
import { OtpModule } from './otp/otp.module';
import { SignupModule } from './signup/signup.module';
import { UploadsModule } from './uploads/uploads.module';
import { AdminModule } from './admin/admin.module';
import { LocationModule } from './location/location.module';
import { OrderModule } from './order/order.module';
import { OrderHistoryModule } from './modules/order-history/order-history.module';
import { QrModule } from './qr/qr.module';

// Reload trigger: 2026-07-19
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ApplicationModule,
    OtpModule,
    SignupModule,
    UploadsModule,
    AdminModule,
    LocationModule,
    OrderModule,
    OrderHistoryModule,
    QrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

