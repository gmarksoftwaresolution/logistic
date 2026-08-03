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
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Silence favicon.ico requests cleanly with 204 No Content
    if (request.url?.includes('favicon.ico')) {
      return response.status(HttpStatus.NO_CONTENT).end();
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errorType = 'Internal Server Error';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = exceptionResponse.message || (exception as any).message;
      errorType = exceptionResponse.error || (status === 404 ? 'Not Found' : 'Bad Request');
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const finalMessage = Array.isArray(message) ? message[0] : message;

    // Only log full error stack trace for internal server 5xx errors
    if (status >= 500) {
      this.logger.error(`[500 Server Error] ${request.method} ${request.url}`, exception);
    } else {
      this.logger.warn(`[${status} Client Exception] ${request.method} ${request.url} - ${finalMessage}`);
    }

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
      message: finalMessage,
      error: errorType,
    });
  }
}

