import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/shared/db.js', () => ({
  prisma: {
    emailLog: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { sendEmail } from '../src/email/service.js';

describe('sendEmail with Resend REST API', () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    prev.RESEND_API_KEY = process.env.RESEND_API_KEY;
    prev.SMTP_HOST = process.env.SMTP_HOST;
    process.env.RESEND_API_KEY = 're_test_123';
    delete process.env.SMTP_HOST;
  });

  afterEach(() => {
    for (const key of Object.keys(prev)) {
      if (prev[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev[key];
      }
    }
    vi.unstubAllGlobals();
  });

  it('sends via the Resend API and returns the message id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend_msg_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail({
      ticketNumber: 'YCKF-1234',
      reportType: 'otp',
      recipientEmail: 'test@example.com',
      subject: 'Your code',
      html: '<p>code</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('resend_msg_123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_123');
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['test@example.com']);
    expect(body.subject).toBe('Your code');
  });

  it('reports failure when the API rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'sender domain not verified',
      })
    );

    const result = await sendEmail({
      ticketNumber: 'YCKF-1234',
      reportType: 'otp',
      recipientEmail: 'test@example.com',
      subject: 'Your code',
      html: '<p>code</p>',
    });

    expect(result.success).toBe(false);
  });
});
