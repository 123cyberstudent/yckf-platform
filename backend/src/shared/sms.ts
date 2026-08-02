export interface SmsResult {
  sent: boolean;
  provider?: string;
  error?: string;
  messageId?: string;
}

interface AfricaSTalkingRecipient {
  statusCode?: number;
  status?: string;
  messageId?: string;
  number?: string;
}

export function parseAfricaSTalkingResult(text: string): { sent: boolean; error?: string; messageId?: string } {
  try {
    const parsed = JSON.parse(text);
    const messageData = parsed?.SMSMessageData;
    const recipients: AfricaSTalkingRecipient[] = Array.isArray(messageData?.Recipients)
      ? messageData.Recipients
      : [];

    if (recipients.length === 0) {
      return { sent: false, error: messageData?.Message || 'No recipients returned by Africa\u2019s Talking' };
    }

    const first = recipients[0];
    const statusOk =
      first.statusCode === 101 ||
      (typeof first.status === 'string' && first.status.toLowerCase() === 'success');
    if (!statusOk) {
      return {
        sent: false,
        error: `Africa\u2019s Talking rejected message (status ${first.statusCode ?? first.status ?? 'unknown'})`,
        messageId: first.messageId,
      };
    }
    return { sent: true, messageId: first.messageId };
  } catch (err) {
    return { sent: false, error: `Could not parse Africa\u2019s Talking response: ${text.slice(0, 200)}` };
  }
}

export async function sendSms(options: { to: string; message: string }): Promise<SmsResult> {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

  if (!provider) {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[sms] No SMS provider configured. SMS delivery skipped for ${options.to}`);
    } else {
      console.log(`[sms] No SMS provider configured. (Would send to ${options.to}: ${options.message})`);
    }
    return { sent: false, error: 'SMS_PROVIDER not configured' };
  }

  if (provider === 'twilio') {
    return sendViaTwilio(options);
  }

  if (provider === 'africastalking') {
    return sendViaAfricaSTalking(options);
  }

  console.warn(`[sms] Unknown SMS_PROVIDER "${provider}". Supported: twilio | africastalking`);
  return { sent: false, error: `Unknown SMS_PROVIDER "${provider}"` };
}

async function sendViaTwilio(options: { to: string; message: string }): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.warn('[sms] Twilio credentials missing (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)');
    return { sent: false, error: 'Twilio credentials missing' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: options.to, From: from, Body: options.message });
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[sms] Twilio error:', text);
      return { sent: false, error: `Twilio error ${resp.status}: ${text.slice(0, 200)}` };
    }
    const data = await resp.json().catch(() => null);
    const status = data?.status as string | undefined;
    if (status && ['undelivered', 'failed', 'canceled'].includes(status.toLowerCase())) {
      return { sent: false, error: `Twilio message status: ${status}`, messageId: data?.sid };
    }
    return { sent: true, provider: 'twilio', messageId: data?.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sms] Twilio request failed:', message);
    return { sent: false, error: `Twilio request failed: ${message}` };
  }
}

async function sendViaAfricaSTalking(options: { to: string; message: string }): Promise<SmsResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const from = process.env.AFRICASTALKING_FROM;
  if (!apiKey || !username) {
    console.warn('[sms] Africa\u2019s Talking credentials missing (AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME)');
    return { sent: false, error: 'Africa\u2019s Talking credentials missing' };
  }

  try {
    const params: Record<string, string> = { username, to: options.to, message: options.message };
    if (from) params.from = from;
    const resp = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[sms] Africa\u2019s Talking error:', text);
      return { sent: false, error: `Africa\u2019s Talking error ${resp.status}: ${text.slice(0, 200)}` };
    }
    const result = parseAfricaSTalkingResult(await resp.text());
    if (!result.sent) {
      console.error('[sms] Africa\u2019s Talking rejection:', result.error);
    }
    return { sent: result.sent, provider: 'africastalking', error: result.error, messageId: result.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sms] Africa\u2019s Talking request failed:', message);
    return { sent: false, error: `Africa\u2019s Talking request failed: ${message}` };
  }
}
