import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import apiRouter from './routes';

const app: Application = express();

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

// Standardized Central Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || undefined;

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
});

export default app;
