import { Request, Response, NextFunction } from 'express';
import winston, { transports } from 'winston';

// Custom format for file logs that preserves stack trace line breaks
const fileFormat = winston.format.printf(({ timestamp, level, message, stack, service, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}] [${service}]: ${message}`;

  // Add stack trace with actual line breaks if present
  if (stack) {
    log += `\n${stack}`;
  }

  // Add metadata if present
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
  }

  return log;
});

// Create winston logger instance
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'mcp-server' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, stack }) => {
          return stack ? `${level}: ${message}\n${stack}` : `${level}: ${message}`;
        })
      )
    }),
    // File output - all logs
    new winston.transports.File({
      filename: 'logs/mcp-server.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File output - error logs only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Simple logger function for backward compatibility
const logger = (req: Request, title: string) => {
  winstonLogger.info(`${title} - ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    query: req.method === 'GET' ? req.query : undefined,
    body: req.method !== 'GET' ? req.body : undefined,
    headers: {
      'user-agent': req.headers['user-agent'],
      'mcp-session-id': req.headers['mcp-session-id'],
      'authorization': req.headers['authorization'] ? '[REDACTED]' : undefined
    }
  });
}

// Request/Response logging middleware
export const requestResponseLogger = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  // Attach requestId for downstream middlewares/handlers
  (req as any).requestId = requestId;

  // Log request
  winstonLogger.info(`------------------------------ Incoming ${req.method} Request: ${req.url} ------------------------------`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: req.headers['mcp-session-id'],
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Save original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalStatus = res.status;

  let statusCode = 200;
  let responseData: any = null;
  let responseSize = 0;

  // Intercept status code setting
  res.status = function (code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Intercept JSON response
  res.json = function (body: any) {
    responseData = body;
    responseSize = JSON.stringify(body).length;
    logResponse();
    return originalJson.call(this, body);
  };

  // Intercept regular response
  res.send = function (body: any) {
    responseData = body;
    responseSize = typeof body === 'string' ? body.length : JSON.stringify(body).length;
    logResponse();
    return originalSend.call(this, body);
  };

  function logResponse() {
    const duration = Date.now() - startTime;
    const level = statusCode >= 400 ? 'error' : 'info';

    winstonLogger.log(level, `########### Response Sent: ###########\n`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      responseSize: `${responseSize} bytes`,
      sessionId: req.headers['mcp-session-id'],
      response: responseData
    });
  }

  next();
};

// Helper: extract first useful code location from an Error stack
function extractCodeLocation(stack?: string): { file?: string; line?: number; column?: number } {
  if (!stack) return {};
  const lines = stack.split('\n').slice(1);
  for (const line of lines) {
    // Typical V8 stack line: "    at FunctionName (path/to/file.ts:123:45)"
    const match = line.match(/\(([^)]+):(\d+):(\d+)\)$/) || line.match(/at ([^ ]+):(\d+):(\d+)$/);
    if (match) {
      const [, file, lineNum, colNum] = match;
      // Prefer app code paths
      if (!/node_modules/.test(file)) {
        return { file, line: Number(lineNum), column: Number(colNum) };
      }
    }
  }
  return {};
}

// Error-logging middleware for Express
export function errorLogger(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId;
  const { file, line, column } = extractCodeLocation(err?.stack);
  const meta: Record<string, unknown> = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    sessionId: req.headers['mcp-session-id'],
    location: file ? { file, line, column } : undefined
  };

  // Use winston error with full stack
  winstonLogger.error(err?.message || 'Unhandled error', {
    ...meta,
    stack: err?.stack,
  });

  // If headers not sent, send a generic error response while preserving existing behavior
  if (!res.headersSent) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }
}

// Export winston instance for use elsewhere
export { winstonLogger };
export default logger;
