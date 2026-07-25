import { Router, Request, Response } from 'express';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

router.use(generalRateLimiter);

router.post('/send', async (req: Request, res: Response) => {
  const { to, subject } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required' });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/send] Subject:', subject);
  }
  res.json({ success: true, message: 'Email queued for delivery.' });
});

router.post('/emergency-report', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/emergency-report] Received');
  }
  res.json({ success: true, message: 'Emergency report received.' });
});

router.post('/contact-message', async (req: Request, res: Response) => {
  const { name, subject } = req.body;
  if (!name || !subject) {
    return res.status(400).json({ error: 'name and subject are required' });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/contact-message] From:', name);
  }
  res.json({ success: true, message: 'Contact message received.' });
});

router.post('/cybercrime-report', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/cybercrime-report] Received');
  }
  res.json({ success: true, message: 'Cybercrime report received.' });
});

router.post('/thief-detection', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/thief-detection] Alert received');
  }
  res.json({ success: true, message: 'Thief detection alert received.' });
});

router.post('/booking-submission', async (req: Request, res: Response) => {
  const { specialist } = req.body;
  if (!specialist) {
    return res.status(400).json({ error: 'specialist is required' });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/booking-submission] Specialist:', specialist);
  }
  res.json({ success: true, message: 'Booking submission received.' });
});

export default router;
