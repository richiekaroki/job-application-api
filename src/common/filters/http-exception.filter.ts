import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
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
  private readonly logger = new Logger(HttpExceptionFilter.name);

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

    // For client errors (4xx), use the structured message from our code.
    // For server errors (5xx), never expose internal details to the client.
    let message: string;
    if (statusCode >= 500) {
      const detail =
        exception instanceof Error ? exception.message : 'Unknown error';
      this.logger.error(`Unhandled exception: ${detail}`);
      Sentry.captureException(exception);
      message = 'An unexpected error occurred.';
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else {
      message = exceptionResponse?.message || 'An error occurred.';
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
