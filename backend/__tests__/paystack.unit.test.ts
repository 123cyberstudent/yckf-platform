import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    paystack: {
      secretKey: 'sk_test_unit',
      baseUrl: 'https://api.paystack.co',
      callbackUrl: 'https://yckf.app/paystack/return',
    },
  },
}));

import { initializeTransaction, verifyTransaction } from '../src/payments/paystack.js';

describe('paystack client field mapping', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(data: unknown) {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: true, message: 'Success', data }),
    });
  }

  it('maps Paystack snake_case data into camelCase InitializeTransactionResult', async () => {
    jsonResponse({
      authorization_url: 'https://checkout.paystack.com/abc',
      access_code: 'xyz',
      reference: 'YCKFSUB-TEST',
    });

    const result = await initializeTransaction({
      email: 'a@b.com',
      amount: 5000,
      reference: 'YCKFSUB-TEST',
      callbackUrl: 'https://yckf.app/paystack/return',
    });

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/abc');
    expect(result.accessCode).toBe('xyz');
    expect(result.reference).toBe('YCKFSUB-TEST');
    expect(result.authorizationUrl).not.toBeUndefined();
  });

  it('maps paid_at and authorization.authorization_code in verifyTransaction', async () => {
    jsonResponse({
      status: 'success',
      amount: 5000,
      currency: 'GHS',
      channel: 'card',
      paid_at: '2026-08-01T10:00:00.000Z',
      authorization: { authorization_code: 'AUTH_CODE_1' },
    });

    const result = await verifyTransaction('YCKFSUB-TEST');

    expect(result.status).toBe('success');
    expect(result.paidAt).toBe('2026-08-01T10:00:00.000Z');
    expect(result.authorizationCode).toBe('AUTH_CODE_1');
    expect(result.paidAt).not.toBeUndefined();
  });
});
