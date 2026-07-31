import dotenv from 'dotenv';

dotenv.config();

const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'FIELD_ENCRYPTION_KEY',
] as const;

if (process.env.NODE_ENV === 'production') {
  const missing = requiredProductionVariables.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
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
      .filter(Boolean) ?? ['http://localhost:3000'],
};
