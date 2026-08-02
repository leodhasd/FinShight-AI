const mongoose = require('mongoose');

const bankStatementUploadSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true
    },
    storedFileName: {
      type: String,
      required: true,
      trim: true
    },
    filePath: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true
    },
    fileSizeBytes: {
      type: Number,
      required: true
    },
    contentHashSha256: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Reject duplicate uploads per user for the same content.
bankStatementUploadSchema.index(
  { ownerUserId: 1, contentHashSha256: 1 },
  { unique: true, name: 'unique_owner_hash' }
);

const BankStatementUpload = mongoose.model('BankStatementUpload', bankStatementUploadSchema);

module.exports = { BankStatementUpload };

