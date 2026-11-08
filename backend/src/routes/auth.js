
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import Admin from '../models/Admin.js';
import { requireAuth } from '../middleware/auth.js';
import {
  emailSchema,
  passwordSchema
} from '../utils/validation.js';

const router = Router();

// Authentication cookie configuration
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000
});

// Check whether initial admin setup is required
router.get('/setup-status', async (req, res) => {
  const setupRequired = (await Admin.countDocuments()) === 0;

  res.json({ setupRequired });
});

// Initial admin registration
router.post('/setup', async (req, res) => {
  try {
    // Prevent additional admin registration
    if (await Admin.countDocuments()) {
      return res.status(403).json({
        message: 'Initial admin already exists'
      });
    }

    const { name, email, password } = req.body || {};

    // Validate name
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        message: 'Please provide a valid name'
      });
    }

    // Validate email
    const emailResult = emailSchema.safeParse(email);

    if (!emailResult.success) {
      return res.status(400).json({
        message: 'Please provide a valid email address'
      });
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);

    if (!passwordResult.success) {
      return res.status(400).json({
        message: passwordResult.error.issues[0].message
      });
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      name: name.trim(),
      email: emailResult.data,
      passwordHash
    });

    return res.status(201).json({
      message: 'Admin created. Please sign in.',
      admin: {
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    // Handle duplicate email registration
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    throw error;
  }
});

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  // Validate login input
  const emailResult = emailSchema.safeParse(email);

  if (!emailResult.success || typeof password !== 'string') {
    return res.status(401).json({
      message: 'Invalid email or password'
    });
  }

  // Find admin account
  const admin = await Admin.findOne({
    email: emailResult.data
  }).select('+passwordHash');

  // Verify credentials
  if (
    !admin ||
    !(await bcrypt.compare(password, admin.passwordHash))
  ) {
    return res.status(401).json({
      message: 'Invalid email or password'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      name: admin.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );

  // Store JWT in HTTP-only cookie
  return res
    .cookie('mailflow_token', token, cookieOptions())
    .json({
      admin: {
        name: admin.name,
        email: admin.email
      }
    });
});

// Admin logout
router.post('/logout', (req, res) => {
  res.clearCookie('mailflow_token', {
    ...cookieOptions(),
    maxAge: undefined
  });

  return res.json({
    message: 'Logged out'
  });
});

// Get currently authenticated admin
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    admin: req.admin
  });
});

export default router;
