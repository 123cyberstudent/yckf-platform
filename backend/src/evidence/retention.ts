import fs from 'fs';
import path from 'path';
import { prisma } from '../shared/db.js';
import { logAudit } from '../audit/service.js';
import { getUploadPath } from '../shared/file.js';

const RETENTION_DAYS = Number(process.env.EVIDENCE_RETENTION_DAYS ?? '90');
const COLD_STORAGE_DIR = process.env.COLD_STORAGE_PATH
  ? path.resolve(process.cwd(), process.env.COLD_STORAGE_PATH)
  : path.resolve(process.cwd(), 'cold_storage');

async function ensureColdStorageDir() {
  if (!fs.existsSync(COLD_STORAGE_DIR)) {
    fs.mkdirSync(COLD_STORAGE_DIR, { recursive: true });
  }
}

export async function pruneEvidenceRetention() {
  await ensureColdStorageDir();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const oldEvidence = await prisma.evidence.findMany({ where: { uploadedAt: { lt: cutoff } } });
  for (const evidence of oldEvidence) {
    try {
      const originalPath = getUploadPath(evidence.fileUrl);
      if (fs.existsSync(originalPath)) {
        const targetPath = path.join(COLD_STORAGE_DIR, path.basename(evidence.fileUrl));
        fs.renameSync(originalPath, targetPath);
      }
      await prisma.evidence.delete({ where: { id: evidence.id } });
      await logAudit(null, 'evidence retention prune', evidence.id, 'system');
    } catch (error) {
      console.error('Failed to prune evidence', evidence.id, error);
    }
  }
  return oldEvidence.length;
}

export function scheduleEvidenceRetention() {
  const intervalMs = 24 * 60 * 60 * 1000;
  // Try the initial run with retries/backoff so a transient DB outage doesn't crash the server
  const maxAttempts = 5;
  const baseDelayMs = 2000;

  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  (async function runWithRetries() {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const count = await pruneEvidenceRetention();
        console.log(`Evidence retention initial run completed, pruned ${count} items`);
        break;
      } catch (error) {
        attempt += 1;
        console.error(`Evidence retention attempt ${attempt} failed`, error);
        if (attempt >= maxAttempts) {
          console.error('Evidence retention initial run failed after retries, continuing and will retry on schedule');
          break;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before next attempt`);
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
      }
    }
  })();

  // Schedule regular runs (these will log failures but not crash the process)
  setInterval(() => pruneEvidenceRetention().catch((error) => console.error('Evidence retention failed', error)), intervalMs);
}
