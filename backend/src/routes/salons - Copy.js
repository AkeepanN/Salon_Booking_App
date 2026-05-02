const express = require('express');
const Salon = require('../models/Salon');
const { auth, requireRole } = require('../middleware/auth');
const { isTimeString, toMinutes } = require('../utils/time');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const query = {};

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const salons = await Salon.find(query)
      .select('name address phone workingHours')
      .sort({ name: 1 })
      .limit(50);

    res.json(salons);
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { name, address, phone, workingHours } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({ message: 'name, address, and phone are required' });
    }

    if (workingHours?.open && workingHours?.close && toMinutes(workingHours.open) >= toMinutes(workingHours.close)) {
      return res.status(400).json({ message: 'Close time must be after open time' });
    }

    const salon = await Salon.create({
      owner_id: req.user._id,
      name,
      address,
      phone,
      workingHours,
    });

    res.status(201).json(salon);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/working-hours', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const workingHours = req.body.workingHours;

    if (!workingHours?.open || !workingHours?.close || !workingHours?.slotIntervalMinutes) {
      return res.status(400).json({ message: 'Open time, close time, and slot interval are required' });
    }

    if (!isTimeString(workingHours.open) || !isTimeString(workingHours.close)) {
      return res.status(400).json({ message: 'Open and close times must use HH:mm format' });
    }

    if (toMinutes(workingHours.open) >= toMinutes(workingHours.close)) {
      return res.status(400).json({ message: 'Close time must be after open time' });
    }

    const salon = await Salon.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user._id },
      { workingHours },
      { new: true, runValidators: true }
    );

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(salon);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salons = await Salon.find({ owner_id: req.user._id }).sort({ createdAt: -1 });
    res.json(salons);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
