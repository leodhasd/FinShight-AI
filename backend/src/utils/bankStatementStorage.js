const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function getSha256HexFromBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sanitizeOriginalFileName(original) {
  // Keep it deterministic-ish and safe for logs/DB.
  const name = String(original || '').trim();
  if (!name) return 'unknown';

  // Remove path traversal and control chars.
  return name
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\r\n\t\0]/g, ' ');
}

function getExtensionFromMime(mimeType) {
  // Minimal mapping; we validate using multer/fileFilter.
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') return '.csv';
  return '';
}

function buildStoredFileName({ ownerUserId, contentHashSha256, mimeType, originalFileName }) {
  const ext = getExtensionFromMime(mimeType);
  const safeOriginal = sanitizeOriginalFileName(originalFileName);
  const shortHash = contentHashSha256.slice(0, 12);
  // Stored filename should be non-user-controlled except safeOriginal (still sanitized).
  return `${String(ownerUserId)}_${shortHash}${ext || ''}__${safeOriginal.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40)}`;
}

function getAbsolutePathForStoredFile(storedFileName) {
  return path.join(UPLOAD_DIR, storedFileName);
}

async function writeBufferToDisk({ buffer, storedFileName }) {
  ensureUploadDir();
  const absPath = getAbsolutePathForStoredFile(storedFileName);
  await fs.promises.writeFile(absPath, buffer, { flag: 'wx' });
  return absPath;
}

module.exports = {
  UPLOAD_DIR,
  getSha256HexFromBuffer,
  buildStoredFileName,
  getAbsolutePathForStoredFile,
  writeBufferToDisk
};

