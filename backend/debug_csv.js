const { parseCSV } = require('./src/services/statementParser');

const csv = 'Date,Description,Debit,Credit,Balance\n2024-01-05,Amazon Purchase,49.99,0,950.01\n2024-01-06,Salary Deposit,0,2500.00,3450.01\n2024-01-07,Netflix Subscription,15.99,0,3434.02\n2024-01-08,Grocery Store,120.50,0,3313.52\n2024-01-09,Refund from Store,0,25.00,3338.52\n2024-01-10,Electric Bill,85.00,0,3253.52\n2024-01-11,Freelance Payment,0,500.00,3753.52\n2024-01-12,Restaurant Dinner,65.00,0,3688.52';

console.log('Total lines in CSV:', csv.split('\n').length, '(including header)');

const result = parseCSV(Buffer.from(csv));
console.log('Transactions found:', result.transactions.length);
console.log('Skipped lines:', result.skippedLines.length);
result.skippedLines.forEach(s => console.log('  Skipped:', s.line.slice(0, 80), '| Reason:', s.reason));
result.transactions.forEach((t, i) => console.log(`  [${i}] ${t.date.toISOString()} | ${t.description} | D:${t.debit} C:${t.credit} B:${t.balance}`));

