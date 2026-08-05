const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { env } = require('./config/env');
const { connectToDatabase } = require('./services/database');
const { createApp } = require('./app');

function setupProcessHandlers() {
  // Prevent the process from crashing silently on an unhandled rejection.
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[Server] Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
  });

  // Log a clear message and exit cleanly on an uncaught exception.
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('[Server] Uncaught exception:', err && err.message ? err.message : err);
    process.exit(1);
  });
}

async function start() {
  setupProcessHandlers();

  await connectToDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${env.PORT}`);
  });

  // Handle "address in use" (EADDRINUSE) gracefully with a clear message
  // instead of throwing an unhandled 'error' event that looks like a crash.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `[Server] Port ${env.PORT} is already in use (EADDRINUSE). ` +
        'Stop the other backend instance or set PORT in the .env file, then retry.'
      );
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.error('[Server] Failed to start server:', err.message || err);
    process.exit(1);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[Server] Failed to start server:', err && err.message ? err.message : err);
  process.exit(1);
});
