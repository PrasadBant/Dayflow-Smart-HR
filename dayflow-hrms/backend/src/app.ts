import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import apiRouter from './routes';
import { requestId } from './middleware/requestId';

const app: Application = express();

// Correlation id — first, so every later log line for this request can
// include it (see the error handler at the bottom of this file).
app.use(requestId);

// Security Headers
app.use(helmet());

// CORS restriction
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Brute-force / credential-stuffing protection on the auth surface.
 * Applied ahead of the API router so it covers /api/auth/* only, not every
 * endpoint (a global limit would let one noisy authenticated client starve
 * others). Keyed by IP (default) — good enough for a single-instance deploy;
 * a multi-instance deploy behind a load balancer would need a shared store
 * (e.g. Redis) instead of the in-memory default, called out in the report.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});
app.use('/api/auth', authRateLimiter);

// GET /health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount API Router under /api
app.use('/api', apiRouter);

/**
 * Statuses worth a server-side log line even when the response itself is a
 * well-formed, expected error: they're the ones an operator would want to
 * search for after the fact (a spike in 401s from one IP, a security-relevant
 * 403, a 429 meaning the rate limiter is actually engaging). Ordinary 4xx
 * validation errors (400/404/409) are just normal request outcomes and would
 * only add noise. Never logs the request body — only what the AppError
 * itself carries (code/message/field-level validation details), never raw
 * credentials, tokens, or secrets.
 */
const SECURITY_RELEVANT_STATUSES = new Set([401, 403, 429]);

// Standardized Central Error Handling Middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || undefined;

  const logLine = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    status: statusCode,
    code,
    message,
  };
  if (statusCode >= 500) {
    // Full stack for genuine server faults — this is the "what failed, why"
    // an operator needs, and stack traces never contain user secrets.
    console.error('[Error]', JSON.stringify(logLine), err.stack || err);
  } else if (SECURITY_RELEVANT_STATUSES.has(statusCode)) {
    console.warn('[Security]', JSON.stringify(logLine));
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
});

export default app;
