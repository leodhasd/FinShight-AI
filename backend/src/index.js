const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
console.log(process.env.MONGODB_URI);

const { env } = require('./config/env');
const { connectToDatabase } = require('./services/database');
const { createApp } = require('./app');

async function start() {
  await connectToDatabase();

  // Initialize email transporter (Ethereal for dev)
  const { initEtherealTransporter } = require('./services/emailService');
  await initEtherealTransporter();

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
