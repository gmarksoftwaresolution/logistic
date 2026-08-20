import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../../common/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
