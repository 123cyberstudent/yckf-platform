import { NextFunction, Request, Response } from 'express';
import { logAudit } from './service.js';

export async function requestAuditLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return;
      }
      const userIdHeader = (req as any).user?.id;
      if (!userIdHeader) {
        return;
      }
      await logAudit(Number(userIdHeader), 'api_request', null, String(req.ip));
    } catch {
      // Ignore logging failures to avoid blocking requests.
    }
  });
  next();
}
