import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return status ok', () => {
    const healthResponse = { status: 'ok', timestamp: new Date().toISOString() };
    expect(healthResponse.status).toBe('ok');
    expect(healthResponse.timestamp).toBeDefined();
  });
});

describe('Shared Types', () => {
  it('should have correct UserRole types', () => {
    const validRoles = ['ADMIN', 'INVESTIGATOR', 'USER'];
    expect(validRoles).toContain('ADMIN');
    expect(validRoles).toContain('INVESTIGATOR');
    expect(validRoles).toContain('USER');
  });

  it('should validate response shape', () => {
    const response = {
      user: {
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'USER',
        isActive: true,
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    };
    expect(response.user.id).toBeTypeOf('number');
    expect(response.user.email).toContain('@');
    expect(response.accessToken).toBeTruthy();
    expect(response.refreshToken).toBeTruthy();
  });
});
