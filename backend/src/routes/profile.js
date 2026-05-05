const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', '..', 'uploads', 'users');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(uploadRoot, { recursive: true });

const uploadProfilePhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadRoot),
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
    email: user.email || '',
    address: user.address || '',
    role: user.role,
    professional_type: user.professional_type || 'barber',
    profilePhotoUrl: user.profilePhotoUrl || '',
  };
}

async function deleteOldProfilePhoto(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/users/')) {
    return;
  }

  const filename = path.basename(imageUrl);
  const imagePath = path.resolve(uploadRoot, filename);
  const safeRoot = path.resolve(uploadRoot);

  if (!imagePath.startsWith(safeRoot)) {
    return;
  }

  try {
    await fs.promises.unlink(imagePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not delete old profile image', error.message);
    }
  }
}

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/me', auth, uploadProfilePhoto.single('profile_photo'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ message: 'User not found' });
    }

    const nextName = req.body.name !== undefined ? String(req.body.name).trim() : user.name;
    const nextPhone = req.body.phone !== undefined ? normalizePhone(req.body.phone) : user.phone;
    const nextEmail = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : user.email;
    const nextAddress = req.body.address !== undefined ? String(req.body.address).trim() : user.address;

    if (!nextName || !nextPhone) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const duplicateUser = await User.findOne({
      _id: { $ne: user._id },
      $or: [
        { phone: nextPhone },
        ...(nextEmail ? [{ email: nextEmail }] : []),
      ],
    });

    if (duplicateUser) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(409).json({ message: 'Phone or email already exists' });
    }

    user.name = nextName;
    user.phone = nextPhone;
    user.email = nextEmail || '';
    user.address = nextAddress || '';

    if (typeof req.body.profilePhotoUrl === 'string' && req.body.profilePhotoUrl.trim()) {
      user.profilePhotoUrl = req.body.profilePhotoUrl.trim();
    }

    if (req.file) {
      const oldImage = user.profilePhotoUrl;
      user.profilePhotoUrl = `/uploads/users/${req.file.filename}`;
      await deleteOldProfilePhoto(oldImage);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: publicUser(user),
    });
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Phone or email already exists' });
    }

    next(error);
  }
});

module.exports = router;
