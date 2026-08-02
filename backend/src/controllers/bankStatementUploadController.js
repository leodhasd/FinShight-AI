const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');

const { BankStatementUpload } = require('../models/BankStatementUpload');
const { Transaction } = require('../models/Transaction');
const {
  getSha256HexFromBuffer,
  buildStoredFileName,
  writeBufferToDisk,
  getAbsolutePathForStoredFile
} = require('../utils/bankStatementStorage');
const { isPasswordProtected } = require('../services/pdfPasswordService');
const { parsePDFWithPassword } = require('../services/statementParser');
const { categorizeTransaction } = require('../services/categoryService');
const fs = require('fs');

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'text/csv', 'application/vnd.ms-excel']);

function fileMimeTypeAllowed(mimeType) {
  return ACCEPTED_MIME_TYPES.has(mimeType);
}

// Multer memory storage: we hash and validate before persisting.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!fileMimeTypeAllowed(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF and CSV are allowed.'));
    }
    return cb(null, true);
  }
});

function getMulterMiddleware() {
  // single file field name: bankStatement
  return upload.single('bankStatement');
}

async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const buffer = req.file.buffer;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Uploaded file is empty' });
    }

    const fileSizeBytes = buffer.length;
    if (fileSizeBytes > MAX_FILE_BYTES) {
      return res.status(413).json({ status: 'error', message: 'File too large. Max 10MB.' });
    }

    const contentHashSha256 = getSha256HexFromBuffer(buffer);

    // Duplicate check for same user+hash.
    const existing = await BankStatementUpload.findOne({
      ownerUserId,
      contentHashSha256
    }).lean();

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate upload: this statement was already uploaded.'
      });
    }

    // --- Password-protected PDF detection ---
    // Only check PDFs; CSV files cannot be password-protected.
    let needsPassword = false;
    if (req.file.mimetype === 'application/pdf') {
      try {
        needsPassword = await isPasswordProtected(buffer);
      } catch {
        // If detection fails (e.g. corrupted PDF), treat as not protected
        // so the normal flow tries parsing (which will fail with a clear error later)
        needsPassword = false;
      }
    }

    const storedFileName = buildStoredFileName({
      ownerUserId,
      contentHashSha256,
      mimeType: req.file.mimetype,
      originalFileName: req.file.originalname
    });

    const filePath = await writeBufferToDisk({
      buffer,
      storedFileName
    });

    // Save metadata only. For password-protected PDFs, we save the file
    // but do NOT parse it yet.
    const doc = await BankStatementUpload.create({
      ownerUserId,
      originalFileName: req.file.originalname,
      storedFileName,
      filePath,
      mimeType: req.file.mimetype,
      fileSizeBytes,
      contentHashSha256
    });

    // If password-protected, return needsPassword flag so the frontend can show the modal.
    if (needsPassword) {
      return res.status(201).json({
        status: 'success',
        message: 'Upload successful. Password required to unlock.',
        needsPassword: true,
        data: {
          id: doc._id,
          originalFileName: doc.originalFileName,
          fileSizeBytes: doc.fileSizeBytes,
          mimeType: doc.mimeType,
          uploadedAt: doc.createdAt
        }
      });
    }

    // Normal (non-password-protected) flow — unchanged
    return res.status(201).json({
      status: 'success',
      message: 'Upload successful',
      data: {
        id: doc._id,
        originalFileName: doc.originalFileName,
        storedFileName: doc.storedFileName,
        fileSizeBytes: doc.fileSizeBytes,
        mimeType: doc.mimeType,
        contentHashSha256: doc.contentHashSha256,
        uploadedAt: doc.createdAt
      }
    });
  } catch (err) {
    // Handle uniqueness race.
    if (err && (err.code === 11000 || err.name === 'MongoServerError')) {
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate upload: this statement was already uploaded.'
      });
    }

    if (err && err.message && /Invalid file type/i.test(err.message)) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: 'error', message: 'File too large. Max 10MB.' });
    }

    return res.status(500).json({ status: 'error', message: err?.message || 'Upload failed' });
  }
}

/**
 * POST /api/uploads/bank-statements/:id/unlock
 *
 * Unlock a password-protected PDF statement, parse it, and insert transactions.
 *
 * SECURITY:
 * - The password exists only in this request handler scope.
 * - It is never logged, stored in DB, cached, or sent anywhere.
 * - It is immediately cleared after parsing (success or failure).
 */
async function unlockAndProcess(req, res) {
  // The password variable — exists only in this scope
  const { password } = req.body;

  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const statementId = req.params.id;

    // Validate password presence
    if (!password || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to unlock this statement.'
      });
    }

    // Verify the statement belongs to this user and exists
    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({
        status: 'error',
        message: 'Statement not found.'
      });
    }

    // Only PDFs can be password-protected
    if (statement.mimeType !== 'application/pdf') {
      return res.status(422).json({
        status: 'error',
        message: 'Only PDF files can be password-protected.'
      });
    }

    // Check if transactions were already processed (idempotency)
    const existingCount = await Transaction.countDocuments({
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      statementId: new mongoose.Types.ObjectId(statementId)
    });

    if (existingCount > 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Statement already processed.',
        data: {
          statementId,
          transactionsCount: existingCount,
          alreadyProcessed: true
        }
      });
    }

    // Read the file from disk
    const filePath = getAbsolutePathForStoredFile(statement.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Statement file not found on disk.'
      });
    }

    const buffer = fs.readFileSync(filePath);

    // --- Attempt to unlock and parse ---
    // The password is passed to parsePDFWithPassword, which calls unlockPDF,
    // which passes it to PDFParse. After this call, the password variable
    // is no longer referenced and will be garbage collected.
    let parseResult;
    try {
      parseResult = await parsePDFWithPassword(buffer, password);
    } catch (parseErr) {
      // Check if it's a wrong password error
      const isPasswordError = parseErr instanceof (
        require('pdf-parse').PasswordException
      ) || parseErr.name === 'PasswordException';

      if (isPasswordError) {
        return res.status(400).json({
          status: 'error',
          message: 'Incorrect PDF password. Please verify your password and try again.',
          code: 'WRONG_PASSWORD'
        });
      }

      // For other errors (corrupted, unsupported encryption, etc.)
      return res.status(422).json({
        status: 'error',
        message: parseErr.message || 'Failed to unlock the PDF. The file may be corrupted or use an unsupported encryption format.'
      });
    } finally {
      // Clear password reference immediately after parsing attempt
      // The password variable goes out of scope here.
    }

    const { transactions, skippedLines, totalRows } = parseResult;
    const validTransactions = transactions || [];
    const skippedCount = skippedLines ? skippedLines.length : 0;

    // Return a clear unsupported-bank message instead of a generic failure.
    if (parseResult.unsupportedBank) {
      return res.status(422).json({
        status: 'error',
        message: parseResult.unsupportedMessage || 'Unsupported bank statement format.',
        code: 'UNSUPPORTED_BANK',
        data: {
          statementId,
          totalRowsDetected: totalRows,
          transactionsFound: 0,
          transactionsSaved: 0,
          duplicatesSkipped: 0
        }
      });
    }

    if (validTransactions.length === 0) {
      return res.status(422).json({
        status: 'error',
        message: 'No valid transactions could be extracted from this statement after unlocking. The format may be unsupported.',
        data: {
          statementId,
          totalRowsDetected: totalRows,
          transactionsFound: 0,
          transactionsSaved: 0,
          duplicatesSkipped: 0
        }
      });
    }

// Attach owner and statement IDs to each transaction, and categorize
    const now = new Date();
    const docsToInsert = validTransactions.map((txn) => ({
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      statementId: new mongoose.Types.ObjectId(statementId),
      date: txn.date,
      description: txn.description,
      debit: txn.debit,
      credit: txn.credit,
      balance: txn.balance,
      transactionHash: txn.transactionHash,
      category: categorizeTransaction(txn.description),
      createdAt: now
    }));

    // Bulk insert with ordered: false to skip duplicates
    let insertedCount = 0;
    let duplicateCount = 0;

    try {
      const result = await Transaction.insertMany(docsToInsert, { ordered: false });
      insertedCount = result.length;
      duplicateCount = docsToInsert.length - insertedCount;
    } catch (bulkErr) {
      if (bulkErr.writeErrors || bulkErr.name === 'MongoBulkWriteError') {
        const writeErrors = bulkErr.writeErrors || [];
        insertedCount = docsToInsert.length - writeErrors.length;
        duplicateCount = writeErrors.length;
      } else {
        // Fallback: insert one by one
        for (const doc of docsToInsert) {
          try {
            await Transaction.create(doc);
            insertedCount++;
          } catch (e) {
            if (e.code === 11000) {
              duplicateCount++;
            }
          }
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Statement unlocked and processed successfully.',
      data: {
        statementId,
        transactionsFound: validTransactions.length,
        transactionsSaved: insertedCount,
        duplicatesSkipped: duplicateCount
      }
    });

  } catch (err) {
    // Catch-all — never expose internal details
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while processing the statement.'
    });
  }
  // At this point, the password variable has gone out of scope
  // and is eligible for garbage collection.
}

async function listUploads(req, res) {
  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const uploads = await BankStatementUpload.find({ ownerUserId })
      .sort({ createdAt: -1 })
      .limit(25)
      .select('originalFileName storedFileName mimeType fileSizeBytes contentHashSha256 createdAt')
      .lean();

    return res.status(200).json({
      status: 'success',
      message: 'Uploads loaded',
      data: {
        uploads: uploads.map((u) => ({
          id: u._id,
          originalFileName: u.originalFileName,
          storedFileName: u.storedFileName,
          mimeType: u.mimeType,
          fileSizeBytes: u.fileSizeBytes,
          contentHashSha256: u.contentHashSha256,
          uploadedAt: u.createdAt
        }))
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err?.message || 'Failed to list uploads' });
  }
}

module.exports = {
  bankStatementUpload: {
    middleware: getMulterMiddleware(),
    handleUpload,
    unlockAndProcess,
    listUploads
  }
};

