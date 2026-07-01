/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T | null;
  meta: Record<string, any> | null;
  error: null;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        if (response && response.__envelope) {
          const { data, meta } = response;
          return { data, meta, error: null };
        }
        return { data: response, meta: null, error: null };
      }),
    );
  }
}

export function paginated<T>(data: T[], meta: Record<string, any>) {
  return { __envelope: true, data, meta };
}
