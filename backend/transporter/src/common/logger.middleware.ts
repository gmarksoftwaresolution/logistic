import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers } = req;
    const startTime = Date.now();

    this.logger.log(`Incoming request: ${method} ${originalUrl}`);
    this.logger.log(`Request headers: ${JSON.stringify(headers)}`);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      this.logger.log(`Response sent: ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });

    next();
  }
}
