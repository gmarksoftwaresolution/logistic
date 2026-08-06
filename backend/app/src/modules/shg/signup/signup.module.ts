import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller';
import { SignupService } from './signup.service';
import { AuthModule } from '../../../shared/auth/auth.module';
import { LocationModule } from '../../../shared/location/location.module';

@Module({
  imports: [AuthModule, LocationModule],
  controllers: [SignupController],
  providers: [SignupService],
  exports: [SignupService],
})
export class SignupModule {}
