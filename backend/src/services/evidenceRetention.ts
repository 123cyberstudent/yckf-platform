import fs from 'fs';
import path from 'path';
import { prisma } from './db.js';
import { logAudit } from './auditService.js';
import { getUploadPath } from './fileService.js';

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
  pruneEvidenceRetention().catch((error) => console.error('Evidence retention initial run failed', error));
  setInterval(() => pruneEvidenceRetention().catch((error) => console.error('Evidence retention failed', error)), intervalMs);
}
