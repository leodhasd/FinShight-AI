/**
 * AI-Powered Transaction Categorization Service
 *
 * Automatically categorizes bank transactions based on their narration /
 * description text. Rules are ordered by specificity:
 *
 *   - Specific merchant categories (Salary, Investment, EMI, Fuel,
 *     Healthcare, Education, Entertainment, Travel, Food, Shopping, ATM,
 *     Bills) are matched BEFORE generic payment-channel categories (UPI,
 *     Transfer). This ensures a narration like "UPI/DR/.../SWIGGY" is
 *     correctly categorized as "Food" rather than "UPI".
 *
 *   - If no rule matches, the transaction is categorized as "Others".
 *
 * Categories (15):
 *   Food, Shopping, Travel, Fuel, Salary, ATM, UPI, Bills, EMI,
 *   Entertainment, Healthcare, Education, Investment, Transfer, Others
 */

const mongoose = require('mongoose');
const { Transaction } = require('../models/Transaction');

const CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Fuel',
  'Salary',
  'ATM',
  'UPI',
  'Bills',
  'EMI',
  'Entertainment',
  'Healthcare',
  'Education',
  'Investment',
  'Transfer',
  'Others'
];

/**
 * Ordered categorization rules.
 * Earlier rules have higher priority and are checked first.
 */
const RULES = [
  // ---- Salary & Income ----
  {
    category: 'Salary',
    keywords: [
      'salary', 'salary credit', 'salary credited', 'sal credit', 'sal cr',
      'payroll', 'wage', 'wages', 'stipend', 'monthly pay', 'remuneration'
    ]
  },

  // ---- Investments & Savings ----
  {
    category: 'Investment',
    keywords: [
      'sip', 'mutual fund', 'mutual funds', 'mf', 'stock', 'stocks', 'shares',
      'share', 'trading', 'zerodha', 'groww', 'kuvera', 'demat', 'nps', 'ppf',
      'fixed deposit', 'fd', 'recurring deposit', 'rd', 'bonds', 'etf',
      'invest', 'investment', 'investments', 'upstox', 'angel one',
      'portfolio', 'equity', 'dividend', 'sgb', 'dematerial', 'demate'
    ]
  },

  // ---- Loan / EMI payments ----
  {
    category: 'EMI',
    keywords: [
      'emi', 'loan repayment', 'loan installment', 'loan instalment',
      'loan payment', 'home loan', 'car loan', 'personal loan',
      'vehicle loan', 'gold loan', 'education loan', 'mortgage',
      'loan emi', 'loan interest', 'loan'
    ]
  },

  // ---- Fuel / Petrol / Diesel ----
  {
    category: 'Fuel',
    keywords: [
      'petrol', 'diesel', 'fuel', 'indian oil', 'iocl', 'hpcl',
      'bharat petroleum', 'bpcl', 'hindustan petroleum', 'petroleum', 'cng',
      'shell', 'gas station', 'fuel pump', 'ioc', 'fuel card', 'fuelcard',
      'petrol pump', 'gasoline'
    ]
  },

  // ---- Healthcare ----
  {
    category: 'Healthcare',
    keywords: [
      'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine',
      'medicines', 'pharma', 'apollo', 'fortis', 'manipal', 'dentist',
      'dental', 'diagnostic', 'pathlab', 'path lab', 'lab', 'chemist',
      'medplus', 'netmeds', '1mg', 'practo', 'physio', 'physiotherapy',
      'ayurveda', 'optical', 'spectacles', 'nursing', 'surgery',
      'consultation', 'prescription', 'dialysis', 'blood test', 'x-ray',
      'xray', 'health check', 'wellness'
    ]
  },

  // ---- Education ----
  {
    category: 'Education',
    keywords: [
      'school', 'college', 'university', 'tuition', 'coaching', 'academy',
      'byju', 'unacademy', 'vedantu', 'udemy', 'coursera', 'khan academy',
      'classes', 'course', 'course fee', 'exam fee', 'admission fee',
      'hostel fee', 'semester', 'education', 'library', 'study', 'books',
      'bookstore', 'book store', 'school fee', 'college fee',
      'tuition fee', 'entrance exam', 'upsc', 'neet', 'jee', 'scholarship',
      'student'
    ]
  },

  // ---- Entertainment ----
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'prime video', 'amazon prime', 'hotstar', 'disney', 'ott',
      'movie', 'movies', 'cinema', 'pvr', 'inox', 'bookmyshow',
      'book my show', 'steam', 'playstation', 'xbox', 'spotify', 'gaana',
      'jiosaavn', 'jio saavn', 'youtube', 'theatre', 'theater', 'concert',
      'amc', 'music', 'gaming', 'game', 'games', 'subscription',
      'entertainment', 'multiplex'
    ]
  },

  // ---- Travel ----
  {
    category: 'Travel',
    keywords: [
      'flight', 'air ticket', 'airline', 'indigo', 'air india', 'spicejet',
      'vistara', 'goair', 'akasa', 'train', 'railway', 'irctc', 'metro',
      'bus', 'redbus', 'abhibus', 'uber', 'ola', 'rapido', 'cab', 'taxi',
      'oyo', 'goibibo', 'make my trip', 'makemytrip', 'yatra',
      'easemytrip', 'cleartrip', 'travel', 'travels', 'airasia', 'airport',
      'toll', 'parking', 'passport', 'visa', 'tour', 'holiday', 'resort',
      'airbnb', 'booking.com', 'hotel', 'lodge', 'inn'
    ]
  },

  // ---- Food & Dining ----
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'dining', 'dine',
      'eat', 'pizza', 'burger', 'mcdonald', 'mcd', 'dominos', 'kfc',
      'subway', 'starbucks', 'coffee', 'barista', 'tea', 'meal', 'lunch',
      'dinner', 'breakfast', 'snacks', 'biryani', 'dosa', 'chaat', 'paneer',
      'tiffin', 'canteen', 'mess', 'food court', 'bakery', 'pastry',
      'ice cream', 'icecream', 'grocery', 'groceries', 'provisions',
      'supermarket', 'provision', 'vegetable', 'vegetables', 'fruit',
      'fruits', 'milk', 'dairy', 'butcher', 'meat', 'fish', 'chicken',
      'mutton', 'egg', 'eggs', 'bread', 'rice', 'wheat', 'flour', 'oil',
      'spices', 'kirana', 'general store'
    ]
  },

// ---- Shopping ----
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa',
      'shopping', 'mall', 'retail', 'clothing', 'apparel', 'footwear',
      'shoes', 'electronics', 'gadget', 'store', 'fashion', 'jewellery',
      'jewelry', 'watch', 'accessories', 'handbag', 'bag', 'wallet',
      'cosmetics', 'makeup', 'skincare', 'perfume', 'decor', 'furniture',
      'home decor', 'kitchen', 'appliances', 'laptop', 'tablet',
      'purchase', 'billing', 'mart', 'bazaar', 'departmental',
      'lifestyle', 'trends', 'westside', 'pantaloons', 'shoppers stop',
      'd mart', 'd-mart', 'bigbasket', 'blinkit', 'zepto', 'instamart'
    ]
  },

  // ---- ATM / Cash Withdrawal ----
  {
    category: 'ATM',
    keywords: [
      'atm', 'withdrawal', 'withdraw', 'wdl', 'cash', 'cash withdrawal',
      'cash withdraw', 'cash out', 'cdm', 'cash deposit'
    ]
  },

  // ---- Bills & Utilities ----
  {
    category: 'Bills',
    keywords: [
      'electricity', 'electricity bill', 'power bill', 'current bill',
      'water bill', 'water', 'gas bill', 'gas', 'utility', 'bill',
      'bill payment', 'broadband', 'wifi', 'internet', 'phone', 'mobile',
      'mobile recharge', 'recharge', 'dth', 'dish tv', 'tata sky',
      'airtel', 'jio', 'vi', 'vodafone', 'idea', 'bsnl', 'mtnl',
      'rent', 'maintenance', 'society', 'society fee',
      'property tax', 'tax', 'insurance premium', 'insurance',
      'lic', 'policy', 'premium', 'insure', 'electricity board',
      'mseb', 'bescom', 'tneb', 'torrent power', 'adani power',
      'tata power', 'bses', 'utility bill'
    ]
  },

  // ---- UPI Transactions ----
  {
    category: 'UPI',
    keywords: [
      'upi', 'upi/dr', 'upi/cr', 'upi/ref', 'upi//',
      'upi transfer', 'upi payment', 'upi transaction',
      'upi/merchant', 'upi/dr/', 'upi/cr/', 'gpay',
      'google pay', 'phonepe', 'paytm', 'bhim', 'amazon pay',
      'upi-', 'upi_'
    ]
  },

  // ---- Transfers (NEFT/RTGS/IMPS) ----
  {
    category: 'Transfer',
    keywords: [
      'neft', 'rtgs', 'imps', 'transfer', 'fund transfer',
      'funds transfer', 'online transfer', 'internal transfer',
      'intra bank', 'inter bank', 'transfer in', 'transfer out',
      'neft dr', 'neft cr', 'imps dr', 'imps cr', 'rtgs dr', 'rtgs cr',
      'transfer to', 'transfer from', 'by transfer', 'thru transfer',
      'via transfer', 'bank transfer', 'chq', 'cheque', 'cheque deposit',
      'cheque payment', 'dd', 'demand draft', 'draft', 'po',
      'postal order', 'pay order', 'refund', 'cashback', 'interest',
      'interest credited', 'interest paid', 'dividend paid',
      'dividend credited', 'maturity', 'matured', 'sweep in', 'sweep out',
      'closing balance', 'opening balance', 'credit card payment',
      'credit card bill', 'credit card'
    ]
  }
];

/**
 * Categorize a single transaction description.
 * @param {string} description - Transaction narration / description text
 * @returns {string} Category name (one of the 15 categories)
 */
function categorizeTransaction(description) {
  if (!description || typeof description !== 'string') {
    return 'Others';
  }

  const lower = description.toLowerCase().trim();
  if (!lower) return 'Others';

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      // Use word-boundary matching for most keywords
      // For multi-word keywords, we check if the phrase appears
      if (keyword.length <= 3 && keyword !== 'fd' && keyword !== 'mf' && keyword !== 'dd' && keyword !== 'po' && keyword !== 'cdm' && keyword !== 'emi' && keyword !== 'sip' && keyword !== 'nps' && keyword !== 'ppf' && keyword !== 'sgb' && keyword !== 'etf' && keyword !== 'ott' && keyword !== 'pvr' && keyword !== 'kfc' && keyword !== 'mcd' && keyword !== 'lic' && keyword !== 'tid' && keyword !== 'ref' && keyword !== 'dr/' && keyword !== 'cr/' && keyword !== 'upi' && keyword !== 'tax' && keyword !== 'gas' && keyword !== 'bus' && keyword !== 'cab' && keyword !== 'fd/' && keyword !== 'rd/' && keyword !== 'dd/' && keyword !== 'po/' && keyword !== 'taxi') {
        // Short keywords (3 chars or less) — use word boundary
        const regex = new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i');
        if (regex.test(lower)) {
          return rule.category;
        }
      } else if (/^[a-z0-9\s]+$/.test(keyword)) {
        // Regular keyword — check if it appears as a word/phrase
        const regex = new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i');
        if (regex.test(lower)) {
          return rule.category;
        }
      } else {
        // Keyword with special chars (like UPI/DR, UPI/CR, etc.)
        // Check exact substring match
        if (lower.includes(keyword.toLowerCase())) {
          return rule.category;
        }
      }
    }
  }

  // Fallback: check if description looks like a transfer (e.g., contains ref no, trf, etc.)
  if (/\b(trf|transfer|neft|rtgs|imps|upi|chq|cheque)\b/i.test(lower)) {
    if (/\b(upi|gpay|phonepe|paytm|bhim)\b/i.test(lower)) {
      return 'UPI';
    }
    return 'Transfer';
  }

  return 'Others';
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Backfill categories for all transactions in a statement that are missing
 * the category field. This is used for backward compatibility when the
 * category field is added to existing transactions.
 *
 * @param {string|ObjectId} ownerUserId
 * @param {string|ObjectId} statementId
 * @returns {Promise<number>} Number of transactions updated
 */
async function backfillStatementCategories(ownerUserId, statementId) {
  const ownerId = new mongoose.Types.ObjectId(ownerUserId);
  const stmtId = new mongoose.Types.ObjectId(statementId);

  // Find all transactions in this statement that don't have a category set
  const uncategorized = await Transaction.find({
    ownerUserId: ownerId,
    statementId: stmtId,
    $or: [
      { category: { $exists: false } },
      { category: null },
      { category: '' }
    ]
  }).lean();

  if (uncategorized.length === 0) return 0;

  let updatedCount = 0;

  for (const txn of uncategorized) {
    const category = categorizeTransaction(txn.description);
    await Transaction.updateOne(
      { _id: txn._id },
      { $set: { category } }
    );
    updatedCount++;
  }

  return updatedCount;
}

module.exports = {
  CATEGORIES,
  categorizeTransaction,
  backfillStatementCategories
};
