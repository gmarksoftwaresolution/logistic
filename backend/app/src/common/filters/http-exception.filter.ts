import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';
    
    let messageResponse: any;
    if (exception instanceof HttpException) {
      messageResponse = exception.getResponse();
    } else {
      const err = exception as Error;
      this.logger.error(`Unhandled Exception: ${err.message}`, err.stack);
      messageResponse = isProduction 
        ? 'Internal server error' 
        : err.message || 'Internal server error';
    }

    this.logger.error(
      `HTTP Status: ${status} | Path: ${request.url} | Details: ${JSON.stringify(messageResponse)}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof messageResponse === 'object' ? messageResponse : { message: messageResponse },
    });
  }
}
