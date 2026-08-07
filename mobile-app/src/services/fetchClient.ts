// ============================================
// Resilient fetch client for the mobile app.
// Adds request timeouts and retry-with-backoff so
// transient backend blips / reconnects don't cause
// instant failures. Safe to use on every API call.
// ============================================

const DEFAULT_TIMEOUT_MS = 25 * 1000;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 700;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** Fetch with a single timeout (no retries). Good for streaming/GPS etc. */
export async function requestOnce(
  url: string,
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<Response> {
  return fetchWithTimeout(url, options, timeoutMs);
}

/**
 * Fetch with retry + exponential backoff. Retries only on AbortError
 * (timeout) and network errors, or HTTP 5xx — never on 4xx client errors.
 * Ensures the app self-heals when the backend restarts or blips.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES,
  timeoutMs?: number,
): Promise<Response> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (response.status >= 500 && response.status <= 599 && retries > 0) {
        await delay(BASE_DELAY_MS * 2 ** attempt);
        retries -= 1;
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const couldRetry = isAbort || (error instanceof TypeError && /Network request failed/i.test(error.message));
      if (couldRetry && retries > 0) {
        await delay(BASE_DELAY_MS * 2 ** attempt);
        retries -= 1;
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}

export async function parseJson<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Install the resilient fetch policy globally for the remainder of the app.
 * Wraps global.fetch so every service/screen inherits request timeouts and
 * retry-with-backoff without touching each call site. Original fetch is
 * preserved on global.__yckfOriginalFetch for recovery/tests.
 */
export function installFetchWithRetry() {
  if (typeof globalThis === 'undefined' || typeof globalThis.fetch !== 'function') return;
  const original = globalThis.fetch.bind(globalThis);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__yckfOriginalFetch = original;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = (async (input: any, init?: any): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as any)?.url || String(input);
    const method = ((init?.method as string) || 'GET').toUpperCase();
    const retryable = method === 'GET' || method === 'HEAD';
    return fetchWithRetry(url, init as RequestInit, retryable ? MAX_RETRIES : 0);
  }) as typeof globalThis.fetch;
}