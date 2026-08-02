/**
 * DIAGNOSE UPLOAD PIPELINE
 * Tests the complete upload→parse→insert→retrieve flow step by step
 */
const path = require('path');
const fs = require('fs');

// We're already in the backend directory
const backendDir = __dirname;
process.chdir(backendDir);

// Load modules from backend's node_modules
const mongoose = require(path.join(backendDir, 'node_modules', 'mongoose'));

const { connectToDatabase } = require('./src/services/database');
const { BankStatementUpload } = require('./src/models/BankStatementUpload');
const { Transaction } = require('./src/models/Transaction');
const { parseStatement } = require('./src/services/statementParser');
const storage = require('./src/utils/bankStatementStorage');

async function main() {
  console.log('='.repeat(90));
  console.log('PIPELINE DIAGNOSTIC - Complete Upload Flow Trace');
  console.log('='.repeat(90));

  // Connect
  await connectToDatabase();
  const db = mongoose.connection.db;
  console.log(`\n[OK] Connected to MongoDB: ${db.databaseName}`);

  // Create a test user in MongoDB for this test
  const { User } = require('./src/models/User');
  let testUser = await User.findOne({ email: 'pipeline_test@test.com' }).lean();
  if (!testUser) {
    testUser = await User.create({
      fullName: 'Pipeline Test',
      email: 'pipeline_test@test.com',
      password: '$2b$12$testpasswordhash'
    });
    console.log(`[OK] Created test user: ${testUser._id}`);
  } else {
    console.log(`[OK] Using existing test user: ${testUser._id}`);
  }

  const ownerUserId = String(testUser._id);

  // Get a sample CSV file from uploads for testing
  const uploadsDir = path.join(__dirname, 'uploads');
  const csvFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.csv') && f.includes('test_ph3'));
  const pdfFiles = fs.readdirSync(uploadsDir).filter(f => f.includes('Sample_Bank_Statement'));

  const testFiles = [
    ...csvFiles.slice(0, 1).map(f => ({ name: f, type: 'text/csv' })),
    ...pdfFiles.slice(0, 1).map(f => ({ name: f, type: 'application/pdf' }))
  ];

  for (const testFile of testFiles) {
    console.log('\n' + '-'.repeat(90));
    console.log(`\n=== TESTING FILE: ${testFile.name} (${testFile.type}) ===`);
    const filePath = path.join(uploadsDir, testFile.name);
    const buffer = fs.readFileSync(filePath);
    const contentHash = storage.getSha256HexFromBuffer(buffer);

    // STEP 1: SIMULATE UPLOAD
    console.log(`\n--- STEP 1: Upload (simulating controller) ---`);
    const storedFileName = storage.buildStoredFileName({
      ownerUserId,
      contentHashSha256: contentHash,
      mimeType: testFile.type,
      originalFileName: testFile.name
    });

    // Clean any existing data for this hash
    const existing = await BankStatementUpload.findOne({ ownerUserId, contentHashSha256: contentHash }).lean();
    if (existing) {
      console.log(`[CLEANUP] Deleting existing statement ${existing._id} and related transactions`);
      await Transaction.deleteMany({ statementId: existing._id });
      await BankStatementUpload.deleteOne({ _id: existing._id });
    }

    // Create the BankStatementUpload document
    const doc = await BankStatementUpload.create({
      ownerUserId,
      originalFileName: testFile.name,
      storedFileName,
      filePath: storage.getAbsolutePathForStoredFile(storedFileName),
      mimeType: testFile.type,
      fileSizeBytes: buffer.length,
      contentHashSha256: contentHash
    });
    const statementId = String(doc._id);
    console.log(`[STEP 1 RESULT] Statement created:`);
    console.log(`  _id: ${statementId}`);
    console.log(`  originalFileName: ${doc.originalFileName}`);
    console.log(`  storedFileName: ${doc.storedFileName}`);
    console.log(`  mimeType: ${doc.mimeType}`);

    // STEP 2: PARSE
    console.log(`\n--- STEP 2: Parse statement ---`);
    const parseResult = await parseStatement(buffer, testFile.type);
    const { transactions, skippedLines, totalRows } = parseResult;
    const validTransactions = transactions || [];
    console.log(`[STEP 2 RESULT] Parse complete:`);
    console.log(`  totalRows: ${totalRows}`);
    console.log(`  validTransactions: ${validTransactions.length}`);
    console.log(`  skippedLines: ${skippedLines ? skippedLines.length : 0}`);

    if (validTransactions.length > 0) {
      const sample = validTransactions[0];
      console.log(`  Sample txn: date=${sample.date} desc="${sample.description?.slice(0,30)}" debit=${sample.debit} credit=${sample.credit} balance=${sample.balance} hash=${sample.transactionHash?.slice(0,16)}...`);
    }

    // STEP 3: BUILD docsToInsert
    console.log(`\n--- STEP 3: Build docsToInsert ---`);
    const now = new Date();
    const docsToInsert = validTransactions.map((txn, idx) => ({
      ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
      statementId: new mongoose.Types.ObjectId(statementId),
      date: txn.date,
      description: txn.description,
      debit: txn.debit,
      credit: txn.credit,
      balance: txn.balance,
      transactionHash: txn.transactionHash,
      createdAt: now
    }));
    console.log(`[STEP 3 RESULT] docsToInsert length: ${docsToInsert.length}`);

    if (docsToInsert.length > 0) {
      // Validate required fields
      let allValid = true;
      for (let i = 0; i < docsToInsert.length; i++) {
        const d = docsToInsert[i];
        const issues = [];
        if (!d.ownerUserId) issues.push('ownerUserId missing');
        if (!d.statementId) issues.push('statementId missing');
        if (!d.date || isNaN(d.date.getTime())) issues.push(`Invalid date: ${d.date}`);
        if (!d.description?.trim()) issues.push('description empty');
        if (d.debit < 0) issues.push(`debit negative: ${d.debit}`);
        if (d.credit < 0) issues.push(`credit negative: ${d.credit}`);
        if (!d.transactionHash) issues.push('transactionHash missing');
        if (issues.length > 0) {
          console.log(`  VALIDATION ERROR [${i}]: ${issues.join(', ')}`);
          console.log(`    doc: ${JSON.stringify({ date: d.date, desc: d.description?.slice(0,20), debit: d.debit, credit: d.credit, balance: d.balance, hash: d.transactionHash?.slice(0,16) })}`);
          allValid = false;
        }
      }
      if (allValid) {
        console.log(`[STEP 3] All ${docsToInsert.length} docs validated OK`);
      }
    }

    // STEP 4: INSERT
    console.log(`\n--- STEP 4: insertMany ---`);
    let insertedCount = 0;
    let duplicateCount = 0;

    try {
      const result = await Transaction.insertMany(docsToInsert, { ordered: false });
      insertedCount = result.length;
      console.log(`[STEP 4] insertMany SUCCEEDED (no error). result type: ${typeof result}, isArray: ${Array.isArray(result)}`);
      console.log(`[STEP 4] result.length: ${result.length}`);
    } catch (bulkErr) {
      console.log(`[STEP 4] insertMany THREW ERROR:`);
      console.log(`  name: ${bulkErr.name}`);
      console.log(`  message: ${bulkErr.message}`);
      console.log(`  code: ${bulkErr.code}`);
      console.log(`  has writeErrors: ${!!bulkErr.writeErrors}`);
      console.log(`  writeErrors length: ${bulkErr.writeErrors?.length || 0}`);

      if (bulkErr.writeErrors || bulkErr.name === 'MongoBulkWriteError') {
        const writeErrors = bulkErr.writeErrors || [];
        insertedCount = docsToInsert.length - writeErrors.length;
        duplicateCount = writeErrors.length;
        console.log(`[STEP 4] Calculated: inserted=${insertedCount}, duplicates=${duplicateCount}`);

        if (writeErrors.length > 0) {
          console.log(`  First write error: code=${writeErrors[0].code}, message=${writeErrors[0].errmsg?.slice(0,200)}`);
        }
      } else {
        console.log(`[STEP 4] Unknown error type, trying individual inserts...`);
        for (const doc of docsToInsert) {
          try {
            await Transaction.create(doc);
            insertedCount++;
          } catch (e) {
            if (e.code === 11000) duplicateCount++;
            else console.log(`  Individual insert error: ${e.message}`);
          }
        }
        console.log(`[STEP 4] Individual inserts: inserted=${insertedCount}, duplicates=${duplicateCount}`);
      }
    }

    console.log(`[STEP 4 RESULT] insertedCount=${insertedCount}, duplicateCount=${duplicateCount}`);

    // STEP 5: VERIFY INSERTION
    console.log(`\n--- STEP 5: Verify MongoDB Transaction collection ---`);
    const allTxns = await Transaction.find({ statementId }).lean();
    console.log(`[STEP 5] Transaction.countDocuments({ statementId }): ${allTxns.length}`);

    if (allTxns.length > 0) {
      const s = allTxns[0];
      console.log(`  Sample txn from DB: id=${s._id} ownerUserId=${s.ownerUserId} statementId=${s.statementId}`);
      console.log(`  date=${s.date} desc="${s.description?.slice(0,30)}" debit=${s.debit} credit=${s.credit} balance=${s.balance} hash=${s.transactionHash?.slice(0,16)}`);
    }

    // STEP 6: SIMULATE GET TRANSACTIONS API
    console.log(`\n--- STEP 6: Simulate GET /api/statements/:id/transactions ---`);
    const filter = { ownerUserId, statementId };
    console.log(`  Query filter: ${JSON.stringify(filter)}`);

    const [foundTxns, totalCount] = await Promise.all([
      Transaction.find(filter).sort({ date: -1, _id: 1 }).lean(),
      Transaction.countDocuments(filter)
    ]);

    console.log(`[STEP 6] Query results:`);
    console.log(`  Transaction.find(filter).length: ${foundTxns.length}`);
    console.log(`  Transaction.countDocuments(filter): ${totalCount}`);

    // Aggregate for summary
    const [summary] = await Transaction.aggregate([
      { $match: { ownerUserId: new mongoose.Types.ObjectId(ownerUserId), statementId: new mongoose.Types.ObjectId(statementId) } },
      { $group: { _id: null, totalCredits: { $sum: '$credit' }, totalDebits: { $sum: '$debit' }, transactionCount: { $sum: 1 } } }
    ]);

    console.log(`  Aggregate summary:`);
    console.log(`    totalCredits: ${summary?.totalCredits || 0}`);
    console.log(`    totalDebits: ${summary?.totalDebits || 0}`);
    console.log(`    transactionCount: ${summary?.transactionCount || 0}`);

    console.log(`\n` + '='.repeat(90));
    console.log(`FILE: ${testFile.name} - SUMMARY`);
    console.log(`  Extracted: ${validTransactions.length}`);
    console.log(`  docsToInsert: ${docsToInsert.length}`);
    console.log(`  insertedCount: ${insertedCount}`);
    console.log(`  DB query count: ${totalCount}`);
    console.log(`  Credits: ${summary?.totalCredits || 0}`);
    console.log(`  Debits: ${summary?.totalDebits || 0}`);
    console.log('='.repeat(90));
  }

  console.log('\n\nDIAGNOSTIC COMPLETE');
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

