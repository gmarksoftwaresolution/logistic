import { Module } from '@nestjs/common';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';
import { AuthModule } from '../auth/auth.module';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [AuthModule, OtpModule],
  providers: [SignupService],
  controllers: [SignupController],
})
export class SignupModule {}
