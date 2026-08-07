/**
 * Keep-alive heartbeat.
 *
 * Some hosting platforms (e.g. Railway/Sparkle free tiers) scale an instance
 * to zero or spin it down after inactivity. Sending periodic requests ensures
 * the container stays warm when the platform relies on inbound traffic to
 * decide liveness. This does NOT wake a fully asleep instance, so pairing it
 * with an external uptime monitor (UptimeRobot/cron-job.org hitting /api/health)
 * is recommended for true 24/7 availability.
 */

const KEEPALIVE_INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS ?? 60_000) || 60_000;
const KEEPALIVE_URL = process.env.KEEPALIVE_URL || process.env.PUBLIC_API_URL || '';

let running = false;

export function startKeepAlive() {
  if (running) return;
  // Immediate first ping, then interval.
  ping();
  const timer = setInterval(ping, KEEPALIVE_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref(); // don't hold the process open solely for this
  running = true;
}

function ping(): void {
  if (!KEEPALIVE_URL) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const url = `${KEEPALIVE_URL.replace(/\/+$/, '')}/api/health`;
  fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) console.warn(`[keepalive] non-200 from ${url}: ${res.status}`);
    })
    .catch((error) => {
      const name = error instanceof Error ? error.name : '';
      if (name !== 'AbortError') console.warn(`[keepalive] ping failed for ${url}:`, error.message || error);
    })
    .finally(() => clearTimeout(timeout));
}

if (KEEPALIVE_URL) {
  startKeepAlive();
}