import dotenv from 'dotenv';

dotenv.config();

const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'FIELD_ENCRYPTION_KEY',
  'PAYSTACK_SECRET_KEY',
] as const;

if (process.env.NODE_ENV === 'production') {
  const missing = requiredProductionVariables.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

if (process.env.NODE_ENV !== 'production' && paystackSecretKey && !paystackSecretKey.startsWith('sk_')) {
  console.warn('PAYSTACK_SECRET_KEY looks invalid: expected a Paystack secret key starting with "sk_".');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY,
  allowedOrigins:
    process.env.ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:3000', 'https://yckf-admin-dashboard-production.up.railway.app'],
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    baseUrl: process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL ?? 'https://yckf.app/paystack/return',
  },
};
