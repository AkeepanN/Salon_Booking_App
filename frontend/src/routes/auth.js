const bcrypt = require('bcryptjs');
const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');

const router = express.Router();
const userUploadRoot = path.join(__dirname, '..', '..', 'uploads', 'users');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(userUploadRoot, { recursive: true });

const uploadProfilePhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, userUploadRoot),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Date.now().toString(36)}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error('Only jpg, jpeg, png, and webp images are allowed');
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

function normalizePhone(phone) {
  const input = String(phone || '').trim();
  if (!input) {
    return '';
  }

  const hasPlus = input.startsWith('+');
  const digits = input.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    address: user.address || '',
    role: user.role,
    professional_type: user.professional_type,
    profilePhotoUrl: user.profilePhotoUrl,
  };
}

router.post('/signup', uploadProfilePhoto.single('profile_photo'), async (req, res, next) => {
  try {
    console.log('[AUTH] signup request', {
      role: req.body?.role,
      professional_type: req.body?.professional_type,
      phone: req.body?.phone,
      email: req.body?.email,
      hasProfilePhoto: Boolean(req.file),
    });

    const { name, phone, email, password, role, professional_type } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !normalizedPhone || !password || !['customer', 'barber'].includes(role)) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'name, phone, password, and valid role are required' });
    }

    if (role === 'barber' && !req.file) {
      return res.status(400).json({ message: 'Profile photo is required for barber signup' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      phone: normalizedPhone,
      email,
      passwordHash,
      role,
      professional_type: role === 'barber' ? (professional_type || 'barber') : 'barber',
      profilePhotoUrl: req.file ? `/uploads/users/${req.file.filename}` : '',
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('[AUTH] signup error', error.message);
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Phone or email already exists' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    console.log('[AUTH] login request', {
      phoneOrEmail: req.body?.phoneOrEmail,
    });

    const { phoneOrEmail, password } = req.body;
    const normalizedPhoneOrEmail = String(phoneOrEmail || '').includes('@')
      ? String(phoneOrEmail || '').trim().toLowerCase()
      : normalizePhone(phoneOrEmail);

    if (!normalizedPhoneOrEmail || !password) {
      return res.status(400).json({ message: 'phoneOrEmail and password are required' });
    }

    const user = await User.findOne({
      $or: [{ phone: normalizedPhoneOrEmail }, { email: normalizedPhoneOrEmail }],
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.active === false || ['blocked', 'inactive', 'deleted'].includes(user.status)) {
      return res.status(403).json({ message: user.status === 'blocked' ? 'Account is blocked' : 'Account is inactive' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('[AUTH] login error', error.message);
    next(error);
  }
});

module.exports = router;
