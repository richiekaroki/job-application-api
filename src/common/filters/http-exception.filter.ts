/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const code =
      exceptionResponse?.code ||
      STATUS_CODE_MAP[statusCode] ||
      'INTERNAL_ERROR';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message || 'An unexpected error occurred.';

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
