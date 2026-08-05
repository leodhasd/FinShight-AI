const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const { User } = require('../models/User');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWT_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not set. Set a strong JWT_SECRET in production.');
    }
    return 'dev-only-secret';
  }
  return secret;
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }

const { fullName, email, password } = req.body;

  // [DEBUG] Register controller executed
  // eslint-disable-next-line no-console
  console.log('[DEBUG][register] Register controller executed');

  try {
    const normalizedEmail = normalizeEmail(email);

    // [DEBUG] Register executed
    // eslint-disable-next-line no-console
    console.log(`[DEBUG][register] Looking up existing user for email=${normalizedEmail}`);

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const createdUser = await User.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: true
    });

    // [DEBUG] Log created user isVerified value
    // eslint-disable-next-line no-console
    console.log(`[DEBUG][register] Created user id=${createdUser._id} isVerified=${createdUser.isVerified}`);

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully. You can now login.',
      data: {
        id: createdUser._id,
        fullName: createdUser.fullName,
        email: createdUser.email
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }

const { email, password } = req.body;

  // [DEBUG] Login controller executed
  // eslint-disable-next-line no-console
  console.log('[DEBUG][login] Login controller executed');

  try {
    const normalizedEmail = normalizeEmail(email);

    // [DEBUG] Load user from DB
    // eslint-disable-next-line no-console
    console.log(`[DEBUG][login] Loading user for email=${normalizedEmail}`);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // [DEBUG] User loaded from database
    // eslint-disable-next-line no-console
    console.log(`[DEBUG][login] User loaded from database id=${user._id} isVerified=${user.isVerified}`);

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email
    });

    // [DEBUG] Response returned
    // eslint-disable-next-line no-console
    console.log(`[DEBUG][login] Returning success response for email=${user.email} isVerified=${user.isVerified}`);

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
    me
  }
};
