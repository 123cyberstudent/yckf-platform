import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req: Request) => {
    const ip = req.ip ?? 'unknown';
    const idValue = String((req.body as any)?.identifier || (req.body as any)?.email || '').toLowerCase();
    return `${ip}:${idValue}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => {
    const ip = req.ip ?? 'unknown';
    const challengeId = String((req.body as any)?.challengeId || '');
    return `${ip}:${challengeId}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts, please try again later.' },
});

export const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    const ip = req.ip ?? 'unknown';
    const challengeId = String((req.body as any)?.challengeId || '');
    return `${ip}:${challengeId}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many resend requests, please try again later.' },
});

export const reportSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => String(((req as any).user?.id) ?? req.ip ?? 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many report submissions, please try again later.' },
});

export const evidenceUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => String(((req as any).user?.id) ?? req.ip ?? 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many evidence uploads, please try again later.' },
});

export const emailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many email requests, please try again later.' },
});

export const staffCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many staff code attempts, please try again later.' },
});
