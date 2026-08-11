import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: Logger;

  constructor() {
    const nodeEnv = process.env.NODE_ENV || 'development';

    this.logger = createLogger({
      level: nodeEnv === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.errors({ stack: true }),
        nodeEnv === 'production'
          ? format.json()
          : format.combine(format.colorize(), format.simple()),
      ),
      defaultMeta: { service: 'job-applications-api' },
      transports: [
        new transports.Console(),
        ...(nodeEnv === 'production'
          ? [
              new transports.File({
                filename: 'logs/error.log',
                level: 'error',
              }),
              new transports.File({ filename: 'logs/combined.log' }),
            ]
          : []),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId?: string,
  ) {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      requestId,
    });
  }

  logAuth(event: string, data: Record<string, unknown>) {
    this.logger.info(`Auth: ${event}`, { ...data, category: 'auth' });
  }

  logSecurity(event: string, data: Record<string, unknown>) {
    this.logger.warn(`Security: ${event}`, { ...data, category: 'security' });
  }
}
