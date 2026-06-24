import { Module } from '@nestjs/common';
import { TransporterManagementController } from './transporter-management.controller';
import { TransporterManagementService } from './transporter-management.service';

@Module({
  controllers: [TransporterManagementController],
  providers: [TransporterManagementService],
  exports: [TransporterManagementService],
})
export class TransporterManagementModule {}
