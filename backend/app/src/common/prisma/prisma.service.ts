import { Injectable, OnModuleInit, OnModuleDestroy, Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await this.$connect();
        break;
      } catch (err: any) {
        if (attempt === 4) throw err;
        console.warn(`[PrismaService] Database connection attempt ${attempt} failed (${err.message}). Retrying in 1.5s...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
