import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function initCache() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return;
  }

  redisClient = createClient({ url });
  redisClient.on('error', (error) => {
    console.error('Redis error:', error);
  });
  await redisClient.connect();
}

export async function getCache(key: string) {
  if (!redisClient) return null;
  const value = await redisClient.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300) {
  if (!redisClient) return;
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function disconnectCache() {
  if (!redisClient) return;
  await redisClient.disconnect();
}
