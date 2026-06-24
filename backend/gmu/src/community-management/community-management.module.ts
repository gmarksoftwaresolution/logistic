import { Module } from '@nestjs/common';
import { CommunityManagementController } from './community-management.controller';
import { CommunityManagementService } from './community-management.service';

@Module({
  controllers: [CommunityManagementController],
  providers: [CommunityManagementService],
  exports: [CommunityManagementService],
})
export class CommunityManagementModule {}
