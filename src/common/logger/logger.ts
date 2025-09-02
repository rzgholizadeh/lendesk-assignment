export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private formatLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  private logToConsole(entry: LogEntry): void {
    const logMessage = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
    const fullMessage = entry.metadata
      ? `${logMessage} ${JSON.stringify(entry.metadata)}`
      : logMessage;

    console.log(fullMessage);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLogEntry(LogLevel.DEBUG, message, metadata);
    this.logToConsole(entry);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLogEntry(LogLevel.INFO, message, metadata);
    this.logToConsole(entry);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLogEntry(LogLevel.WARN, message, metadata);
    this.logToConsole(entry);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLogEntry(LogLevel.ERROR, message, metadata);
    this.logToConsole(entry);
  }
}

export const logger = new Logger();
