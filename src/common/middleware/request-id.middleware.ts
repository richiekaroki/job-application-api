import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const SAFE_REQUEST_ID = /^[a-zA-Z0-9\-_]{1,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers['x-request-id'] as string | undefined;
    const requestId = raw && SAFE_REQUEST_ID.test(raw) ? raw : randomUUID();
    req['requestId'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
