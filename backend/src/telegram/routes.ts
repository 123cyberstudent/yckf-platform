import { Router, Request, Response } from 'express';

const router = Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'yckf-telegram-verify';
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://yckf-admin-dashboard-production.up.railway.app';

const AUTO_REPLIES: Record<string, string> = {
  '/start': `Welcome to YCKF Bot!\n\nI can help you with:\n/report - Report a cybercrime\n/courses - Browse courses\n/volunteer - Volunteer with us\n/events - Upcoming events\n/tips - Cybersecurity tips\n/help - Show all commands`,
  '/help': `YCKF Bot Commands:\n\n/report - Report a cybercrime\n/courses - Browse courses\n/volunteer - Volunteer with us\n/events - Upcoming events\n/tips - Cybersecurity tips\n/contact - Contact information\n/about - About YCKF`,
  '/report': `To report a cybercrime to YCKF:\n\n1. Visit our secure portal: ${PUBLIC_SITE_URL}/report-a-cybercrime\n2. Fill in the incident details\n3. You'll receive a report ID\n\nFor urgent matters, call +233505313578`,
  '/courses': `YCKF Cybersecurity Courses:\n\n- Cyber Safety Fundamentals\n- Ethical Hacking Basics\n- Digital Forensics\n- CompTIA Security+ Prep\n- CEH Preparation\n\nBrowse: ${PUBLIC_SITE_URL}/courses`,
  '/volunteer': `Want to volunteer with YCKF?\n\nWe need:\n- Cyber awareness educators\n- Community outreach volunteers\n- Technical support\n- Event coordinators\n\nApply: ${PUBLIC_SITE_URL}/volunteers\nEmail: yckfadmin@youngcyberknightsfoundation.org`,
  '/events': `Upcoming YCKF Events:\n\nCheck our events page for workshops, seminars, and CTF competitions.\n\n${PUBLIC_SITE_URL}/events`,
  '/tips': `Cybersecurity Tip:\n\n${[
    'Use strong, unique passwords for every account.',
    'Enable two-factor authentication (2FA).',
    'Never click suspicious links in emails.',
    'Keep your devices updated.',
    'Back up your data regularly.',
  ][Math.floor(Math.random() * 5)]}`,
  '/contact': `Contact YCKF:\n\nPhone: +233505313578\nEmail: yckfadmin@youngcyberknightsfoundation.org\nWhatsApp: +233505313578\nWebsite: ${PUBLIC_SITE_URL}`,
  '/about': `Young Cyber Knights Foundation (YCKF):\n\nMission: Building the next generation of cybersecurity professionals.\nVision: A digitally safe Africa.\n\nLearn more: ${PUBLIC_SITE_URL}/about`,
};

function findReply(text: string): string {
  const lower = text.toLowerCase().trim();
  if (AUTO_REPLIES[text.trim()]) return AUTO_REPLIES[text.trim()];
  if (lower.match(/\b(report|crime|cybercrime|scam|fraud|phishing)\b/)) return AUTO_REPLIES['/report'];
  if (lower.match(/\b(course|certification|learn|training)\b/)) return AUTO_REPLIES['/courses'];
  if (lower.match(/\b(volunteer|join|help|contribute)\b/)) return AUTO_REPLIES['/volunteer'];
  if (lower.match(/\b(event|workshop|seminar)\b/)) return AUTO_REPLIES['/events'];
  if (lower.match(/\b(tip|advice|safe|security)\b/)) return AUTO_REPLIES['/tips'];
  if (lower.match(/\b(contact|reach|email|phone)\b/)) return AUTO_REPLIES['/contact'];
  if (lower.match(/\b(about|mission|yckf)\b/)) return AUTO_REPLIES['/about'];
  if (lower.match(/^(hi|hello|hey)/)) return 'Hello! Welcome to YCKF Bot. Type /help to see available commands.';
  return 'I\'m YCKF Bot. Type /help to see available commands.';
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram] Reply to ${chatId}: ${text.substring(0, 50)}...`);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[Telegram] Failed to send message');
  }
}

router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === TELEGRAM_WEBHOOK_SECRET) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    const update = req.body;
    const message = update.message;
    if (!message || !message.text || !message.chat) return;
    const chatId = message.chat.id;
    const text = message.text;
    const reply = findReply(text);
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error('[Telegram] Webhook processing error');
  }
});

router.get('/conversations', async (_req: Request, res: Response) => {
  res.json({ message: 'Telegram conversations are managed via the Telegram Bot API.' });
});

export default router;
