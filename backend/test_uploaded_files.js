const { parseStatement, parseCSV, parsePDF } = require('./src/services/statementParser');
const fs = require('fs');
const path = require('path');

async function run() {
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    console.log('No uploads directory found');
    process.exit(1);
  }

  const files = fs.readdirSync(uploadDir);
  console.log('Files in uploads directory:', files.length);
  
  let csvResults = [];
  let pdfResults = [];
  
  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    const content = fs.readFileSync(filePath);
    const isPDF = file.endsWith('.pdf');
    const isCSV = file.endsWith('.csv');
    
    if (!isPDF && !isCSV) continue;
    
    const mimeType = isPDF ? 'application/pdf' : 'text/csv';
    const fileName = file.split('__').pop() || file;
    
    console.log(`\n=== Testing: ${fileName} (${isPDF ? 'PDF' : 'CSV'}, ${(content.length / 1024).toFixed(1)} KB) ===`);
    
    try {
      const result = await parseStatement(content, mimeType);
      console.log(`  Transactions: ${result.transactions.length}`);
      console.log(`  Skipped: ${result.skippedLines.length}`);
      console.log(`  Total rows: ${result.totalRows}`);
      
      if (result.transactions.length > 0) {
        console.log('  First 3 transactions:');
        result.transactions.slice(0, 3).forEach((t, i) => {
          const dateStr = t.date ? t.date.toISOString().split('T')[0] : 'N/A';
          console.log(`    [${i+1}] ${dateStr} | ${t.description.slice(0, 50)} | D:${t.debit} C:${t.credit} B:${t.balance}`);
        });
        
        if (result.transactions.length > 3) {
          console.log(`    ... and ${result.transactions.length - 3} more`);
        }
        
        // Verify no transaction has NaN or null for required fields
        result.transactions.forEach((t, i) => {
          if (!t.date || isNaN(t.date.getTime())) {
            console.log(`  WARNING: Transaction ${i} has invalid date: ${t.date}`);
          }
          if (!t.description || !t.description.trim()) {
            console.log(`  WARNING: Transaction ${i} has empty description`);
          }
          if (typeof t.debit !== 'number' || isNaN(t.debit)) {
            console.log(`  WARNING: Transaction ${i} has invalid debit: ${t.debit}`);
          }
          if (typeof t.credit !== 'number' || isNaN(t.credit)) {
            console.log(`  WARNING: Transaction ${i} has invalid credit: ${t.credit}`);
          }
          if (typeof t.balance !== 'number' || isNaN(t.balance)) {
            console.log(`  WARNING: Transaction ${i} has invalid balance: ${t.balance}`);
          }
        });
      }
      
      // Log skipped lines for debugging
      if (result.skippedLines.length > 0) {
        console.log('  Skipped details (first 5):');
        result.skippedLines.slice(0, 5).forEach((s, i) => {
          console.log(`    [${i+1}] ${s.reason}: "${(s.line || '').slice(0, 80)}"`);
        });
      }
      
      if (isPDF) {
        pdfResults.push({ file: fileName, transactions: result.transactions.length, skipped: result.skippedLines.length });
      } else {
        csvResults.push({ file: fileName, transactions: result.transactions.length, skipped: result.skippedLines.length });
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      if (isPDF) {
        pdfResults.push({ file: fileName, transactions: 0, skipped: 0, error: e.message });
      } else {
        csvResults.push({ file: fileName, transactions: 0, skipped: 0, error: e.message });
      }
    }
  }
  
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  
  if (csvResults.length > 0) {
    console.log('\nCSV Files:');
    csvResults.forEach(r => console.log(`  ${r.file}: ${r.transactions} transactions${r.error ? ` (ERROR: ${r.error})` : ''}`));
  }
  
  if (pdfResults.length > 0) {
    console.log('\nPDF Files:');
    pdfResults.forEach(r => console.log(`  ${r.file}: ${r.transactions} transactions${r.error ? ` (ERROR: ${r.error})` : ''}`));
  }
  
  const totalTxns = [...csvResults, ...pdfResults].reduce((sum, r) => sum + r.transactions, 0);
  console.log(`\nTotal transactions extracted across all files: ${totalTxns}`);
}

run().catch(err => { console.error(err); process.exit(1); });

