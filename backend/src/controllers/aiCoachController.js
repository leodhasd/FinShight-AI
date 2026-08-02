const mongoose = require('mongoose');
const { BankStatementUpload } = require('../models/BankStatementUpload');
const { askCoach } = require('../services/aiCoachService');

/**
 * POST /api/statements/:statementId/ai-coach/ask
 * Ask the AI Financial Coach a personalised question about a statement.
 *
 * The service consumes ONLY the existing AI Insights service (getAiInsights)
 * plus the raw transactions for the statement. No hardcoded answers.
 *
 * Response shape: { answer, points, intent }
 */
async function askFinancialCoach(req, res) {
  try {
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const statementId = req.params.statementId;

    // Validate ObjectId format before querying
    if (!mongoose.Types.ObjectId.isValid(statementId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid statement ID format' });
    }

    // Validate the question input
    const question = (req.body?.question || '').toString().trim();
    if (!question) {
      return res.status(400).json({ status: 'error', message: 'A question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ status: 'error', message: 'Question is too long (max 500 characters)' });
    }

    // Verify the statement exists and belongs to this user
    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({ status: 'error', message: 'Statement not found' });
    }

    // Delegate to the coach service (single source of truth: aiInsightsService)
    const result = await askCoach(ownerUserId, statementId, question);

    return res.status(200).json({
      status: 'success',
      message: 'Coach answered successfully',
      data: {
        statementId,
        answer: result.answer,
        points: Array.isArray(result.points) ? result.points : [],
        intent: result.intent || 'overview'
      }
    });
  } catch (err) {
    console.error(`[AICoach] ERROR: ${err?.message}`);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to get an answer from the AI coach'
    });
  }
}

module.exports = {
  aiCoachController: {
    askFinancialCoach
  }
};

