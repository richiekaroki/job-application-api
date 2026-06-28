/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Missing or invalid access token.',
      });
    }
    return user;
  }
}
