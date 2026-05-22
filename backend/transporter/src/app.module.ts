import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RegistrationModule } from './registration/registration.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './application/application.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
