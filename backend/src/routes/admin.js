const express = require('express');
const Booking = require('../models/Booking');
const Rating = require('../models/Rating');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Setting = require('../models/Setting');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const {
  autoCompleteExpiredBookings,
  cancelExpiredPendingPayments,
  markBookingCancelled,
  markBookingCompleted,
  releaseBookingLocks,
} = require('../utils/bookingLifecycle');
const {
  BOOKING_FEE_KEY,
  CANCELLATION_CHARGE_KEY,
  COMMISSION_KEY,
  calculateBookingFees,
  ensureBookingFeeSnapshot,
  getBookingFeePercentage,
  getPaymentRules,
} = require('../utils/bookingFees');
const { buildEarningsReport } = require('../utils/earningsReport');
const { notifyBookingCancelled } = require('../utils/notifications');
const { cancellationAmounts } = require('../utils/paymentCalculations');

const router = express.Router();

router.use(auth, requireRole('admin'));

async function updateSalonState(salonId, updates, message) {
  const salon = await Salon.findByIdAndUpdate(
    salonId,
    updates,
    { new: true, runValidators: true }
  ).populate('owner_id', 'name phone');

  if (!salon) {
    return null;
  }

  return { message, salon };
}

router.get('/settings/booking-fee', async (req, res, next) => {
  try {
    const bookingFeePercentage = await getBookingFeePercentage();

    res.json({
      booking_fee_percentage: bookingFeePercentage,
      example: calculateBookingFees(1000, bookingFeePercentage),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/settings/booking-fee', async (req, res, next) => {
  try {
    const percentage = Number(req.body.booking_fee_percentage);

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return res.status(400).json({ message: 'Booking fee percentage must be a number from 0 to 100' });
    }

    await Setting.findOneAndUpdate(
      { key: BOOKING_FEE_KEY },
      { value: percentage },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      booking_fee_percentage: percentage,
      example: calculateBookingFees(1000, percentage),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/settings/payment-rules', async (req, res, next) => {
  try {
    const rules = await getPaymentRules();

    res.json({
      ...rules,
      example: calculateBookingFees(
        1000,
        rules.booking_fee_percentage,
        rules.cancellation_charge_percentage,
        rules.commission_percentage
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/settings/payment-rules', async (req, res, next) => {
  try {
    const bookingFeePercentage = Number(req.body.booking_fee_percentage);
    const cancellationChargePercentage = Number(req.body.cancellation_charge_percentage);
    const commissionPercentage = Number(req.body.commission_percentage ?? 0);

    if (!Number.isFinite(bookingFeePercentage) || bookingFeePercentage < 0 || bookingFeePercentage > 100) {
      return res.status(400).json({ message: 'Booking fee percentage must be a number from 0 to 100' });
    }

    if (!Number.isFinite(cancellationChargePercentage) || cancellationChargePercentage < 0 || cancellationChargePercentage > 100) {
      return res.status(400).json({ message: 'Cancellation charge percentage must be a number from 0 to 100' });
    }

    if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({ message: 'Commission percentage must be a number from 0 to 100' });
    }

    await Promise.all([
      Setting.findOneAndUpdate(
        { key: BOOKING_FEE_KEY },
        { value: bookingFeePercentage },
        { upsert: true, new: true, runValidators: true }
      ),
      Setting.findOneAndUpdate(
        { key: CANCELLATION_CHARGE_KEY },
        { value: cancellationChargePercentage },
        { upsert: true, new: true, runValidators: true }
      ),
      Setting.findOneAndUpdate(
        { key: COMMISSION_KEY },
        { value: commissionPercentage },
        { upsert: true, new: true, runValidators: true }
      ),
    ]);

    res.json({
      booking_fee_percentage: bookingFeePercentage,
      cancellation_charge_percentage: cancellationChargePercentage,
      commission_percentage: commissionPercentage,
      example: calculateBookingFees(1000, bookingFeePercentage, cancellationChargePercentage, commissionPercentage),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/business-summary', async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const now = new Date();
    const filter = { is_deleted: { $ne: true } };
    const range = req.query.range || 'this_month';

    if (req.query.start_date && req.query.end_date) {
      filter.date = { $gte: req.query.start_date, $lte: req.query.end_date };
    } else if (range === 'today') {
      const today = now.toISOString().slice(0, 10);
      filter.date = today;
    } else if (range === 'this_week') {
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
      filter.date = { $gte: weekStart.toISOString().slice(0, 10), $lte: now.toISOString().slice(0, 10) };
    } else {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      filter.date = { $gte: monthStart, $lte: now.toISOString().slice(0, 10) };
    }

    const bookings = await Booking.find(filter).select(
      'status payment_status payment_amount booking_fee_amount customer_charged_amount cancellation_charge_amount admin_commission_amount commission_amount platform_commission_amount'
    );
    const paidBookings = bookings.filter((booking) => ['paid'].includes(booking.payment_status));
    const revenueBookings = bookings.filter((booking) => ['confirmed', 'completed'].includes(booking.status));

    res.json({
      total_revenue: Number(
        revenueBookings.reduce((sum, booking) => sum + Number(booking.booking_fee_amount || booking.payment_amount || 0), 0).toFixed(2)
      ),
      total_commission_earned: Number(
        revenueBookings.reduce((sum, booking) => sum + Number(booking.admin_commission_amount ?? booking.platform_commission_amount ?? booking.commission_amount ?? 0), 0).toFixed(2)
      ),
      total_bookings: bookings.length,
      paid_bookings: paidBookings.length,
      cancelled_bookings: bookings.filter((booking) => booking.status === 'cancelled').length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/earnings', async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    res.json(await buildEarningsReport({
      query: req.query,
      includeBarber: true,
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name phone email role active status createdAt')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.active === 'boolean') {
      updates.active = req.body.active;
      updates.status = req.body.active ? 'active' : 'blocked';
    }

    if (['active', 'blocked', 'inactive', 'deleted'].includes(req.body.status)) {
      updates.status = req.body.status;
      updates.active = req.body.status === 'active';
      if (req.body.status === 'blocked') {
        updates.blocked_at = new Date();
        updates.blocked_by = req.user._id;
      }
      if (req.body.status === 'deleted') {
        updates.deleted_at = new Date();
        updates.deleted_by = req.user._id;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('name phone email role active status createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/salons', async (req, res, next) => {
  try {
    const salons = await Salon.find()
      .populate('owner_id', 'name phone')
      .sort({ createdAt: -1 });
    const ratingRows = await Rating.aggregate([
      { $match: { salon_id: { $in: salons.map((salon) => salon._id) } } },
      {
        $group: {
          _id: '$salon_id',
          average_rating: { $avg: '$rating' },
          rating_count: { $sum: 1 },
        },
      },
    ]);
    const ratingsBySalon = new Map(ratingRows.map((row) => [String(row._id), row]));

    res.json(salons.map((salon) => {
      const data = salon.toObject();
      const rating = ratingsBySalon.get(String(salon._id));
      return {
        ...data,
        average_rating: rating ? Number(rating.average_rating.toFixed(1)) : 0,
        rating_count: rating?.rating_count || 0,
      };
    }));
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:id', async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.active === 'boolean') {
      updates.active = req.body.active;
    }

    if (['active', 'blocked', 'deleted'].includes(req.body.status)) {
      updates.status = req.body.status;
      updates.active = req.body.status === 'active';
      if (req.body.status === 'blocked') {
        updates.blocked_at = new Date();
        updates.blocked_by = req.user._id;
      }
      if (req.body.status === 'deleted') {
        updates.deleted_at = new Date();
        updates.deleted_by = req.user._id;
      }
    }

    if (['pending', 'approved', 'rejected'].includes(req.body.approval_status)) {
      updates.approval_status = req.body.approval_status;
    }

    const salon = await Salon.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('owner_id', 'name phone');

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(salon);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/approve', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      { approval_status: 'approved', status: 'active', active: true },
      'Salon approved'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/reject', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      { approval_status: 'rejected', status: 'active', active: true },
      'Salon rejected'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/block', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      {
        status: 'blocked',
        active: false,
        blocked_at: new Date(),
        blocked_by: req.user._id,
      },
      'Salon blocked'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/unblock', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      { status: 'active', active: true, blocked_at: undefined, blocked_by: undefined },
      'Salon unblocked'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/delete', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      {
        status: 'deleted',
        active: false,
        deleted_at: new Date(),
        deleted_by: req.user._id,
      },
      'Salon deleted'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/salons/:salonId/reactivate', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.salonId,
      { status: 'active', active: true, deleted_at: undefined, deleted_by: undefined },
      'Salon reactivated'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/salons/:id', async (req, res, next) => {
  try {
    const result = await updateSalonState(
      req.params.id,
      {
        status: 'deleted',
        active: false,
        deleted_at: new Date(),
        deleted_by: req.user._id,
      },
      'Salon deleted'
    );

    if (!result) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/bookings', async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const filter = { is_deleted: { $ne: true } };

    if (req.query.date) {
      filter.date = req.query.date;
    }

    if (req.query.salon_id) {
      filter.salon_id = req.query.salon_id;
    }

    if (['confirmed', 'cancelled', 'completed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate('salon_id', 'name address')
      .populate('service_id', 'name')
      .populate('customer_id', 'name phone')
      .populate('cancelled_by_user', 'name phone role')
      .sort({ date: -1, start_time: 1 });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.patch('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.body.status === 'cancelled') {
      await ensureBookingFeeSnapshot(booking);
      markBookingCancelled(booking, {
        role: 'admin',
        userId: req.user._id,
        chargeCancellationFee: req.body.chargeCancellationFee !== false,
      });
      await booking.save();
      await releaseBookingLocks(booking);
      await notifyBookingCancelled({ booking, cancelledByRole: 'admin' });
    } else if (req.body.status === 'completed') {
      markBookingCompleted(booking);
      await booking.save();
    } else if (req.body.status === 'confirmed') {
      booking.status = req.body.status;
      await booking.save();
    } else {
      return res.status(400).json({ message: 'Valid booking status is required' });
    }

    const updated = await Booking.findById(booking._id)
      .populate('salon_id', 'name address')
      .populate('service_id', 'name')
      .populate('customer_id', 'name phone')
      .populate('cancelled_by_user', 'name phone role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/bookings/clear-by-status', async (req, res, next) => {
  try {
    const { status, confirmText } = req.body;
    const expectedText = {
      completed: 'CLEAR COMPLETED',
      cancelled: 'CLEAR CANCELLED',
    }[status];

    if (!expectedText) {
      return res.status(400).json({ message: 'Status must be completed or cancelled' });
    }

    if (confirmText !== expectedText) {
      return res.status(400).json({ message: `Type ${expectedText} to confirm` });
    }

    const result = await Booking.updateMany(
      {
        status,
        is_deleted: { $ne: true },
      },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: req.user._id,
          deleted_reason: status === 'completed' ? 'admin_clear_completed' : 'admin_clear_cancelled',
        },
      }
    );

    res.json({
      message: `${status === 'completed' ? 'Completed' : 'Cancelled'} bookings cleared from active lists`,
      matched: result.matchedCount || 0,
      modified: result.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/bookings/:bookingId/cancellation-charge', async (req, res, next) => {
  try {
    if (typeof req.body.charge !== 'boolean') {
      return res.status(400).json({ message: 'charge must be true or false' });
    }

    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'cancelled') {
      return res.status(409).json({ message: 'Only cancelled bookings can be updated' });
    }

    if (req.body.charge && booking.cancelled_by_role === 'barber') {
      return res.status(409).json({ message: 'Cancellation fee cannot be charged when the barber cancelled the booking' });
    }

    booking.cancellation_charge_waived = !req.body.charge;
    booking.cancellation_charge_decided_by = req.user._id;
    booking.cancellation_charge_decided_at = new Date();

    await ensureBookingFeeSnapshot(booking);
    const amounts = cancellationAmounts(booking, { charge: req.body.charge });
    booking.cancellation_charge_amount = amounts.cancellation_charge_amount;
    booking.customer_charged_amount = amounts.customer_charged_amount;
    booking.admin_commission_amount = amounts.admin_commission_amount;
    booking.commission_amount = amounts.commission_amount;
    booking.platform_commission_amount = amounts.platform_commission_amount;
    booking.barber_earning_amount = amounts.barber_earning_amount;
    booking.cancellation_status = amounts.cancellation_status;

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('salon_id', 'name address')
      .populate('service_id', 'name')
      .populate('customer_id', 'name phone')
      .populate('cancelled_by_user', 'name phone role')
      .populate('cancellation_charge_decided_by', 'name phone role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
