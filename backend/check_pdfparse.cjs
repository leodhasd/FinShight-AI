const p = require('pdf-parse');
console.log('Type of pdf-parse:', typeof p);
console.log('Is function:', typeof p === 'function');
console.log('Keys:', Object.keys(p || {}));

// Check the package.json
const pkg = require('pdf-parse/package.json');
console.log('\npdf-parse version:', pkg.version, '| name:', pkg.name);

// Try calling it as function
if (typeof p === 'function') {
  console.log('pdf-parse is a direct function (legacy API) - calling with buffer test');
  Buffer.prototype
} 

