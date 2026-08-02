/**
 * Test suite for AI-powered transaction categorization.
 *
 * Tests the categoryService.js module:
 *   - All 15 categories via description matching
 *   - "Others" fallback for unknown descriptions
 *   - Case-insensitive matching
 *   - Empty/null description handling
 *   - backfillStatementCategories (if it can be tested in isolation)
 */
const { categorizeTransaction, backfillStatementCategories, CATEGORIES } = require('./src/services/categoryService');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [FAIL] ${name}: ${e.message}`);
    failed++;
    errors.push({ name, error: e.message });
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n========== Category Service Tests ==========\n');

// 1. Food
test('Food: swiggy', () => {
  assert(categorizeTransaction('SWIGGY ORDER #12345') === 'Food');
});
test('Food: zomato', () => {
  assert(categorizeTransaction('ZOMATO FOOD DELIVERY') === 'Food');
});
test('Food: restaurant', () => {
  assert(categorizeTransaction('DOMINOS PIZZA RESTAURANT') === 'Food');
});
test('Food: grocery', () => {
  assert(categorizeTransaction('DMART GROCERY STORE') === 'Food');
});

// 2. Shopping
test('Shopping: amazon', () => {
  assert(categorizeTransaction('AMAZON PAYMENTS INDIA') === 'Shopping');
});
test('Shopping: flipkart', () => {
  assert(categorizeTransaction('FLIPKART ONLINE SHOPPING') === 'Shopping');
});
test('Shopping: myntra', () => {
  assert(categorizeTransaction('MYNTRA FASHION') === 'Shopping');
});

// 3. Travel
test('Travel: uber', () => {
  assert(categorizeTransaction('UBER TRIP BLR') === 'Travel');
});
test('Travel: flight', () => {
  assert(categorizeTransaction('INDIGO FLIGHT BOOKING') === 'Travel');
});
test('Travel: railway', () => {
  assert(categorizeTransaction('IRCTC RAILWAY TICKET') === 'Travel');
});

// 4. Fuel
test('Fuel: petrol', () => {
  assert(categorizeTransaction('INDIAN OIL PETROL PUMP') === 'Fuel');
});
test('Fuel: diesel', () => {
  assert(categorizeTransaction('HPCL DIESEL') === 'Fuel');
});

// 5. Salary
test('Salary: salary', () => {
  assert(categorizeTransaction('SALARY CREDIT JAN 2026') === 'Salary');
});
test('Salary: salary alt', () => {
  assert(categorizeTransaction('NET SALARY TRANSFER') === 'Salary');
});

// 6. ATM
test('ATM: atm withdrawal', () => {
  assert(categorizeTransaction('ATM WITHDRAWAL SBI') === 'ATM');
});
test('ATM: cash withdraw', () => {
  assert(categorizeTransaction('CASH WITHDRAWAL ICICI') === 'ATM');
});

// 7. UPI
test('UPI: upi payment', () => {
  assert(categorizeTransaction('UPI/DR/211900588070/PAYMENT') === 'UPI');
});
test('UPI: upi credit', () => {
  assert(categorizeTransaction('UPI/CR/211900588070/RECEIVED') === 'UPI');
});

// 8. Bills
test('Bills: electricity', () => {
  assert(categorizeTransaction('ELECTRICITY BILL PAYMENT') === 'Bills');
});
test('Bills: mobile recharge', () => {
  assert(categorizeTransaction('MOBILE RECHARGE JIO') === 'Bills');
});
test('Bills: broadband', () => {
  assert(categorizeTransaction('BROADBAND INTERNET BILL') === 'Bills');
});

// 9. EMI
test('EMI: emi payment', () => {
  assert(categorizeTransaction('HDFC LOAN EMI PAYMENT') === 'EMI');
});
test('EMI: emi alt', () => {
  assert(categorizeTransaction('CAR LOAN EMI') === 'EMI');
});

// 10. Entertainment
test('Entertainment: netflix', () => {
  assert(categorizeTransaction('NETFLIX SUBSCRIPTION') === 'Entertainment');
});
test('Entertainment: movie', () => {
  assert(categorizeTransaction('PVR CINEMA MOVIE TICKETS') === 'Entertainment');
});

// 11. Healthcare
test('Healthcare: hospital', () => {
  assert(categorizeTransaction('APOLLO HOSPITAL BILL') === 'Healthcare');
});
test('Healthcare: pharmacy', () => {
  assert(categorizeTransaction('MEDICINE PHARMACY STORE') === 'Healthcare');
});

// 12. Education
test('Education: tuition', () => {
  assert(categorizeTransaction('TUITION FEE PAYMENT') === 'Education');
});
test('Education: school', () => {
  assert(categorizeTransaction('SCHOOL ANNUAL FEES') === 'Education');
});

// 13. Investment
test('Investment: mutual fund', () => {
  assert(categorizeTransaction('MUTUAL FUND SIP INVESTMENT') === 'Investment');
});
test('Investment: stock', () => {
  assert(categorizeTransaction('ZERODHA STOCK TRADING') === 'Investment');
});

// 14. Transfer
test('Transfer: neft', () => {
  assert(categorizeTransaction('NEFT TRANSFER TO SAVINGS') === 'Transfer');
});
test('Transfer: imps', () => {
  assert(categorizeTransaction('IMPS FUND TRANSFER') === 'Transfer');
});
test('Transfer: rtgs', () => {
  assert(categorizeTransaction('RTGS TRANSFER CREDIT') === 'Transfer');
});

// 15. Others
test('Others: unknown description', () => {
  assert(categorizeTransaction('SOME RANDOM TEXT HERE') === 'Others');
});
test('Others: empty string', () => {
  assert(categorizeTransaction('') === 'Others');
});
test('Others: null', () => {
  assert(categorizeTransaction(null) === 'Others');
});
test('Others: undefined', () => {
  assert(categorizeTransaction(undefined) === 'Others');
});

// 16. Case insensitivity
test('Case: lowercase amazon', () => {
  assert(categorizeTransaction('amazon order') === 'Shopping');
});
test('Case: mixed case Netflix', () => {
  assert(categorizeTransaction('Netflix Membership') === 'Entertainment');
});

// 17. Confirm all 15 categories exist
test('CATEGORIES array has all 15 categories', () => {
  assert(CATEGORIES.length === 15, `Expected 15, got ${CATEGORIES.length}`);
  const expected = ['Food', 'Shopping', 'Travel', 'Fuel', 'Salary', 'ATM', 'UPI', 'Bills', 'EMI', 'Entertainment', 'Healthcare', 'Education', 'Investment', 'Transfer', 'Others'];
  for (const cat of expected) {
    assert(CATEGORIES.includes(cat), `Missing category: ${cat}`);
  }
});

// Summary
console.log(`\n========================================`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (errors.length > 0) {
  console.log('Failed tests:');
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
