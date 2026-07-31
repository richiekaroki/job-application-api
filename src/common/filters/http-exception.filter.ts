/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/nestjs';

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as any)
        : null;

    const code =
      exceptionResponse?.code ||
      STATUS_CODE_MAP[statusCode] ||
      'INTERNAL_ERROR';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message ||
          (exception instanceof Error
            ? exception.message
            : 'An unexpected error occurred.');

    if (statusCode >= 500) {
      Sentry.captureException(exception);
    }

    response.status(statusCode).json({
      data: null,
      meta: null,
      error: {
        code,
        message: Array.isArray(message) ? message[0] : message,
        statusCode,
      },
    });
  }
}
