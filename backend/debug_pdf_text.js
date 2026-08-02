const path = require('path');
const fs = require('fs');

async function run() {
  const uploadDir = path.join(__dirname, 'uploads');
  
  // Test the bank statement PDFs
  const pdfNames = [
    '6a5fb8b2890dab8408fd059f_53a4fd4b2133.pdf__Sample_Bank_Statement.pdf',
    '6a5fb8b2890dab8408fd059f_b2fd6114027d.pdf__Sample_Bank_Statement_Problem.pdf',
    '6a5fb8b2890dab8408fd059f_ffcac74d10bf.pdf__Sample_SBI_Style_Bank_Statement.pdf'
  ];
  
  const { PDFParse } = require('pdf-parse');
  
  for (const pdfName of pdfNames) {
    const filePath = path.join(uploadDir, pdfName);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${pdfName}`);
      continue;
    }
    
    const buffer = fs.readFileSync(filePath);
    console.log(`\n========== ${pdfName} ==========`);
    
    try {
      const parser = new PDFParse({
        data: buffer,
        verbosity: 0
      });
      await parser.load();
      const result = await parser.getText();
      const text = result && result.text ? result.text : '';
      
      console.log('Raw text length:', text.length);
      console.log('\n--- RAW TEXT (first 2000 chars) ---');
      console.log(text.substring(0, 2000));
      console.log('--- END RAW TEXT ---\n');
      
      // Show lines for debugging
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`Total non-empty lines: ${lines.length}`);
      console.log('\nAll lines:');
      lines.forEach((l, i) => console.log(`  [${i+1}] "${l}"`));
      
      // Now run through parser
      const { parseLines } = require('../src/services/statementParser');
      const parseResult = parseLines(lines);
      console.log(`\nParser result: ${parseResult.transactions.length} transactions, ${parseResult.skippedLines.length} skipped`);
      
      console.log('\nSkipped lines:');
      parseResult.skippedLines.forEach((sl, i) => console.log(`  [${i+1}] ${sl.reason}: "${(sl.line || '').slice(0, 120)}"`));
      
      console.log('\nTransactions:');
      parseResult.transactions.forEach((t, i) => {
        console.log(`  [${i+1}] Date:${t.date.toISOString().split('T')[0]} | Desc:${t.description.slice(0, 40)} | D:${t.debit} C:${t.credit} B:${t.balance}`);
      });
      
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

