type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogContext = Record<string, any>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  requestId?: string;
  component?: string;
}

const SENSITIVE_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
  'apiKey',
  'api_key',
  'secret',
];

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    if (SENSITIVE_KEYS.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function getRequestId(): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as any).__REQUEST_ID__;
  }
  return undefined;
}

function formatLog(entry: LogEntry): void {
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'PRODUCTION';

  if (isProduction) {
    // Production: JSON format for log aggregation
    console.log(JSON.stringify(sanitize(entry)));
  } else {
    // Development: Human-readable with colors
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';

    const prefix = `${color}[${entry.level}]${reset} ${entry.component || 'App'}`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    console.log(`${prefix} ${timestamp} - ${entry.message}`);

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(`  Context:`, sanitize(entry.context));
    }

    if (entry.requestId) {
      console.log(`  Request ID: ${entry.requestId}`);
    }
  }
}

function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  component?: string
): void {
  if (level === 'DEBUG' && process.env.NEXT_PUBLIC_ENVIRONMENT === 'PRODUCTION') {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    component,
    requestId: getRequestId(),
  };

  formatLog(entry);
}

export function createLogger(component: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      log('DEBUG', message, context, component),
    info: (message: string, context?: LogContext) =>
      log('INFO', message, context, component),
    warn: (message: string, context?: LogContext) =>
      log('WARN', message, context, component),
    error: (message: string, context?: LogContext) =>
      log('ERROR', message, context, component),
  };
}

const logger = {
  debug: (message: string, context?: LogContext) => log('DEBUG', message, context),
  info: (message: string, context?: LogContext) => log('INFO', message, context),
  warn: (message: string, context?: LogContext) => log('WARN', message, context),
  error: (message: string, context?: LogContext) => log('ERROR', message, context),
  forComponent: createLogger,
};

export default logger;
