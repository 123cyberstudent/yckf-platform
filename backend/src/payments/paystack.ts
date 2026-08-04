import crypto from 'crypto';
import { env } from '../config/env.js';
import { PaymentError, PaymentErrorCode } from './errors.js';

export interface InitializeTransactionParams {
  email: string;
  amount: number; // minor units
  reference: string;
  callbackUrl: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amount: number;
  currency: string;
  channel?: string;
  authorizationCode?: string;
  paidAt?: string;
}

function requireSecretKey() {
  if (!env.paystack.secretKey) {
    throw new PaymentError(
      PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
      'Payment provider is not configured',
      503,
      { hint: 'Set PAYSTACK_SECRET_KEY' }
    );
  }
  return env.paystack.secretKey;
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const secretKey = requireSecretKey();
  const response = await fetch(`${env.paystack.baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  let json: { status?: boolean; message?: string; data?: unknown };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    throw new PaymentError(
      PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
      'Payment provider returned an unreadable response',
      502,
      { statusCode: response.status }
    );
  }

  if (!response.ok || json.status !== true) {
    throw new PaymentError(
      PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
      json.message ?? 'Payment provider request failed',
      502,
      { statusCode: response.status }
    );
  }
  return json.data as T;
}

export async function initializeTransaction(params: InitializeTransactionParams): Promise<InitializeTransactionResult> {
  // Paystack returns snake_case fields in `data`; map them to the camelCase
  // interface so callers never receive `undefined` for `authorizationUrl`.
  const data = await request<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: params.channels,
      metadata: params.metadata,
    },
  });
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const data = await request<
    VerifyTransactionResult & { authorization?: { authorization_code?: string }; paid_at?: string }
  >(`/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    channel: data.channel,
    authorizationCode: data.authorization?.authorization_code,
    paidAt: data.paid_at,
  };
}

/** Verify the Paystack webhook HMAC-SHA512 signature. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secretKey = env.paystack.secretKey;
  if (!secretKey || !signature) return false;
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const actual = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actual, expectedBuf);
}

export async function createRefund(reference: string, amount: number): Promise<{ id: number; reference: string; status: string }> {
  return request('/refund', {
    method: 'POST',
    body: { transaction: reference, amount },
  });
}
