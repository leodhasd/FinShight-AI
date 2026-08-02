const testLine = '02/07/2026 ATM Withdrawal 2000.00 48000.00';

// Pattern 3: 4-col-drcr
const pattern3 = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\d,.\-]+)\s*(Dr|Cr|dr|cr)?\s*([\d,.\-]+)$/i;
const m3 = testLine.match(pattern3);
console.log('Pattern 3 (4-col-drcr) matches:', !!m3);
if(m3) {
  for(let i=1; i<m3.length; i++) {
    console.log('  Group ' + i + ': "' + (m3[i] || '') + '"');
  }
}

// Pattern 4: 4-col-plain
const pattern4 = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+(-?[\d,.\-]+)\s+(-?[\d,.\-]+)$/;
const m4 = testLine.match(pattern4);
console.log('\nPattern 4 (4-col-plain) matches:', !!m4);
if(m4) {
  for(let i=1; i<m4.length; i++) {
    console.log('  Group ' + i + ': "' + (m4[i] || '') + '"');
  }
}

// Pattern 2: 5-col-explicit
const pattern2 = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([A-Za-z0-9].*?)\s+([\d,.\-]+)\s+([\d,.\-]+)\s+([\d,.\-]+)$/;
const m2 = testLine.match(pattern2);
console.log('\nPattern 2 (5-col-explicit) matches:', !!m2);
if(m2) {
  for(let i=1; i<m2.length; i++) {
    console.log('  Group ' + i + ': "' + (m2[i] || '') + '"');
  }
}

