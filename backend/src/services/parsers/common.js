/**
 * Shared helpers for bank statement parsers.
 *
 * These functions are bank-agnostic and reused by every parser module
 * (Canara, generic, and any future bank parsers). Keeping them here
 * guarantees identical date normalization, amount parsing, and debit/credit
 * classification behavior across all banks.
 */
const crypto = require('crypto');

function generateTransactionHash({ date, description, debit, credit, balance }) {
  const canonical = [
    String(date),
    String(description || '').trim().toLowerCase(),
    String(debit || '0'),
    String(credit || '0'),
    String(balance || '0')
  ].join('|');
  return crypto.createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const str = String(value).trim();
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{1,2})[-\s]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]?(\d{4})$/i,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]?(\d{1,2})[-\s]?(\d{4})$/i
  ];
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const pStr = pattern.source;
      if (/Mon|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(pStr)) {
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        let day, month, year;
        if (pStr.startsWith('\\d')) {
          day = parseInt(match[1], 10);
          month = months.indexOf(match[2].toLowerCase().slice(0, 3));
          year = parseInt(match[3], 10);
        } else {
          day = parseInt(match[2], 10);
          month = months.indexOf(match[1].toLowerCase().slice(0, 3));
          year = parseInt(match[3], 10);
        }
        if (month !== -1) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
        continue;
      }
      if (pattern === patterns[0] || pattern === patterns[1] || pattern === patterns[2]) {
        const d1 = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        if (!isNaN(d1.getTime())) return d1;
      } else if (pattern === patterns[3] || pattern === patterns[4]) {
        const fullYear = 2000 + parseInt(match[3], 10);
        const d = new Date(`${fullYear}-${match[2]}-${match[1]}`);
        if (!isNaN(d.getTime())) return d;
      } else if (pattern === patterns[5] || pattern === patterns[6]) {
        const d = new Date(`${match[1]}-${match[2]}-${match[3]}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

function removeIndianCommas(str) {
  if (!str) return str;
  return str.replace(/,/g, '');
}

function parseAmount(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  let str = String(value).trim();
  let isDebit = false;
  let isCredit = false;
  if (/\b[Dd][Rr]\b/.test(str)) {
    isDebit = true;
    str = str.replace(/\b[Dd][Rr]\b/g, '');
  }
  if (/\b[Cc][Rr]\b/.test(str)) {
    isCredit = true;
    str = str.replace(/\b[Cc][Rr]\b/g, '');
  }
  str = str.replace(/[₹$,€£¥\s]/g, '');
  str = str.replace(/\(([^)]+)\)/, '-$1');
  str = removeIndianCommas(str);
  if (!str || str === '-' || str === '\u2013') return 0;
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    const parts = str.split('.');
    str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (isDebit) return Math.abs(num);
  if (isCredit) return Math.abs(num);
  return Math.round(num * 100) / 100;
}

function classifyAmount(amount) {
  const num = parseAmount(amount);
  if (num >= 0) {
    return { debit: 0, credit: num };
  }
  return { debit: Math.abs(num), credit: 0 };
}

/**
 * Classify amount based on description + amount context.
 * Uses description keywords to determine if a positive amount is debit or credit.
 */
function classifyByDescription(description, amount) {
  const desc = String(description || '').toUpperCase();
  const num = parseFloat(parseAmount(amount));
  if (num < 0) {
    return { debit: Math.abs(num), credit: 0 };
  }
  const DEBIT_KEYWORDS = /\b(WITHDRAWAL|WITHDRAWN|DEBIT|DEBITED|PAID|PAYMENT|PURCHASE|SPENT|RECHARGE|BILL|FEE|CHARGES|ATM|SHOPPING|GROCERY|TRANSFER\s+OUT|DEBIT\s+CARD|FUEL|SWIPE|POS|EMI|TAX)\b/i;
  const CREDIT_KEYWORDS = /\b(CREDIT|CREDITED|DEPOSIT|DEPOSITED|SALARY|INTEREST|REFUND|CASHBACK|REWARDS|TRANSFER\s+IN|NEFT\s+RECEIVED|RECEIVED|PAYMENT\s+RECEIVED|CREDIT\s+CARD\s+PAYMENT)\b/i;
  const isDebit = DEBIT_KEYWORDS.test(desc);
  const isCredit = CREDIT_KEYWORDS.test(desc);
  if (isDebit && !isCredit) {
    return { debit: num, credit: 0 };
  }
  if (isCredit && !isDebit) {
    return { debit: 0, credit: num };
  }
  return { debit: 0, credit: num };
}

function isNonTransactionLine(line) {
  if (!line || !line.trim()) return true;
  const upper = line.toUpperCase().trim();
  if (/^(PAGE|CONTINUED|CONTD?\.?)\s*\d/i.test(upper)) return true;
  if (/^\d+\s*(OF|CONTINUED)\s*\d+/i.test(line)) return true;
  if (/^[-*=+_]{3,}$/.test(line.trim())) return true;
  if (/^(STATE\s+BANK\s+OF\s+INDIA|HDFC\s+BANK|ICICI\s+BANK|AXIS\s+BANK|CANARA\s+BANK|INDIAN\s+BANK|PUNJAB\s+NATIONAL\s+BANK|BANK\s+OF\s+BARODA|YES\s+BANK|KOTAK\s+MAHINDRA\s+BANK)$/i.test(upper)) return true;
  if (/^(SBI|HDFC|ICICI|AXIS|CANARA|INDIAN)\s+BANK\s*$/i.test(upper)) return true;
  if (/^\*.*(SYSTEM\s+GENERATED|COMPUTER\s+GENERATED|AUTO\s+GENERATED).*\*$/i.test(line.trim())) return true;
  if (/^--.*(END|ENDS|PAGE|CONTINUE).*--$/i.test(line.trim())) return true;
  if (/^--\s*(\d+|PAGE)\s+(OF|\/)\s*\d+\s*--$/i.test(line.trim())) return true;
  if (/^[*-]{2,}\s*(PAGE|ENDS?|CONTINUED?)\s*[*-]{2,}\s*\d*\s*[*-]*$/i.test(line.trim())) return true;
  if (/^Transactions?:?\s*$/i.test(line.trim()) && line.trim().length < 20) return true;
  if (/ACCOUNT\s*(NO|NUMBER|STATEMENT|SUMMARY|TYPE|HOLDER|NAME)/i.test(upper)) return true;
  if (/BRANCH|IFSC|MICR|CUST\.?ID|CUSTOMER\s*ID|PAN\s*NO|GST\s*NO|TAN\s*NO/i.test(upper)) return true;
  if (/^(ADDRESS|PHONE|MOBILE|EMAIL|WEBSITE|CALL\s*US|TOLL\s*FREE)\s*:/i.test(upper) && upper.length < 100) return true;
  if (/^[A-Z\s]+\s*(ADDR|PHONE|MOBILE)\s/i.test(upper) && upper.length < 60 && !/\d{1,2}[\/\-\.]\d{1,2}/.test(line)) return true;
  if (/^(STATEMENT|BANK\s*STATEMENT|ACCOUNT\s*STATEMENT|E-\s*STATEMENT)/i.test(upper)) return true;
  if (/\bPERIOD\b/i.test(upper) && upper.length < 50) return true;
  if (/^FROM\s+.*\s+TO\b/i.test(upper)) return true;
  if (/BALANCE\s+AS\s+ON/i.test(upper) && upper.length < 50) return true;
  if (/^(GENERATED|PRINTED|DOWNLOADED)\s+ON/i.test(upper) && upper.length < 100) return true;
  if (/\b(SAVINGS|CURRENT|SALARY|OVERDRAFT|NRE|NRO|NRI)\s*(ACCOUNT|A\/C|BANK)\b/i.test(upper) && upper.length < 100) return true;
  if (/^SB\s+ACCOUNT/i.test(upper)) return true;
  if (/\bCORPORATE\s*NETBANKING\b/i.test(upper)) return true;
  if (/\bRETAIL\s*NETBANKING\b/i.test(upper)) return true;
  if (/^\d{11,}\s*$/i.test(line.trim()) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) return true;
  if (/^(DATE|TRANSACTION\s+DATE|VALUE\s+DATE|POSTING\s+DATE|TXN\s+DATE)\s/i.test(upper) && upper.length < 100) return true;
  if (/^(PARTICULARS|NARRATION|DESCRIPTION|DETAILS|TRANSACTION|PARTICULARS)\s/i.test(upper) && upper.length < 100) return true;
  if (/^(DEBIT|CREDIT|WITHDRAWAL|DEPOSIT|AMOUNT|BALANCE|WITHDRAWALS|DEPOSITS)\s/i.test(upper) && upper.length < 100) return true;
  if (/^(CHQ|CHEQUE|CHQ\.?\s*NO|CHEQUE\s*NO|TRANSACTION\s*REF)\b/i.test(upper) && upper.length < 100) return true;
  if (/^REF\.?\s*(NO|NUM|NUMBER|ERENCE)\b/i.test(upper) && upper.length < 100) return true;
  if (/^(OPENING|CLOSING)\s*BALANCE/i.test(upper)) return true;
  if (/^(TOTAL|SUBTOTAL|GRAND\s*TOTAL|SUM\s*OF)/i.test(upper)) return true;
  if (/^(DEBITS?|CREDITS?)\s*(TOTAL|SUM)?\s*:/i.test(upper)) return true;
  if (/^(TOTAL\s+)?(DEBITS?\s*|CREDITS?\s*|WITHDRAWALS?\s*|DEPOSITS?\s*)[\d,.\s]+$/i.test(line.trim())) return true;
  if (/^AVERAGE\s+BALANCE/i.test(upper)) return true;
  if (/^(MINIMUM|MAXIMUM)\s+BALANCE/i.test(upper)) return true;
  if (/^(INTEREST|CHARGES|TAX|FEE|REWARDS?)\s/i.test(upper) && upper.length < 50 && /AMOUNT|CREDITED|DEBITED|PAID/i.test(upper)) return true;
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*$/.test(line)) return true;
  if (/^[\d,\s.\-]+$/.test(line) && line.length > 3) return true;
  return false;
}

function extractDrCr(str) {
  const drMatch = str.match(/^([\d,.\s]+)\s*[Dd][Rr]/);
  if (drMatch) {
    return { debit: parseAmount(drMatch[1]), credit: 0 };
  }
  const crMatch = str.match(/^([\d,.\s]+)\s*[Cc][Rr]/);
  if (crMatch) {
    return { debit: 0, credit: parseAmount(crMatch[1]) };
  }
  return null;
}

module.exports = {
  generateTransactionHash,
  normalizeDate,
  removeIndianCommas,
  parseAmount,
  classifyAmount,
  classifyByDescription,
  isNonTransactionLine,
  extractDrCr
};

