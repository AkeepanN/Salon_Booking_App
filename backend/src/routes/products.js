const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const Salon = require('../models/Salon');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', '..', 'uploads', 'products');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(uploadRoot, { recursive: true });

const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadRoot),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${new mongoose.Types.ObjectId()}${extension}`);
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

async function deleteOldProductImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) {
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
      console.warn('Could not delete old product image', error.message);
    }
  }
}

function normalizeProduct(product) {
  return product;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function validateOwnedSalon(barberId, salonId) {
  if (!salonId) {
    return null;
  }

  return Salon.findOne({
    _id: salonId,
    owner_id: barberId,
    active: { $ne: false },
    $or: [{ status: 'active' }, { status: { $exists: false } }],
  });
}

function parseMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function parseQuantity(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

router.get('/', async (req, res, next) => {
  try {
    const query = {
      active: true,
      stock_quantity: { $gt: 0 },
    };

    if (req.query.salon_id) {
      query.salon_id = req.query.salon_id;
    }

    if (req.query.search?.trim()) {
      const pattern = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { name: pattern },
        { brand: pattern },
        { category: pattern },
      ];
    }

    const products = await Product.find(query)
      .populate('barber_id', 'name phone')
      .populate('salon_id', 'name address phone latitude longitude active status approval_status')
      .sort({ createdAt: -1 })
      .lean();

    const activeProducts = products.filter((product) => {
      if (!product.salon_id) {
        return true;
      }

      return product.salon_id.active !== false &&
        !['blocked', 'deleted'].includes(product.salon_id.status) &&
        product.salon_id.approval_status !== 'rejected';
    });

    let response = activeProducts.map(normalizeProduct);
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      response = response.map((product) => {
        if (!product.salon_id?.latitude || !product.salon_id?.longitude) {
          return { ...product, distance_km: null };
        }

        return {
          ...product,
          distance_km: Number(
            distanceKm(lat, lng, Number(product.salon_id.latitude), Number(product.salon_id.longitude)).toFixed(2)
          ),
        };
      });
    }

    if (req.query.sort === 'distance' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      response.sort((a, b) => {
        if (a.distance_km == null && b.distance_km == null) {
          return 0;
        }

        if (a.distance_km == null) {
          return 1;
        }

        if (b.distance_km == null) {
          return -1;
        }

        return a.distance_km - b.distance_km;
      });
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const products = await Product.find({ barber_id: req.user._id })
      .populate('salon_id', 'name address phone')
      .sort({ createdAt: -1 });

    res.json(products.map(normalizeProduct));
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, requireRole('barber'), uploadProductImage.single('image'), async (req, res, next) => {
  try {
    const {
      salon_id,
      name,
      brand,
      description,
      price,
      stock_quantity,
      category,
      active,
    } = req.body;

    const parsedPrice = parseMoney(price);
    const parsedStock = parseQuantity(stock_quantity);

    if (!name?.trim() || !brand?.trim() || Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'Product name, brand, price, and stock quantity are required' });
    }

    if (parsedPrice < 0) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'Price must be 0 or more' });
    }

    if (parsedStock < 0) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ message: 'Stock quantity must be 0 or more' });
    }

    const salon = await validateOwnedSalon(req.user._id, salon_id);
    if (salon_id && !salon) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ message: 'Salon not found' });
    }

    const product = await Product.create({
      barber_id: req.user._id,
      salon_id: salon ? salon._id : null,
      name: name.trim(),
      brand: brand.trim(),
      description: description?.trim() || '',
      price: parsedPrice,
      stock_quantity: parsedStock,
      image: req.file ? `/uploads/products/${req.file.filename}` : '',
      category: category?.trim() || 'General',
      active: active !== undefined ? active !== 'false' && active !== false : true,
    });

    const saved = await Product.findById(product._id)
      .populate('barber_id', 'name phone')
      .populate('salon_id', 'name address phone');

    res.status(201).json(saved);
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});

router.patch('/:id', auth, requireRole('barber'), uploadProductImage.single('image'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, barber_id: req.user._id });

    if (!product) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.body.salon_id !== undefined) {
      const salon = await validateOwnedSalon(req.user._id, req.body.salon_id);

      if (req.body.salon_id && !salon) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        return res.status(404).json({ message: 'Salon not found' });
      }

      product.salon_id = salon ? salon._id : null;
    }

    if (req.body.name !== undefined) {
      if (!req.body.name.trim()) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({ message: 'Product name is required' });
      }
      product.name = req.body.name.trim();
    }

    if (req.body.brand !== undefined) {
      if (!req.body.brand.trim()) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({ message: 'Product brand is required' });
      }
      product.brand = req.body.brand.trim();
    }

    if (req.body.description !== undefined) {
      product.description = req.body.description.trim();
    }

    if (req.body.category !== undefined) {
      product.category = req.body.category.trim() || 'General';
    }

    if (req.body.price !== undefined) {
      const parsedPrice = parseMoney(req.body.price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({ message: 'Price must be 0 or more' });
      }
      product.price = parsedPrice;
    }

    if (req.body.stock_quantity !== undefined) {
      const parsedStock = parseQuantity(req.body.stock_quantity);
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({ message: 'Stock quantity must be 0 or more' });
      }
      product.stock_quantity = parsedStock;
    }

    if (req.body.active !== undefined) {
      product.active = req.body.active === true || req.body.active === 'true';
    }

    if (req.file) {
      const oldImage = product.image;
      product.image = `/uploads/products/${req.file.filename}`;
      await deleteOldProductImage(oldImage);
    }

    await product.save();

    const saved = await Product.findById(product._id)
      .populate('barber_id', 'name phone')
      .populate('salon_id', 'name address phone');

    res.json(saved);
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});

router.delete('/:id', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, barber_id: req.user._id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.active = false;
    await product.save();

    res.json({ message: 'Product deactivated', product });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, active: true, stock_quantity: { $gt: 0 } })
      .populate('barber_id', 'name phone')
      .populate('salon_id', 'name address phone');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
