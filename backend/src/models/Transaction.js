const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    statementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankStatementUpload',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    debit: {
      type: Number,
      default: 0,
      min: 0
    },
    credit: {
      type: Number,
      default: 0,
      min: 0
    },
    balance: {
      type: Number,
      default: 0
    },
transactionHash: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Food', 'Shopping', 'Travel', 'Fuel', 'Salary', 'ATM', 'UPI', 'Bills', 'EMI', 'Entertainment', 'Healthcare', 'Education', 'Investment', 'Transfer', 'Others'],
      default: 'Others',
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound index for deduplication per user
transactionSchema.index(
  { ownerUserId: 1, transactionHash: 1 },
  { unique: true, name: 'unique_user_transaction_hash' }
);

// Index for efficient querying by statement
transactionSchema.index({ statementId: 1, date: -1 });

// Index for text search on description
transactionSchema.index({ description: 'text' });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction };

