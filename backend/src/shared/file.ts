import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/zip', 'text/plain',
  'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/3gpp', 'audio/x-m4a',
  'video/mp4', 'video/quicktime',
]);
const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'zip', 'txt', 'm4a', 'mp4', 'aac', 'mp3', 'wav', '3gp', 'mov']);

function isTextBuffer(buffer: Buffer) {
  for (const byte of buffer) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte >= 32 && byte <= 126) continue;
    return false;
  }
  return true;
}

export async function validateFileType(file: Express.Multer.File) {
  const fileType = await fileTypeFromBuffer(file.buffer);
  if (fileType) {
    const mime = fileType.mime;
    const extension = fileType.ext;
    if (!allowedMimeTypes.has(mime) || !allowedExtensions.has(extension)) {
      throw new Error('Unsupported file type');
    }
    return { extension, mimeType: mime };
  }

  const originalExt = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (originalExt === 'txt' && isTextBuffer(file.buffer)) {
    return { extension: 'txt', mimeType: 'text/plain' };
  }

  throw new Error('Unsupported or invalid file type');
}

export function generateFilename(extension: string) {
  return `${uuidv4()}.${extension}`;
}

export async function saveFile(filename: string, buffer: Buffer) {
  const filePath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export function computeHash(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getUploadPath(filename: string) {
  return path.join(uploadDir, path.basename(filename));
}

export function getUploadDir() {
  return uploadDir;
}
