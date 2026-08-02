// Check the exact pdf-parse API
const pdfParse = require('pdf-parse');
console.log('=== pdf-parse CJS export ===');
console.log('typeof:', typeof pdfParse);
console.log('constructor:', pdfParse?.constructor?.name);
console.log('keys:', Object.keys(pdfParse || {}));
console.log('PDFParse exists:', typeof pdfParse?.PDFParse);
console.log('PDFParse constructor:', pdfParse?.PDFParse?.constructor?.name);

// Check what PDFParse looks like
const PDFParse = pdfParse.PDFParse;
console.log('\n=== PDFParse class ===');
console.log('typeof PDFParse:', typeof PDFParse);
if (typeof PDFParse === 'function') {
  const instance = new PDFParse({ data: Buffer.from('%PDF-1.4'), verbosity: 0 });
  console.log('instance keys:', Object.keys(instance));
  console.log('load type:', typeof instance.load);
  console.log('getText type:', typeof instance.getText);
}

