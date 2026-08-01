import { describe, it, expect } from 'vitest';
import { parseAfricaSTalkingResult } from '../src/shared/sms.js';

describe('parseAfricaSTalkingResult', () => {
  it('accepts a processed recipient', () => {
    const result = parseAfricaSTalkingResult(
      JSON.stringify({
        SMSMessageData: {
          Message: 'Sent to 1/1 Total Cost: 0.05',
          Recipients: [
            {
              statusCode: 101,
              number: '+233244123456',
              status: 'Success',
              cost: 'GHS 0.05',
              messageId: 'ATXid_abc123',
              smsCount: 1,
            },
          ],
        },
      })
    );
    expect(result.sent).toBe(true);
    expect(result.messageId).toBe('ATXid_abc123');
    expect(result.error).toBeUndefined();
  });

  it('rejects a non-processed recipient', () => {
    const result = parseAfricaSTalkingResult(
      JSON.stringify({
        SMSMessageData: {
          Message: 'Sent to 0/1',
          Recipients: [
            {
              statusCode: 403,
              number: '+233244123456',
              status: 'Rejected',
              messageId: 'ATXid_abc124',
              smsCount: 1,
            },
          ],
        },
      })
    );
    expect(result.sent).toBe(false);
    expect(result.error).toContain('403');
  });

  it('reports an error when no recipients are returned', () => {
    const result = parseAfricaSTalkingResult(
      JSON.stringify({ SMSMessageData: { Message: 'No recipients' } })
    );
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/no recipients/i);
  });

  it('reports a parse error for non-JSON responses', () => {
    const result = parseAfricaSTalkingResult('<html>Gateway Down</html>');
    expect(result.sent).toBe(false);
    expect(result.error).toContain('Could not parse');
  });
});
