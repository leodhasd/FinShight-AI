const express = require('express');
const { body } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { authController } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('fullName')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('fullName is required')
      .isLength({ max: 120 })
      .withMessage('fullName must be at most 120 characters'),
    body('email')
      .isString()
      .trim()
      .isEmail()
      .withMessage('email must be a valid email address'),
    body('password')
      .isString()
      .isLength({ min: 8, max: 72 })
      .withMessage('password must be between 8 and 72 characters')
  ],
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .isString()
      .trim()
      .isEmail()
      .withMessage('email must be a valid email address'),
    body('password')
      .isString()
      .notEmpty()
      .withMessage('password is required')
  ],
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.me);

module.exports = router;
