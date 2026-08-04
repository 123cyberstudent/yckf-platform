import { NextFunction, Request, Response } from 'express';
import { logAudit } from '../audit/service.js';
import { AuthRequest } from '../auth/middleware.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function adminRequestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', async () => {
    try {
      if (!MUTATING_METHODS.has(req.method)) {
        return;
      }
      const user = (req as AuthRequest).user;
      if (!user) {
        return;
      }
      const action = `admin_api:${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`;
      await logAudit(user.id, action, null, String(req.ip ?? ''));
    } catch {
      // Ignore logging failures to avoid blocking admin requests.
    }
  });
  next();
}
