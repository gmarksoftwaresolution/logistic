import { Module } from '@nestjs/common';
import { CommunityManagementController } from './community-management.controller';
import { CommunityManagementService } from './community-management.service';
import { OrderManagementModule } from '../order-management/order-management.module';

@Module({
  imports: [OrderManagementModule],
  controllers: [CommunityManagementController],
  providers: [CommunityManagementService],
  exports: [CommunityManagementService],
})
export class CommunityManagementModule {}
