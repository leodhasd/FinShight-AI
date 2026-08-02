const mongoose = require('mongoose');

function getDatabaseStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

function getHealth(req, res) {
  return res.status(200).json({
    status: 'ok',
    server: 'running',
    database: getDatabaseStatus()
  });
}

module.exports = { healthController: { getHealth } };

