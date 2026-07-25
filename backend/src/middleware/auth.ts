import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../services/db.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authorization.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as {
      sub: number;
      role: string;
      email?: string;
      type?: string;
      iat?: number;
    };
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const now = new Date();
    if (user.suspendedUntil && user.suspendedUntil > now) {
      return res.status(403).json({ error: 'Account temporarily suspended' });
    }

    if (user.passwordChangedAt && payload.iat && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
      return res.status(401).json({ error: 'Token is no longer valid, please log in again' });
    }

    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function isAuthenticated(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function isInvestigator(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'INVESTIGATOR')) {
    return res.status(403).json({ error: 'Investigator access required' });
  }
  next();
}
