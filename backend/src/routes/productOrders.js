const express = require('express');
const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const Salon = require('../models/Salon');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

function populateOrders(query) {
  return query
    .populate('customer_id', 'name phone')
    .populate('barber_id', 'name phone')
    .populate('salon_id', 'name address phone')
    .populate('product_id', 'name price image category active');
}

router.post('/', auth, requireRole('customer'), async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!req.body.product_id || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Product and quantity are required' });
    }

    const product = await Product.findById(req.body.product_id);

    if (!product || !product.active) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(409).json({ message: 'Not enough stock available' });
    }

    if (product.salon_id) {
      const salon = await Salon.findOne({
        _id: product.salon_id,
        active: { $ne: false },
        $or: [{ status: 'active' }, { status: { $exists: false } }],
        approval_status: 'approved',
      });

      if (!salon) {
        return res.status(409).json({ message: 'This product is not available right now' });
      }
    }

    const order = await ProductOrder.create({
      customer_id: req.user._id,
      barber_id: product.barber_id,
      salon_id: product.salon_id || null,
      product_id: product._id,
      quantity,
      unit_price: product.price,
      total_amount: Number((product.price * quantity).toFixed(2)),
      status: 'pending',
      payment_status: 'unpaid',
    });

    const saved = await populateOrders(ProductOrder.findById(order._id));
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

router.get('/my', auth, requireRole('customer'), async (req, res, next) => {
  try {
    const orders = await populateOrders(
      ProductOrder.find({ customer_id: req.user._id }).sort({ createdAt: -1 })
    );

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get('/barber', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const orders = await populateOrders(
      ProductOrder.find({ barber_id: req.user._id }).sort({ createdAt: -1 })
    );

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { status, payment_status } = req.body;
    const order = await ProductOrder.findOne({ _id: req.params.id, barber_id: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const product = await Product.findOne({ _id: order.product_id, barber_id: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (payment_status !== undefined) {
      if (!['unpaid', 'paid'].includes(payment_status)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      order.payment_status = payment_status;
    }

    if (status !== undefined) {
      if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }

      if (order.status === 'completed') {
        return res.status(409).json({ message: 'Completed orders cannot be changed' });
      }

      if (order.status === 'cancelled' && status !== 'cancelled') {
        return res.status(409).json({ message: 'Cancelled orders cannot be changed' });
      }

      if (status === 'confirmed' && order.status !== 'confirmed') {
        if (!product.active) {
          return res.status(409).json({ message: 'This product is inactive' });
        }

        if (product.stock_quantity < order.quantity) {
          return res.status(409).json({ message: 'Not enough stock available to confirm this order' });
        }

        product.stock_quantity -= order.quantity;
      }

      if (status === 'cancelled' && order.status === 'confirmed') {
        product.stock_quantity += order.quantity;
      }

      if (status === 'completed' && order.status !== 'confirmed') {
        return res.status(409).json({ message: 'Only confirmed orders can be completed' });
      }

      order.status = status;
    }

    await product.save();
    await order.save();

    const saved = await populateOrders(ProductOrder.findById(order._id));
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
