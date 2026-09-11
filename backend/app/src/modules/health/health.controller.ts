import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async checkHealth(@Res() res: Response) {
    const startTime = Date.now();
    let dbStatus = 'disconnected';

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1;');
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'connected';
    const responsePayload = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latencyMs: Date.now() - startTime,
      database: dbStatus,
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(responsePayload);
  }
}
