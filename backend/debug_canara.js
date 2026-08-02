const path = require('path');
const fs = require('fs');

async function run() {
  const uploadDir = path.join(__dirname, 'uploads');

  // Find the Canara ePassbook file
  const files = fs.readdirSync(uploadDir);
  const canaraFiles = files.filter(f => /canara/i.test(f));
  console.log('Canara files found:', canaraFiles);

  if (canaraFiles.length === 0) {
    console.log('No Canara files found');
    return;
  }

  for (const fileName of canaraFiles) {
    const filePath = path.join(uploadDir, fileName);
    const buffer = fs.readFileSync(filePath);
    console.log(`\n========== ${fileName} ==========`);
    console.log('Size:', buffer.length);

    const { PDFParse } = require('pdf-parse');
    try {
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      await parser.load();
      const result = await parser.getText();
      const text = result && result.text ? result.text : '';
      console.log('Raw text length:', text.length);

      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`Total non-empty lines: ${lines.length}`);
      console.log('\nAll lines:');
      lines.forEach((l, i) => console.log(`  [${i + 1}] "${l}"`));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

