const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const { User } = require('../models/User');
const { generateVerificationToken, hashToken, sendVerificationEmail, initEtherealTransporter } = require('../services/emailService');

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_KEY || 'dev-only-secret';
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function getJwtExpiry() {
  return process.env.JWT_EXPIRES_IN || '1d';
}

function signToken({ userId, email }) {
  return jwt.sign({ email }, getJwtSecret(), {
    subject: userId,
    expiresIn: getJwtExpiry()
  });
}

async function register(req, res) {
  console.log("REGISTER BODY:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("VALIDATION ERRORS:", errors.array());
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      errors: errors.array()
    });
  }

  const { fullName, email, password } = req.body;

  try {
    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "Email already in use"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const { rawToken, hash: tokenHash } = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const createdUser = await User.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: false,
      verificationTokenHash: tokenHash,
      verificationTokenExpires: tokenExpires
    });

    // Send verification email (non-blocking)
    sendVerificationEmail({
      to: normalizedEmail,
      fullName: String(fullName).trim(),
      rawToken,
      userId: String(createdUser._id)
    }).catch(err => {
      console.error('[Auth] Failed to send verification email:', err.message);
    });

    return res.status(201).json({
      status: "success",
      message: "User registered successfully. Please check your email to verify your account.",
      data: {
        id: createdUser._id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        needsVerification: true
      }
    });

  } catch (err) {
    console.error("REGISTER ERROR:");
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
}

async function verifyEmail(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { token, userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already verified. You can login now.'
      });
    }

    if (!user.verificationTokenHash || !user.verificationTokenExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'No verification token found. Please request a new verification email.'
      });
    }

    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification token has expired. Please request a new verification email.'
      });
    }

    const computedHash = hashToken(token);
    if (computedHash !== user.verificationTokenHash) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification token. Please request a new verification email.'
      });
    }

    // Mark as verified and clear token fields
    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpires = null;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now login.'
    });

  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}

async function resendVerification(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { email } = req.body;

  try {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this email address.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'This email is already verified. You can login.'
      });
    }

    // Generate new token
    const { rawToken, hash: tokenHash } = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationTokenHash = tokenHash;
    user.verificationTokenExpires = tokenExpires;
    await user.save();

    // Send new verification email
    sendVerificationEmail({
      to: normalizedEmail,
      fullName: user.fullName,
      rawToken,
      userId: String(user._id)
    }).catch(err => {
      console.error('[Auth] Failed to resend verification email:', err.message);
    });

    return res.status(200).json({
      status: 'success',
      message: 'Verification email sent. Please check your inbox.'
    });

  } catch (err) {
    console.error('RESEND VERIFICATION ERROR:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}

async function login(req, res) {
  console.log("LOGIN BODY:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("VALIDATION ERRORS:", errors.array());
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    const normalizedEmail = normalizeEmail(email);

    console.log("SEARCHING EMAIL:", normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });

    console.log("USER FOUND:", user);

    if (!user) {
      console.log("LOGIN FAILED: User not found");
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      console.log("LOGIN FAILED: Email not verified");
      return res.status(403).json({
        status: 'error',
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email
      });
    }

    const ok = await bcrypt.compare(password, user.password);

    console.log("PASSWORD MATCH:", ok);

    if (!ok) {
      console.log("LOGIN FAILED: Password mismatch");
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email
    });

    console.log("LOGIN SUCCESS:", user.email);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}

async function logout(req, res) {
  // Stateless JWT: client should discard token.
  return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select('fullName email createdAt isVerified');
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Authenticated user',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

module.exports = {
  authController: {
    register,
    login,
    logout,
    me,
    verifyEmail,
    resendVerification
  }
};
