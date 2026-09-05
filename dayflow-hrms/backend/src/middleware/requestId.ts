import crypto from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      /** Per-request correlation id — included in every log line this request
       *  produces, so a specific failure reported by a user can be found in
       *  server logs without guessing by timestamp. Not returned to the
       *  client — this is an operator diagnostic, not an API contract field. */
      id: string;
    }
  }
}

export const requestId: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  req.id = crypto.randomUUID();
  next();
};
