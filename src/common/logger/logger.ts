import pino from 'pino';
import { config } from '../../config';

class Logger {
  private pinoLogger = pino({
    level: config.logLevel,
    serializers: pino.stdSerializers,
  });

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.pinoLogger.debug(metadata, message);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.pinoLogger.info(metadata, message);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.pinoLogger.warn(metadata, message);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.pinoLogger.error(metadata, message);
  }
}

export const logger = new Logger();
