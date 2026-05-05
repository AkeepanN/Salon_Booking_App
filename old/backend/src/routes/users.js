const express = require('express');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { cancelFutureConfirmedBookings } = require('../utils/bookingLifecycle');

const router = express.Router();

router.patch('/me/deactivate', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = false;
    user.status = 'inactive';
    await user.save();

    if (user.role === 'barber') {
      const salonIds = await Salon.find({ owner_id: user._id }).distinct('_id');
      await Salon.updateMany({ _id: { $in: salonIds } }, { active: false });
      await Service.updateMany({ salon_id: { $in: salonIds } }, { active: false });
      const cancelled = await cancelFutureConfirmedBookings(
        { salon_id: { $in: salonIds } },
        { role: 'barber', userId: user._id }
      );
      return res.json({ message: 'Account deactivated', cancelled_bookings: cancelled });
    }

    const cancelled = await cancelFutureConfirmedBookings(
      { customer_id: user._id },
      { role: 'customer', userId: user._id }
    );
    res.json({ message: 'Account deactivated', cancelled_bookings: cancelled });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
