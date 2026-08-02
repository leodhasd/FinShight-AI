/**
 * Generic statement parser (text lines + CSV).
 *
 * This is the safe fallback parser registered as `generic`. It handles common
 * Indian bank statement layouts (SBI, HDFC, ICICI, Axis, Canara CSV, etc.)
 * via flexible column matching and date/description/amount patterns.
 *
 * It is intentionally a catch-all: it never claims a specific bank, but it
 * can still extract transactions from many different layouts. The registry
 * uses it as the last resort so existing behavior is preserved.
 */
const { parse } = require('csv-parse/sync');
const {
  generateTransactionHash,
  normalizeDate,
  parseAmount,
  classifyAmount,
  classifyByDescription,
  isNonTransactionLine,
  extractDrCr
} = require('./common');

const patterns = [
  {
    name: '6-col-bank',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([A-Za-z]*\d{2,}[A-Za-z0-9\/\-]*|\d{4,}|[A-Z]{1,3}\d{1,5})\s+([\d,.\-]+)\s+([\d,.\-]+)\s+([\d,.\-]+)$/,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const debit = parseAmount(m[4]);
      const credit = parseAmount(m[5]);
      const balance = parseAmount(m[6]);
      return { date, description: m[2].trim(), debit: debit > 0 ? debit : 0, credit: credit > 0 ? credit : 0, balance };
    }
  },
  {
    name: '5-col-explicit',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([A-Za-z0-9].*?)\s+([\d,.\-]+)\s+([\d,.\-]+)\s+([\d,.\-]+)$/,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const debit = parseAmount(m[3]);
      const credit = parseAmount(m[4]);
      const balance = parseAmount(m[5]);
      return { date, description: m[2].trim(), debit, credit, balance };
    }
  },
  {
    name: '4-col-drcr',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\d,.\-]+)\s+(Dr|Cr|dr|cr)\s*([\d,.\-]+)$/,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const balance = parseAmount(m[5]);
      const amountStr = m[3];
      const indicator = m[4].toLowerCase();
      let debit = 0, credit = 0;
      const amt = parseAmount(amountStr);
      if (indicator === 'dr') {
        debit = Math.abs(amt);
      } else {
        credit = Math.abs(amt);
      }
      return { date, description: m[2].trim(), debit, credit, balance };
    }
  },
  {
    name: '4-col-plain',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+(-?[\d,.\-]+)\s+(-?[\d,.\-]+)$/,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const amount = parseAmount(m[3]);
      const balance = parseAmount(m[4]);
      const classified = classifyByDescription(m[2], amount);
      return { date, description: m[2].trim(), debit: classified.debit, credit: classified.credit, balance };
    }
  },
  {
    name: '3-col',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+(-?[\d,.\-]+)$/,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const amount = parseAmount(m[3]);
      const classified = classifyByDescription(m[2], amount);
      return { date, description: m[2].trim(), debit: classified.debit, credit: classified.credit, balance: 0 };
    }
  },
  {
    name: 'flex-drcr',
    regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\d,.\-]+)\s*(Dr|Cr|dr|cr)?$/i,
    map: (m) => {
      const date = normalizeDate(m[1]);
      const amountStr = m[3];
      const indicator = (m[4] || '').toLowerCase();
      let debit = 0, credit = 0;
      const amt = parseAmount(amountStr);
      if (indicator === 'dr') {
        debit = Math.abs(amt);
      } else if (indicator === 'cr') {
        credit = Math.abs(amt);
      } else if (amt < 0) {
        debit = Math.abs(amt);
      } else {
        credit = amt;
      }
      return { date, description: m[2].trim(), debit, credit, balance: 0 };
    }
  }
];

function parseLines(lines) {
  const transactions = [];
  const skippedLines = [];
  const DATE_START_PATTERN = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  const aggregatedLines = [];
  let currentBuffer = null;
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    const trimmed = line.trim();
    if (isNonTransactionLine(trimmed)) {
      skippedLines.push({ line: trimmed, reason: 'Non-transaction line (header/footer/summary)' });
      continue;
    }
    const dateMatch = trimmed.match(DATE_START_PATTERN);
    if (dateMatch) {
      if (currentBuffer) {
        aggregatedLines.push(currentBuffer.join(' '));
      }
      currentBuffer = [trimmed];
    } else if (currentBuffer) {
      currentBuffer.push(trimmed);
    } else {
      skippedLines.push({ line: trimmed, reason: 'Line before any date transaction' });
    }
  }
  if (currentBuffer) {
    aggregatedLines.push(currentBuffer.join(' '));
  }
  const filteredAggregatedLines = [];
  for (const line of aggregatedLines) {
    const descMatch = line.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s+(.+?)\s+[\d,.\-]+\s+[\d,.\-]+/);
    if (descMatch) {
      const descPart = descMatch[1].toUpperCase().trim();
      if (/^(OPENING|CLOSING)\s*BALANCE/i.test(descPart)) {
        skippedLines.push({ line, reason: 'Non-transaction line (opening/closing balance row)' });
        continue;
      }
    }
    filteredAggregatedLines.push(line);
  }
  for (const line of filteredAggregatedLines) {
    if (!line.trim()) continue;
    let parsed = false;
    for (const { regex, map, name } of patterns) {
      const match = line.match(regex);
      if (match) {
        try {
          const txn = map(match);
          if (txn && txn.date && txn.date instanceof Date && !isNaN(txn.date.getTime()) && txn.description) {
            txn.description = txn.description.trim().replace(/\s+/g, ' ').slice(0, 500);
            txn.transactionHash = generateTransactionHash(txn);
            transactions.push(txn);
            parsed = true;
          } else {
            skippedLines.push({ line, reason: `Pattern "${name}" matched but produced invalid transaction: missing date or description` });
          }
        } catch (e) {
          skippedLines.push({ line, reason: `Pattern "${name}" threw error: ${e.message}` });
        }
        break;
      }
    }
    if (!parsed) {
      skippedLines.push({ line, reason: 'No matching pattern found' });
    }
  }
  return { transactions, skippedLines };
}

function parseCSV(buffer) {
  const raw = buffer.toString('utf-8').trim();
  if (!raw) return { transactions: [], skippedLines: [] };
  let records;
  try {
    records = parse(raw, {
      columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, bom: true
    });
  } catch (e) {
    return { transactions: [], skippedLines: [{ line: raw.slice(0, 100), reason: `CSV parse error: ${e.message}` }] };
  }
  if (!records || records.length === 0) return { transactions: [], skippedLines: [] };
  const transactions = [];
  const skippedLines = [];
  const columnNames = Object.keys(records[0]).map(k => k.toLowerCase().trim());
  const assignedColumns = new Set();
  const findColumn = (patterns) => {
    for (const pattern of patterns) {
      const pLower = pattern.toLowerCase();
      let idx = columnNames.findIndex(c => c === pLower && !assignedColumns.has(c));
      if (idx !== -1) { assignedColumns.add(columnNames[idx]); return idx; }
      idx = columnNames.findIndex(c => {
        if (assignedColumns.has(c)) return false;
        const words = c.split(/[\s_\/\-]+/);
        return words.some(w => w === pLower);
      });
      if (idx !== -1) { assignedColumns.add(columnNames[idx]); return idx; }
      idx = columnNames.findIndex(c => c.startsWith(pLower) && !assignedColumns.has(c));
      if (idx !== -1) { assignedColumns.add(columnNames[idx]); return idx; }
      idx = columnNames.findIndex(c => c.endsWith(pLower) && !assignedColumns.has(c));
      if (idx !== -1) { assignedColumns.add(columnNames[idx]); return idx; }
      if (pLower.length >= 3) {
        idx = columnNames.findIndex(c => c.includes(pLower) && !assignedColumns.has(c));
        if (idx !== -1) { assignedColumns.add(columnNames[idx]); return idx; }
      }
    }
    return -1;
  };
  const dateCol = findColumn(['date', 'transaction date', 'posting date', 'trans date', 'value date', 'trans_date', 'postingdate', 'txn date']);
  const descCol = findColumn(['description', 'narrative', 'memo', 'transaction', 'details', 'payee', 'name', 'merchant', 'particulars', 'narration', 'transaction details']);
  const debitCol = findColumn(['debit', 'withdrawal', 'debit amount', 'withdrawals', 'money out', 'payment', 'dr', 'withdrawal amt']);
  const creditCol = findColumn(['credit', 'deposit', 'credit amount', 'deposits', 'money in', 'receipt', 'cr', 'deposit amt']);
  const balanceCol = findColumn(['balance', 'running balance', 'available balance', 'balance amount', 'closing balance']);
  if (dateCol === -1 || descCol === -1) {
    const result = tryFlexibleCSVParse(records, columnNames);
    return { transactions: result.transactions, skippedLines: result.skippedLines };
  }
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      const values = Object.values(record);
      const dateStr = values[dateCol];
      const descStr = values[descCol];
      if (!dateStr || !descStr || !String(descStr).trim()) {
        skippedLines.push({ line: JSON.stringify(record), reason: 'Missing date or description' });
        continue;
      }
      const descUpper = String(descStr).toUpperCase();
      if (isNonTransactionLine(descUpper)) {
        skippedLines.push({ line: JSON.stringify(record), reason: 'Non-transaction row (header/summary)' });
        continue;
      }
      const date = normalizeDate(dateStr);
      if (!date) {
        skippedLines.push({ line: JSON.stringify(record), reason: `Unparsable date: ${dateStr}` });
        continue;
      }
      let debit = 0;
      let credit = 0;
      if (debitCol !== -1) {
        debit = parseAmount(values[debitCol]);
      }
      if (creditCol !== -1) {
        credit = parseAmount(values[creditCol]);
      }
      if (debitCol === -1 && creditCol === -1) {
        const amtCol = findColumn(['amount', 'value', 'sum', 'total']);
        if (amtCol !== -1) {
          const amtStr = String(values[amtCol]);
          const drcr = extractDrCr(amtStr);
          if (drcr) {
            debit = drcr.debit;
            credit = drcr.credit;
          } else {
            const classified = classifyAmount(values[amtCol]);
            debit = classified.debit;
            credit = classified.credit;
          }
        }
      }
      const balance = balanceCol !== -1 ? parseAmount(values[balanceCol]) : 0;
      const transaction = { date, description: String(descStr).trim(), debit, credit, balance };
      transaction.transactionHash = generateTransactionHash(transaction);
      transactions.push(transaction);
    } catch (e) {
      skippedLines.push({ line: JSON.stringify(record), reason: `Parse error: ${e.message}` });
    }
  }
  return { transactions, skippedLines };
}

function tryFlexibleCSVParse(records, columnNames) {
  const transactions = [];
  const skippedLines = [];
  for (const record of records) {
    try {
      const values = Object.values(record);
      if (values.length < 2) {
        skippedLines.push({ line: JSON.stringify(record), reason: 'Too few columns' });
        continue;
      }
      let date = null;
      let description = '';
      let debit = 0;
      let credit = 0;
      let balance = 0;
      let foundDate = false;
      for (let i = 0; i < values.length; i++) {
        const val = String(values[i]).trim();
        if (!val) continue;
        const parsedDate = normalizeDate(val);
        if (parsedDate && !foundDate) {
          date = parsedDate;
          foundDate = true;
          continue;
        }
        const cleaned = val.replace(/[â‚¹$,â‚¬Â£Â¥\s]/g, '').replace(/,/g, '');
        const amount = parseFloat(cleaned);
        if (!isNaN(amount) && /^[+\-]?[\d,.\s]+$/.test(cleaned)) {
          if (amount < 0) {
            debit = Math.abs(amount);
          } else if (amount > 0) {
            if (credit !== 0) {
              balance = amount;
            } else {
              credit = amount;
            }
          }
          continue;
        }
        if (description) description += ' ';
        description += val;
      }
      if (!date || !description.trim()) {
        skippedLines.push({ line: JSON.stringify(record), reason: `Could not extract date/description. Date: ${date}, Desc: ${description}` });
        continue;
      }
      const transaction = { date, description: description.trim().replace(/\s+/g, ' ').slice(0, 500), debit, credit, balance };
      transaction.transactionHash = generateTransactionHash(transaction);
      transactions.push(transaction);
    } catch (e) {
      skippedLines.push({ line: JSON.stringify(record), reason: `Flex parse error: ${e.message}` });
    }
  }
  return { transactions, skippedLines };
}

/**
 * Registry-compatible parser definition for the generic fallback.
 * The generic parser never claims a specific bank; it is used as the
 * last-resort fallback by the registry.
 */
function detect() {
  // Always returns false: the generic parser is a fallback, not a detector.
  return false;
}

function parseForRegistry(linesOrBuffer, options) {
  if (options && options.format === 'csv') {
    return parseCSV(linesOrBuffer);
  }
  return parseLines(linesOrBuffer);
}

module.exports = {
  id: 'generic',
  bankName: 'Generic',
  bankDisplayName: 'Generic / Unknown Bank',
  formats: ['pdf', 'text', 'csv'],
  priority: 0,
  detect,
  parse: parseForRegistry,
  parseLines,
  parseCSV,
  tryFlexibleCSVParse,
  patterns
};

