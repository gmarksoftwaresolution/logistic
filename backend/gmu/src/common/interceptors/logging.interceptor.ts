import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    if (url?.includes('favicon.ico')) {
      return next.handle();
    }

    const now = Date.now();

    return next
      .handle()
      .pipe(
        tap({
          next: () => this.logger.log(`${method} ${url} ${Date.now() - now}ms`),
          error: (err) => {
            const status = err instanceof HttpException ? err.getStatus() : 500;
            if (status >= 500) {
              this.logger.error(`${method} ${url} ${Date.now() - now}ms - Server Error: ${err.message}`);
            } else {
              this.logger.warn(`${method} ${url} ${Date.now() - now}ms - ${status} ${err.message}`);
            }
          },
        }),
      );
  }
}
