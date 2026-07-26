import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

const WHATSAPP_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'yckf-whatsapp-verify';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

const TIPS = [
  'Use strong, unique passwords for every account. Enable two-factor authentication wherever possible.',
  'Never click on suspicious links in emails or messages. Always verify the sender.',
  'Keep your devices and software updated with the latest security patches.',
  'Avoid using public Wi-Fi for banking or sensitive transactions. Use a VPN.',
  'Back up your important data regularly following the 3-2-1 rule.',
  'Review app permissions on your phone regularly and revoke unnecessary access.',
  'Be cautious of urgency tactics in messages — attackers use fear to manipulate.',
  'Use a password manager to generate and store unique passwords.',
];

function getRandomTip(): string {
  return `Cybersecurity Tip:\n\n${TIPS[Math.floor(Math.random() * TIPS.length)]}`;
}

const AUTO_REPLIES: Record<string, string> = {
  'report': `To report a cybercrime, please visit our secure reporting portal:\nhttp://localhost:3000/report-a-cybercrime\n\nYou can also call our hotline or visit any YCKF office.`,
  'crime': `To report a cybercrime, please visit our secure reporting portal:\nhttp://localhost:3000/report-a-cybercrime\n\nAll reports are confidential and handled by trained volunteers.`,
  'volunteer': `Interested in volunteering with YCKF? We'd love to have you!\n\nFill out our volunteer application:\nhttp://localhost:3000/volunteers\n\nOr email us at: yckfadmin@youngcyberknightsfoundation.org`,
  'course': `We offer free and paid cybersecurity courses for all levels:\n\nBrowse our courses:\nhttp://localhost:3000/courses\n\nCertifications available: CEH, CompTIA Security+, and more.`,
  'event': `Check out our upcoming cybersecurity events:\nhttp://localhost:3000/events\n\nJoin our community for workshops, seminars, and conferences.`,
  'news': `Stay updated with the latest cybersecurity news:\nhttp://localhost:3000/news`,
  'help': `How can we help you? Reply with:\n\n1 - Report a cybercrime\n2 - Volunteer with us\n3 - Browse courses\n4 - View events\n5 - General inquiry`,
  'status': `To check the status of your report, please provide your report ID or visit:\nhttp://localhost:3000/report-a-cybercrime\n\nOur team will get back to you.`,
  'contact': `Reach us at:\n\nEmail: yckfadmin@youngcyberknightsfoundation.org\nWhatsApp: +233505313578\nWebsite: http://localhost:3000\n\nOr visit our office during business hours.`,
  'location': `YCKF offices are located in Accra, Ghana.\n\nVisit our website for directions:\nhttp://localhost:3000/about`,
};

function findReply(message: string): string {
  const lower = message.toLowerCase().trim();
  for (const [keyword, reply] of Object.entries(AUTO_REPLIES)) {
    if (lower.includes(keyword)) return reply;
  }
  if (lower.match(/^(hi|hello|hey|help|menu)/)) {
    return AUTO_REPLIES.help;
  }
  if (lower.match(/\b(tip|advice|safe|security)\b/)) {
    return getRandomTip();
  }
  return `Thank you for messaging YCKF! How can we help you?\n\nReply "help" to see available options.`;
}

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp] Auto-reply to ${to}: ${text.substring(0, 50)}...`);
    return;
  }

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );
  } catch (err) {
    console.error('[WhatsApp] Failed to send message');
  }
}

router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) return;

    const msg = messages[0];
    const from = msg.from;
    const text = msg.text?.body || '';

    if (!from || !text) return;

    const reply = findReply(text);

    await prisma.whatsAppConversation.upsert({
      where: { phoneNumber: from },
      update: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
      create: {
        phoneNumber: from,
        lastMessageAt: new Date(),
        messageCount: 1,
      },
    });

    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error('[WhatsApp] Webhook processing error');
  }
});

router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const conversations = await prisma.whatsAppConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
    });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
