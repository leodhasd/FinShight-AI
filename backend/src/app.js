const express = require('express');

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { env } = require('./config/env');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');

function createApp() {
  const app = express();

  // Core middleware
  app.use(helmet());

  app.use(
    cors({
      origin: [
        'https://fin-shight-ai.vercel.app',
        'https://fin-shight-ai-git-main-parthi4.vercel.app',
        'http://localhost:5173'
      ],
      credentials: true
    })
  );

  app.use(morgan('combined'));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Routes
  app.get('/', (req, res) => res.redirect('/health'));

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);

  const uploadsRoutes = require('./routes/uploads');
  app.use('/api/uploads', uploadsRoutes);

  const statementRoutes = require('./routes/statements');
  app.use('/api/statements', statementRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Not Found'
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'error',
          message: 'File too large. Max 10MB.'
        });
      }

      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }

    if (err.message && /invalid file type/i.test(err.message)) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }

    const statusCode = err?.statusCode || 500;
    const message = err?.message || 'Internal Server Error';

    res.status(statusCode).json({
      status: 'error',
      message
    });
  });

  return app;
}

module.exports = { createApp };