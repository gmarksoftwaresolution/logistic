import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('db-config')
  getDbConfig() {
    return {
      databaseUrl: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    };
  }
}
