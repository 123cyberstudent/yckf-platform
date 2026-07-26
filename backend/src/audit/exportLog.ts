import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/middleware.js';
import { logAudit } from './service.js';

const router = Router();

router.post(
  '/export-log',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { exportType, format, recordCount, filters } = req.body;
      const userId = (req as any).user?.id ?? null;
      const ipAddress = String(req.ip || req.socket.remoteAddress || 'unknown');

      const description = `export_${exportType}:${format}:${recordCount ?? 0}${filters ? ':' + filters : ''}`;

      await logAudit(userId, description, null, ipAddress);

      res.json({ success: true });
    } catch (error) {
      console.error('Export log error:', error);
      res.status(500).json({ error: 'Failed to log export' });
    }
  }
);

export default router;
