const nodemailer = require('nodemailer');

const { env } = require('../config/env');

let transporter = null;

/**
 * Create a nodemailer transporter from SMTP env config.
 */
function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === true,
    requireTLS: !env.SMTP_SECURE,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Create an Ethereal (dev/test) transporter.
 */
async function createEtherealTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  const t = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  // eslint-disable-next-line no-console
  console.log('[Email] Using Ethereal test transport (dev)');

  return t;
}

/**
 * Initialize the nodemailer transporter.
 * - If SMTP credentials are present in env, use them (and verify).
 * - If SMTP auth fails (e.g. bad/missing credentials), fall back to Ethereal
 *   so any email flow still works in development instead of failing silently.
 */
async function initEtherealTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_USER && env.SMTP_PASS) {
    const candidate = createSmtpTransporter();
    try {
      await candidate.verify();
      transporter = candidate;
      // eslint-disable-next-line no-console
      console.log(`[Email] SMTP transport verified (${env.SMTP_HOST}:${env.SMTP_PORT})`);
      return transporter;
    } catch (err) {
      // SMTP auth/config failed — do not expose the password in logs.
      // eslint-disable-next-line no-console
      console.warn(
        `[Email] SMTP verification failed (${env.SMTP_HOST}:${env.SMTP_PORT}): ${err && err.message ? err.message : err}`
      );
      // Proceed to Ethereal fallback below.
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('[Email] No SMTP credentials provided; using Ethereal test transport (dev)');
  }

  // Dev fallback: create a test account on Ethereal
  transporter = await createEtherealTransporter();
  return transporter;
}

function getTransporter() {
  if (!transporter) {
    throw new Error('Email transporter not initialized. Call initEtherealTransporter() first.');
  }
  return transporter;
}

module.exports = {
  initEtherealTransporter,
  getTransporter
};
