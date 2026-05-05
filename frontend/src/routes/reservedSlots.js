const express = require('express');
const BookingLock = require('../models/BookingLock');
const ReservedSlot = require('../models/ReservedSlot');
const Salon = require('../models/Salon');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.patch('/:id/cancel', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const reservedSlot = await ReservedSlot.findById(req.params.id);

    if (!reservedSlot) {
      return res.status(404).json({ message: 'Reserved slot not found' });
    }

    const salon = await Salon.findOne({ _id: reservedSlot.salon_id, owner_id: req.user._id });
    if (!salon) {
      return res.status(404).json({ message: 'Reserved slot not found' });
    }

    if (reservedSlot.status === 'cancelled') {
      return res.status(409).json({ message: 'This reserved slot is already cancelled' });
    }

    reservedSlot.status = 'cancelled';
    await reservedSlot.save();
    await BookingLock.deleteMany({ reserved_slot_id: reservedSlot._id });

    res.json({ message: 'Reserved slot cancelled', reservedSlot });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
