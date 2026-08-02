const mongoose = require('mongoose');
const { BankStatementUpload } = require('../models/BankStatementUpload');
const { getAiInsights } = require('../services/aiInsightsService');

/**
 * GET /api/statements/:statementId/ai-insights
 * Retrieve AI-powered financial insights for a single uploaded statement.
 * Returns health score, summaries, suggestions, and derived metrics
 * calculated exclusively from the statement's transaction data.
 */
async function getStatementAiInsights(req, res) {
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

    // Verify the statement exists and belongs to this user
    const statement = await BankStatementUpload.findOne({
      _id: statementId,
      ownerUserId
    }).lean();

    if (!statement) {
      return res.status(404).json({ status: 'error', message: 'Statement not found' });
    }

    // Delegate to the insights service
    const insights = await getAiInsights(ownerUserId, statementId);

    return res.status(200).json({
      status: 'success',
      message: 'AI insights generated successfully',
      data: {
        statementId,
        originalFileName: statement.originalFileName,
        ...insights
      }
    });
  } catch (err) {
    console.error(`[AIInsights] ERROR: ${err?.message}`);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to generate AI insights'
    });
  }
}

module.exports = {
  aiInsightsController: {
    getStatementAiInsights
  }
};

