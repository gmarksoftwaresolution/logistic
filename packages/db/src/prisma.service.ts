import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    const delay = 2000;

    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connection established successfully.');
        return;
      } catch (err) {
        retries--;
        this.logger.warn(
          `Database connection attempt failed (${err.message}). Retries remaining: ${retries}`,
        );
        if (retries === 0) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

