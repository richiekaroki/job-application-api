import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics/metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, route } = req;
    const routePath = route?.path || req.url;
    const start = Date.now();

    this.metrics.activeConnections.inc();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        const statusCode = res.statusCode;

        this.metrics.httpRequestDuration.observe(
          { method, route: routePath, status_code: String(statusCode) },
          duration,
        );
        this.metrics.httpRequestTotal.inc({
          method,
          route: routePath,
          status_code: String(statusCode),
        });

        if (statusCode >= 400) {
          this.metrics.httpRequestErrors.inc({
            method,
            route: routePath,
            status_code: String(statusCode),
          });
        }

        this.metrics.activeConnections.dec();
      }),
    );
  }
}
