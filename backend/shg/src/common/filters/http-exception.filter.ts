import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    if (status >= 500) {
      console.error(`[Server Error ${status}] ${request?.method} ${request?.url}:`, exception);
    } else if (status === 401) {
      console.warn(`[Auth 401] ${request?.method} ${request?.url} - Unauthorized request`);
    } else {
      console.warn(`[Client Error ${status}] ${request?.method} ${request?.url} - ${message}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: Array.isArray(message) ? message[0] : message,
      error: exception instanceof HttpException ? (exception.getResponse() as any).error : 'Internal Server Error',
    });
  }
}

