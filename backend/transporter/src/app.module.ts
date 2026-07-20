import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RegistrationModule } from './registration/registration.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './application/application.module';
import { LoggerMiddleware } from './common/logger.middleware';
import { OrderModule } from './order/order.module';
import { QrModule } from './qr/qr.module';
import { LocationModule } from './location/location.module';

// Reload trigger: 2026-07-19
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    RegistrationModule,
    UploadModule,
    AdminModule,
    UserModule,
    ApplicationModule,
    OrderModule,
    QrModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
