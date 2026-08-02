const mongoose = require('mongoose');
const { BankStatementUpload } = require('../models/BankStatementUpload');
const { Transaction } = require('../models/Transaction');
const { parseStatement } = require('../services/statementParser');
const { getAbsolutePathForStoredFile } = require('../utils/bankStatementStorage');
const { categorizeTransaction, backfillStatementCategories } = require('../services/categoryService');
const fs = require('fs');

/**
 * Build a MongoDB filter from common query params.
 *
 * Shared by the transactions list view and the export endpoint so that
 * exported data always respects the same filters the user sees on screen.
 *
 * Supported params: startDate, endDate, month, year, category, type,
 * minCredit, maxCredit, minDebit, maxDebit, search.
 */
function buildTransactionFilter(query = {}, ownerUserId, statementId) {
  const filter = { ownerUserId, statementId };

  // Date range filter
  if (query.startDate) {
    filter.date = { ...filter.date, $gte: new Date(query.startDate) };
  }
  if (query.endDate) {
    filter.date = { ...filter.date, $lte: new Date(query.endDate) };
  }

  // Credit range filter
  if (query.minCredit !== undefined && query.minCredit !== '') {
    filter.credit = { ...filter.credit, $gte: parseFloat(query.minCredit) };
  }
  if (query.maxCredit !== undefined && query.maxCredit !== '') {
    filter.credit = { ...filter.credit, $lte: parseFloat(query.maxCredit) };
  }

  // Debit range filter
  if (query.minDebit !== undefined && query.minDebit !== '') {
    filter.debit = { ...filter.debit, $gte: parseFloat(query.minDebit) };
  }
  if (query.maxDebit !== undefined && query.maxDebit !== '') {
    filter.debit = { ...filter.debit, $lte: parseFloat(query.maxDebit) };
  }

  // Text search on description (also covers embedded reference numbers)
  if (query.search && query.search.trim()) {
    filter.description = { $regex: query.search.trim(), $options: 'i' };
  }

  // Year filter (YYYY)
  if (query.year) {
    const yearNum = parseInt(query.year, 10);
    if (Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
      filter.date = {
        ...filter.date,
        $gte: new Date(yearNum, 0, 1),
        $lt: new Date(yearNum + 1, 0, 1)
      };
    }
  }

  // Month filter (1-12). If a year is also provided, narrow to that month in that year;
  // otherwise match the month across all years.
  if (query.month) {
    const monthNum = parseInt(query.month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const yearNum = parseInt(query.year, 10);
      if (Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
        filter.date = {
          ...filter.date,
          $gte: new Date(yearNum, monthNum - 1, 1),
          $lt: new Date(yearNum, monthNum, 1)
        };
      } else {
        filter.$expr = { $eq: [{ $month: '$date' }, monthNum] };
      }
    }
  }

  // Category filter (exact match on category field)
  if (query.category && query.category.trim()) {
    filter.category = query.category.trim();
  }

  // Transaction type filter (credit / debit)
  if (query.type && query.type.trim()) {
    const type = query.type.trim().toLowerCase();
    if (type === 'credit') {
      filter.credit = { ...filter.credit, $gt: 0 };
    } else if (type === 'debit') {
      filter.debit = { ...filter.debit, $gt: 0 };
    }
  }

  return filter;
}

/**
 * Serialize transactions into CSV (Date,Description,Debit,Credit,Balance,Category).
 * Dates are formatted DD-MM-YYYY. Descriptions are quoted and inner quotes escaped.
 */
function buildCsvExport(transactions) {
  const header = 'Date,Description,Debit,Credit,Balance,Category\n';
  const rows = (transactions || []).map((t) => {
    let dateStr = '';
    if (t.date) {
      const d = new Date(t.date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      dateStr = `${day}-${month}-${year}`;
    }
    const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
    const category = t.category || 'Others';
    return `${dateStr},${desc},${t.debit || 0},${t.credit || 0},${t.balance || 0},${category}`;
  }).join('\n');

  return header + rows;
}

/**
 * POST /api/statements/:id/process
 * Parse a previously uploaded statement file and extract transactions.
 */
async function processStatement(req, res) {
  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const statementId = req.params.id;

    // Verify the statement belongs to this user and exists
    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({ status: 'error', message: 'Statement not found' });
    }

    console.log('[StatementParser] ========================================');
    console.log('[StatementParser] Upload started: ' + statement.originalFileName);
    console.log('[StatementParser] File path: ' + statement.filePath);
    console.log('[StatementParser] MIME type: ' + statement.mimeType);
    console.log('[StatementParser] File size: ' + statement.fileSizeBytes + ' bytes');
    console.log('[StatementParser] Statement ID: ' + statementId);
    console.log('[StatementParser] ========================================');

    // Check if transactions were already processed
    const existingCount = await Transaction.countDocuments({ statementId });
    if (existingCount > 0) {
      console.log(`[StatementParser] Statement already processed: ${statement.originalFileName}, ${existingCount} existing transactions`);
      return res.status(200).json({
        status: 'success',
        message: 'Statement already processed',
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
      return res.status(404).json({ status: 'error', message: 'Statement file not found on disk' });
    }

    const buffer = fs.readFileSync(filePath);
    console.log(`[StatementParser] File read from disk: ${buffer.length} bytes`);

    // Parse the file
    let parseResult;
    try {
      parseResult = await parseStatement(buffer, statement.mimeType);
    } catch (parseErr) {
      console.error(`[StatementParser] Parse FAILED for ${statement.originalFileName}: ${parseErr.message}`);
      return res.status(422).json({
        status: 'error',
        message: `Failed to parse statement: ${parseErr.message}`
      });
    }

    const { transactions, skippedLines, totalRows } = parseResult;
    const validTransactions = transactions || [];
    const skippedCount = skippedLines ? skippedLines.length : 0;

    // Return a clear unsupported-bank message instead of a generic failure.
    if (parseResult.unsupportedBank) {
      console.log(`[StatementParser] UNSUPPORTED BANK: ${statement.originalFileName}`);
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

    console.log(`[StatementParser] File: ${statement.originalFileName}`);
    console.log(`[StatementParser]   Total rows detected: ${totalRows}`);
    console.log(`[StatementParser]   Valid transactions extracted: ${validTransactions.length}`);
    if (validTransactions.length > 0) {
      console.log(`[StatementParser]   First 3 transactions:`);
      for (let i = 0; i < Math.min(validTransactions.length, 3); i++) {
        const t = validTransactions[i];
        console.log(`[StatementParser]     [${i + 1}] Date:${t.date ? t.date.toISOString().split('T')[0] : 'N/A'} | ${t.description.slice(0, 40)} | D:${t.debit} C:${t.credit} B:${t.balance}`);
      }
      if (validTransactions.length > 3) {
        console.log(`[StatementParser]     ... and ${validTransactions.length - 3} more transactions`);
      }
    }
    console.log(`[StatementParser]   Rows skipped: ${skippedCount}`);

    // Log skipped lines details for debugging (max 10 entries)
    if (skippedLines && skippedLines.length > 0) {
      const detailCount = Math.min(skippedLines.length, 10);
      for (let i = 0; i < detailCount; i++) {
        const sl = skippedLines[i];
        console.log(`[StatementParser]   Skipped [${i + 1}]: ${sl.reason} - Content: "${sl.line ? sl.line.slice(0, 120) : '(empty)'}"`);
      }
      if (skippedLines.length > 10) {
        console.log(`[StatementParser]   ... and ${skippedLines.length - 10} more skipped rows`);
      }
    }

    if (validTransactions.length === 0) {
      console.log(`[StatementParser] FAILED: No valid transactions extracted from ${statement.originalFileName}`);
      return res.status(422).json({
        status: 'error',
        message: 'No valid transactions could be extracted from this statement. The file format may be unsupported or the data is in an unrecognized layout.',
        data: {
          statementId,
          totalRowsDetected: totalRows,
          transactionsFound: 0,
          transactionsSaved: 0,
          duplicatesSkipped: 0,
          parsingDetails: {
            totalRows,
            validTransactions: 0,
            skippedRows: skippedCount
          }
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

    // Bulk insert with ordered: false to skip duplicates and continue
    let insertedCount = 0;
    let duplicateCount = 0;

    try {
      const result = await Transaction.insertMany(docsToInsert, {
        ordered: false
      });
      insertedCount = result.length;
      duplicateCount = docsToInsert.length - insertedCount;
      console.log(`[StatementParser] insertMany SUCCESS: ${insertedCount} inserted, ${duplicateCount} duplicates skipped`);
    } catch (bulkErr) {
      console.error(`[StatementParser] insertMany ERROR:`, bulkErr.name, bulkErr.message);
      if (bulkErr.writeErrors) {
        console.error(`[StatementParser] Write errors count:`, bulkErr.writeErrors.length);
        for (let i = 0; i < Math.min(bulkErr.writeErrors.length, 5); i++) {
          const we = bulkErr.writeErrors[i];
          console.error(`[StatementParser]   WriteError [${i}]: code=${we.code}, message=${we.errmsg || we.message}`);
        }
      }
      if (bulkErr.getWriteErrors) {
        const wes = bulkErr.getWriteErrors();
        console.error(`[StatementParser] getWriteErrors count:`, wes.length);
        for (let i = 0; i < Math.min(wes.length, 5); i++) {
          console.error(`[StatementParser]   WriteError [${i}]:`, wes[i].message);
        }
      }
      // In case of bulk error (e.g., duplicates), count what was inserted
      if (bulkErr.writeErrors || bulkErr.name === 'MongoBulkWriteError') {
        const writeErrors = bulkErr.writeErrors || (bulkErr.getWriteErrors ? bulkErr.getWriteErrors() : []);
        insertedCount = docsToInsert.length - writeErrors.length;
        duplicateCount = writeErrors.length;
        console.log(`[StatementParser] After bulk error - inserted: ${insertedCount}, duplicates: ${duplicateCount}`);
      } else {
        console.error(`[StatementParser] Non-bulk insertMany error. Trying individual inserts...`);
        // Try inserting one by one if bulk fails for other reasons
        for (const doc of docsToInsert) {
          try {
            await Transaction.create(doc);
            insertedCount++;
          } catch (e) {
            console.error(`[StatementParser] Individual insert error: code=${e.code}, message=${e.message}`);
            if (e.code === 11000) {
              duplicateCount++;
            } else {
              // Log validation errors explicitly
              if (e.name === 'ValidationError') {
                console.error(`[StatementParser] VALIDATION ERROR:`, JSON.stringify(e.errors));
              }
            }
          }
        }
        console.log(`[StatementParser] After individual inserts - inserted: ${insertedCount}, duplicates: ${duplicateCount}`);
      }
    }

    console.log('[StatementParser] ========================================');
    console.log('[StatementParser] FINAL SUMMARY');
    console.log('[StatementParser]   File: ' + statement.originalFileName);
    console.log('[StatementParser]   Total rows: ' + totalRows);
    console.log('[StatementParser]   Valid: ' + validTransactions.length);
    console.log('[StatementParser]   Invalid: ' + skippedCount);
    console.log('[StatementParser]   Inserted: ' + insertedCount);
    console.log('[StatementParser]   Duplicates: ' + duplicateCount);
    console.log('[StatementParser] RESULT: Statement processed successfully');
    console.log('[StatementParser] INSERT SUMMARY:');
    console.log(`[StatementParser]   Total valid transactions: ${validTransactions.length}`);
    console.log(`[StatementParser]   Successfully inserted: ${insertedCount}`);
    console.log(`[StatementParser]   Duplicates skipped: ${duplicateCount}`);
    console.log('[StatementParser] ========================================\n');

    return res.status(201).json({
      status: 'success',
      message: 'Statement processed successfully',
      data: {
        statementId,
        transactionsFound: validTransactions.length,
        transactionsSaved: insertedCount,
        duplicatesSkipped: duplicateCount
      }
    });

  } catch (err) {
    console.error(`[StatementParser] ERROR: ${err?.message}`);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to process statement'
    });
  }
}

/**
 * GET /api/statements/:id/transactions
 * Retrieve transactions for a statement with optional filters.
 *
 * Query params:
 *   startDate  - ISO date string (inclusive)
 *   endDate    - ISO date string (inclusive)
 *   minCredit  - number
 *   maxCredit  - number
 *   minDebit   - number
 *   maxDebit   - number
 *   search     - text search on description
 *   sortBy     - field to sort by (default: date)
 *   sortOrder  - asc or desc (default: desc)
 *   page       - page number (default: 1)
 *   limit      - items per page (default: 50, max: 200)
 */
async function getTransactions(req, res) {
  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const statementId = req.params.id;

    // Verify the statement belongs to this user
    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({ status: 'error', message: 'Statement not found' });
    }

    // Build query filter (shared helper so export + list use identical filters)
    const filter = buildTransactionFilter(req.query, ownerUserId, statementId);

    console.log("========== GET TRANSACTIONS ==========");
    console.log("Statement ID:", statementId);
    console.log("Owner User ID:", ownerUserId);
    console.log("Filter:", filter);

    const dbCount = await Transaction.countDocuments(filter);
    console.log("Matching Transactions:", dbCount);
    console.log("======================================");

    // Determine if statement has been processed
    const isProcessed = dbCount > 0;

    // Backfill categories for any uncategorized transactions (existing data)
    if (isProcessed) {
      try {
        await backfillStatementCategories(ownerUserId, statementId);
      } catch (backfillErr) {
        console.error(`[StatementController] Backfill error: ${backfillErr.message}`);
      }
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    // Sorting
    const allowedSortFields = ['date', 'description', 'debit', 'credit', 'balance'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .sort({ [sortBy]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    // Get summary stats for this statement
    // Use ObjectId conversion for aggregation pipeline (doesn't auto-cast like find())
    const [summary] = await Transaction.aggregate([
      { $match: { ownerUserId: new mongoose.Types.ObjectId(ownerUserId), statementId: new mongoose.Types.ObjectId(statementId) } },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$credit' },
          totalDebits: { $sum: '$debit' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    // Get distinct years present in this statement (for the Year filter dropdown)
    let years = [];
    try {
      const yearDocs = await Transaction.aggregate([
        { $match: { ownerUserId: new mongoose.Types.ObjectId(ownerUserId), statementId: new mongoose.Types.ObjectId(statementId) } },
        { $group: { _id: { $year: '$date' } } },
        { $sort: { _id: -1 } }
      ]);
      years = yearDocs.map((d) => d._id).filter((y) => Number.isFinite(y));
    } catch (yearErr) {
      console.error(`[StatementController] Distinct years error: ${yearErr.message}`);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Transactions loaded',
      data: {
        isProcessed,
        processed: isProcessed,
        statement: {
          id: statement._id,
          originalFileName: statement.originalFileName,
          mimeType: statement.mimeType,
          uploadedAt: statement.createdAt
        },
        transactions: transactions.map((t) => ({
          id: t._id,
          date: t.date,
          description: t.description,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance,
          category: t.category || 'Others'
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        filterOptions: {
          years
        },
        summary: summary || {
          totalCredits: 0,
          totalDebits: 0,
          transactionCount: 0
        }
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to get transactions'
    });
  }
}

/**
 * GET /api/statements/:id/transactions/export
 * Export transactions for download.
 *
 * Respects the same query filters as the transactions list view so exported
 * data always matches what the user sees on screen.
 *
 * Query params:
 *   format - 'csv' (default) or 'json'
 *   Plus all filters supported by buildTransactionFilter (startDate, endDate,
 *   month, year, category, type, minCredit, maxCredit, minDebit, maxDebit, search).
 */
async function exportTransactions(req, res) {
  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const statementId = req.params.id;

    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({ status: 'error', message: 'Statement not found' });
    }

    // Backfill categories for any uncategorized transactions
    try {
      await backfillStatementCategories(ownerUserId, statementId);
    } catch (backfillErr) {
      console.error(`[StatementController] Export backfill error: ${backfillErr.message}`);
    }

    // Build the same filter used by the list view
    const filter = buildTransactionFilter(req.query, ownerUserId, statementId);

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .lean();

    // Map raw docs to clean export objects
    const exportRows = transactions.map((t) => ({
      date: t.date,
      description: t.description,
      debit: t.debit || 0,
      credit: t.credit || 0,
      balance: t.balance || 0,
      category: t.category || 'Others'
    }));

    const format = (req.query.format || 'csv').toLowerCase();
    const baseName = (statement.originalFileName || 'statement').replace(/\.(pdf|csv)$/i, '');

    if (format === 'json') {
      const json = JSON.stringify({ statementId, exportedAt: new Date().toISOString(), count: exportRows.length, transactions: exportRows }, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}_transactions.json"`);
      return res.status(200).send(json);
    }

    // Default: CSV
    const csv = buildCsvExport(exportRows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}_transactions.csv"`);
    return res.status(200).send(csv);

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to export transactions'
    });
  }
}

module.exports = {
  statementController: {
    processStatement,
    getTransactions,
    exportTransactions
  },
  // Pure helpers exported for unit testing
  buildTransactionFilter,
  buildCsvExport
};

