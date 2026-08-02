/**
 * Canara Bank ePassbook statement parser.
 *
 * This parser handles the Canara Bank ePassbook PDF text layout. It is
 * registered in the parser registry as the `canara` bank parser.
 *
 * Layout (one transaction):
 *   29-07-2026
 *   UPI/CR/211900588070/KIRUBH
 *   ASH/IOBA/**35280@PTYES/SE
 *   NT
 *   USI//PTM2E355E8040DB458CB
 *   4AA7A440C867360/29/07/2026
 *   11:24:25
 *   Chq: 211900588070
 *   3.00 252.22
 *
 * Each transaction block starts with a date line (DD-MM-YYYY), followed by
 * wrapped UPI narration lines, an optional Chq reference line, then an amount
 * line of the form "<amount> <balance>" where <amount> is the deposit OR the
 * withdrawal (only the populated column is rendered in the PDF). The credit /
 * debit direction is signalled by "UPI/CR" vs "UPI/DR" in the narration.
 *
 * Header rows provide account metadata:
 *   Statement for A/c XXXXXXXX3254 between 29-Jul-2026 and 30-Jul-2026
 *   Name SAKTHIVEL BALAN S
 *   Opening Balance 249.22
 *   Closing Balance 141.22
 *
 * Returns null when the lines do not look like a Canara ePassbook statement.
 */
const {
  generateTransactionHash,
  normalizeDate,
  parseAmount,
  classifyByDescription
} = require('./common');

function parseCanaraLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const text = lines.join('\n');
  const looksCanara =
    /Statement\s+for\s+A\/c/i.test(text) &&
    /Customer\s+Id/i.test(text) &&
    /Date\s+Particulars\s+Deposits\s+Withdrawals\s+Balance/i.test(text);

  if (!looksCanara) return null;

  const transactions = [];
  const skippedLines = [];
  const metadata = {
    accountHolderName: null,
    accountNumber: null,
    openingBalance: null,
    closingBalance: null
  };

  // --- Extract metadata (account holder, account no, opening/closing balance) ---
  for (const raw of lines) {
    const line = String(raw).trim();
    if (!line) continue;

    const stmtMatch = line.match(/^Statement\s+for\s+A\/c\s+([^\s]+)\s+between/i);
    if (stmtMatch && !metadata.accountNumber) {
      metadata.accountNumber = stmtMatch[1].trim();
      continue;
    }
    const nameMatch = line.match(/^Name\s+(.+)$/i);
    if (nameMatch && !metadata.accountHolderName) {
      metadata.accountHolderName = nameMatch[1].trim();
      continue;
    }
    const openMatch = line.match(/^Opening\s+Balance\s+([\d,]+\.?\d*)/i);
    if (openMatch) {
      metadata.openingBalance = parseAmount(openMatch[1]);
      continue;
    }
    const closeMatch = line.match(/^Closing\s+Balance\s+([\d,]+\.?\d*)/i);
    if (closeMatch) {
      metadata.closingBalance = parseAmount(closeMatch[1]);
      continue;
    }
  }

  const CANARA_DATE_PATTERN = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const AMOUNT_LINE_PATTERN = /^([\d,]+\.\d{1,2})\s+([\d,]+\.\d{1,2})$/;
  const SINGLE_AMOUNT_PATTERN = /^([\d,]+\.\d{1,2})$/;
  const CHQ_LINE_PATTERN = /^Chq\.?\s*:?\s*\d/i;
  const PAGE_LINE_PATTERN = /^(page\s+\d+|--\s*\d+\s+of\s+\d+\s*--|DISCLAIMER|COMPUTER\s+OUTPUT)/i;
  const COLUMN_HEADER_PATTERN = /Date\s+Particulars\s+Deposits\s+Withdrawals\s+Balance/i;
  const HEADER_TAIL_PATTERN = /^(Statement\s+for|Customer\s+Id|Name\s+|Phone|Address|Branch\s+Code|Branch\s+Name|IFSC\s+Code)/i;

  let i = 0;
  let current = null; // { date, descLines, hasChq }

  while (i < lines.length) {
    const line = String(lines[i]).trim();
    if (!line) { i++; continue; }

    // Date line starts a new transaction block
    const dateMatch = line.match(CANARA_DATE_PATTERN);
    if (dateMatch) {
      if (current) {
        skippedLines.push({ line: current.descLines.join(' ') || line, reason: 'Canara: previous transaction missing amount line' });
        current = null;
      }
      const date = normalizeDate(`${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`);
      if (date) {
        current = { date, descLines: [], hasChq: false };
      } else {
        skippedLines.push({ line, reason: 'Canara: unparsable date' });
      }
      i++;
      continue;
    }

    if (current) {
      // Amount line terminates the transaction block: "<amount> <balance>"
      const amtMatch = line.match(AMOUNT_LINE_PATTERN);
      if (amtMatch) {
        const amount = parseAmount(amtMatch[1]);
        const balance = parseAmount(amtMatch[2]);
        const description = current.descLines.join(' ').replace(/\s+/g, ' ').trim();

        let debit = 0;
        let credit = 0;
        if (/UPI\/DR/i.test(description)) {
          debit = Math.abs(amount);
        } else if (/UPI\/CR/i.test(description)) {
          credit = Math.abs(amount);
        } else {
          const classified = classifyByDescription(description, amount);
          debit = classified.debit;
          credit = classified.credit;
        }

        if (description && current.date) {
          const txn = {
            date: current.date,
            description: description.slice(0, 500),
            debit,
            credit,
            balance
          };
          txn.transactionHash = generateTransactionHash(txn);
          transactions.push(txn);
        } else {
          skippedLines.push({ line, reason: 'Canara: transaction missing description' });
        }
        current = null;
        i++;
        continue;
      }

      // Single-number line can be a withdrawal/deposit amount (rare)
      const singleAmt = line.match(SINGLE_AMOUNT_PATTERN);
      if (singleAmt && current.descLines.length > 0) {
        const amount = parseAmount(singleAmt[1]);
        const description = current.descLines.join(' ').replace(/\s+/g, ' ').trim();
        let debit = 0;
        let credit = 0;
        if (/UPI\/DR/i.test(description)) {
          debit = Math.abs(amount);
        } else if (/UPI\/CR/i.test(description)) {
          credit = Math.abs(amount);
        } else {
          const classified = classifyByDescription(description, amount);
          debit = classified.debit;
          credit = classified.credit;
        }
        if (description && current.date) {
          const txn = {
            date: current.date,
            description: description.slice(0, 500),
            debit,
            credit,
            balance: 0
          };
          txn.transactionHash = generateTransactionHash(txn);
          transactions.push(txn);
        }
        current = null;
        i++;
        continue;
      }

      // Chq reference line — merge into the narration
      if (CHQ_LINE_PATTERN.test(line)) {
        current.descLines.push(line);
        current.hasChq = true;
        i++;
        continue;
      }

      // Footer / column header / header-tail ends the current block
      if (
        PAGE_LINE_PATTERN.test(line) ||
        COLUMN_HEADER_PATTERN.test(line) ||
        /^Closing\s+Balance/i.test(line) ||
        HEADER_TAIL_PATTERN.test(line)
      ) {
        skippedLines.push({ line: current.descLines.join(' ') || line, reason: 'Canara: transaction interrupted by header/footer' });
        current = null;
        i++;
        continue;
      }

      // Any other line is a wrapped narration continuation
      current.descLines.push(line);
      i++;
      continue;
    }

    // No active transaction: skip headers, footers, disclaimers
    if (
      PAGE_LINE_PATTERN.test(line) ||
      COLUMN_HEADER_PATTERN.test(line) ||
      /^(Opening|Closing)\s+Balance/i.test(line) ||
      HEADER_TAIL_PATTERN.test(line) ||
      /^--\s*END\s+OF\s+STATEMENT\s*--$/i.test(line)
    ) {
      i++;
      continue;
    }

    skippedLines.push({ line, reason: 'Canara: line outside transaction block' });
    i++;
  }

  // Dangling transaction (no amount line)
  if (current) {
    skippedLines.push({
      line: current.descLines.join(' ') || '(dangling)',
      reason: 'Canara: transaction missing amount line'
    });
  }

  return { transactions, skippedLines, metadata };
}

/**
 * Registry-compatible parser definition.
 *
 * `detect` returns true when the input looks like a Canara ePassbook statement.
 * `parse` returns the same shape as the legacy parseCanaraLines result, but
 * also exposes `bankId` / `bankName` for the registry to attach.
 */
function detect(textOrLines) {
  const text = Array.isArray(textOrLines) ? textOrLines.join('\n') : String(textOrLines || '');
  return (
    /Statement\s+for\s+A\/c/i.test(text) &&
    /Customer\s+Id/i.test(text) &&
    /Date\s+Particulars\s+Deposits\s+Withdrawals\s+Balance/i.test(text)
  );
}

function parse(lines) {
  const result = parseCanaraLines(lines);
  if (!result) return null;
  return {
    ...result,
    bankId: 'canara',
    bankName: 'Canara Bank'
  };
}

module.exports = {
  id: 'canara',
  bankName: 'Canara Bank',
  bankDisplayName: 'Canara Bank',
  formats: ['pdf', 'text'],
  priority: 100,
  detect,
  parse,
  parseCanaraLines
};

