const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { env } = require('../config/env');

let transporter = null;
let etherealPreviewUrl = null;

/**
 * Generate a secure random verification token and its sha256 hash.
 * Only the hash is stored in the DB; the raw token is sent to the user.
 */
function generateVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hash };
}

/**
 * Hash a raw token so it can be compared against the stored hash.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

/**
 * Build the frontend verification URL from CLIENT_ORIGIN.
 */
function buildVerificationUrl({ rawToken, userId }) {
  const origin = env.CLIENT_ORIGIN || 'http://localhost:5173';
  const base = origin.replace(/\/+$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(rawToken)}&userId=${encodeURIComponent(userId)}`;
}

/**
 * Initialize the nodemailer transporter.
 * - If SMTP credentials are present in env, use them.
 * - Otherwise fall back to Ethereal (dev) so tests/dev still work.
 */
async function initEtherealTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(env.SMTP_PORT || 587),
      secure: Number(env.SMTP_PORT || 587) === 465,
      family:4,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    return transporter;
  }

  // Dev fallback: create a test account on Ethereal
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return transporter;
}

function getTransporter() {
  if (!transporter) {
    throw new Error('Email transporter not initialized. Call initEtherealTransporter() first.');
  }
  return transporter;
}

/**
 * Send a verification email with a link to the frontend verify-email page.
 */
async function sendVerificationEmail({ to, fullName, rawToken, userId }) {
  console.log("SENDING EMAIL TO:", to);
  const t = getTransporter();
  const verifyUrl = buildVerificationUrl({ rawToken, userId });

  const from = env.SMTP_FROM || 'FinSight AI <noreply@finsightai.com>';
  const mailOptions = {
    from,
    to,
    subject: 'Verify your FinSight AI account',
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 12px;color:#111827;">Verify your email</h2>
        <p style="color:#4b5563;line-height:1.6;">Hi ${fullName || 'there'},</p>
        <p style="color:#4b5563;line-height:1.6;">
          Thanks for signing up for FinSight AI. Please confirm your email address by clicking the button below.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:linear-gradient(90deg,#6366f1,#d946ef);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;line-height:1.5;">
          This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
        </p>
        <p style="color:#9ca3af;font-size:12px;">Or copy this link into your browser:<br/>${verifyUrl}</p>
      </div>
    `
  };

  console.log("BEFORE SEND MAIL");

  await transporter.verify();
  console.log("SMTP VERIFIED");

  const info = await t.sendMail(mailOptions);

  console.log("AFTER SEND MAIL");
  console.log(info);

  console.log("EMAIL SENT:", info.messageId);

  // For dev/Ethereal, log the preview URL so the email can be opened in a browser.
  if (info && info.messageId && info.messageId.includes('ethereal')) {
    etherealPreviewUrl = nodemailer.getTestMessageUrl(info);
    // eslint-disable-next-line no-console
    console.log(`[Email] Preview URL: ${etherealPreviewUrl}`);
  }

  return { info, etherealPreviewUrl };
}

module.exports = {
  generateVerificationToken,
  hashToken,
  initEtherealTransporter,
  sendVerificationEmail,
  getTransporter
};

