const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { bankStatementUpload } = require('../controllers/bankStatementUploadController');

const router = express.Router();

// POST /api/uploads/bank-statements
router.post('/bank-statements', authMiddleware, bankStatementUpload.middleware, bankStatementUpload.handleUpload);

// POST /api/uploads/bank-statements/:id/unlock
// Unlock a password-protected PDF with the provided password
router.post('/bank-statements/:id/unlock', authMiddleware, bankStatementUpload.unlockAndProcess);

// GET /api/uploads/bank-statements
router.get('/bank-statements', authMiddleware, bankStatementUpload.listUploads);

module.exports = router;

