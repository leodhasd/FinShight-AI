const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { statementController } = require('../controllers/statementController');
const { aiInsightsController } = require('../controllers/aiInsightsController');
const { aiCoachController } = require('../controllers/aiCoachController');

const router = express.Router();

// POST /api/statements/:id/process - Parse and save transactions from uploaded statement
router.post('/:id/process', authMiddleware, statementController.processStatement);

// GET /api/statements/:id/transactions - Get transactions with filters
router.get('/:id/transactions', authMiddleware, statementController.getTransactions);

// GET /api/statements/:id/transactions/export - Export transactions as CSV
router.get('/:id/transactions/export', authMiddleware, statementController.exportTransactions);

// GET /api/statements/:statementId/ai-insights - Get AI financial insights
router.get('/:statementId/ai-insights', authMiddleware, aiInsightsController.getStatementAiInsights);

// POST /api/statements/:statementId/ai-coach/ask - Ask the AI Financial Coach a question
router.post('/:statementId/ai-coach/ask', authMiddleware, aiCoachController.askFinancialCoach);

module.exports = router;

