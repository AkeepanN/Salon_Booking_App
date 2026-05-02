const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingLock = require('../models/BookingLock');
const Rating = require('../models/Rating');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const { auth, requireRole } = require('../middleware/auth');
const {
  autoCompleteExpiredBookings,
  bookingStartDate,
  cancelExpiredPendingPayments,
  cleanStaleBookingLocks,
  markBookingCancelled,
  markBookingCompleted,
  releaseBookingLocks,
} = require('../utils/bookingLifecycle');
const {
  addMinutes,
  fitsWorkingHours,
  getBlocks,
  isAlignedToInterval,
  isClosedDay,
  isDateString,
  isTimeString,
  toMinutes,
  toTime,
} = require('../utils/time');
const { buildBookingFeeSnapshot, ensureBookingFeeSnapshot } = require('../utils/bookingFees');
const {
  notifyBookingCancelled,
  notifyBookingConfirmed,
} = require('../utils/notifications');

const router = express.Router();

async function loadBookingContext({ salonId, serviceId }) {
  const [salon, service] = await Promise.all([
    Salon.findOne({
      _id: salonId,
      active: { $ne: false },
      $or: [{ status: 'active' }, { status: { $exists: false } }],
      approval_status: 'approved',
    }),
    Service.findOne({ _id: serviceId, salon_id: salonId }),
  ]);

  if (!salon) {
    const error = new Error('Salon not found');
    error.status = 404;
    throw error;
  }

  if (!service) {
    const error = new Error('Service not found for this salon');
    error.status = 404;
    throw error;
  }

  if (service.active === false) {
    const error = new Error('This service is not available for booking');
    error.status = 409;
    throw error;
  }

  return { salon, service };
}

router.get('/availability', async (req, res, next) => {
  try {
    await cancelExpiredPendingPayments();

    const { salon_id, service_id, date } = req.query;

    if (!salon_id || !service_id || !isDateString(date || '')) {
      return res.status(400).json({ message: 'Please choose a salon, service, and valid date.' });
    }

    const { salon, service } = await loadBookingContext({ salonId: salon_id, serviceId: service_id });
    const { open, close, slotIntervalMinutes, closedDays } = salon.workingHours;

    if (isClosedDay(date, closedDays)) {
      return res.json({ date, slots: [] });
    }

    await cleanStaleBookingLocks({ salon_id, date });

    const locks = await BookingLock.find({ salon_id, date }).select('block_start');
    const lockedBlocks = new Set(locks.map((lock) => lock.block_start));
    const slots = [];
    const start = toMinutes(open);
    const latestStart = toMinutes(close) - service.duration;
    const displayStepMinutes =
      service.duration >= slotIntervalMinutes && service.duration % slotIntervalMinutes === 0
        ? service.duration
        : slotIntervalMinutes;

    for (let cursor = start; cursor <= latestStart; cursor += displayStepMinutes) {
      const startTime = toTime(cursor);
      const endTime = addMinutes(startTime, service.duration);
      const neededBlocks = getBlocks(startTime, endTime, slotIntervalMinutes);
      const available = neededBlocks.every((block) => !lockedBlocks.has(block));

      if (available) {
        slots.push({ start_time: startTime, end_time: endTime });
      }
    }

    res.json({ date, slots });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, requireRole('customer'), async (req, res, next) => {
  try {
    const { salon_id, service_id, date, start_time } = req.body;

    if (!salon_id || !service_id || !isDateString(date || '') || !isTimeString(start_time || '')) {
      return res.status(400).json({ message: 'Please choose a salon, service, date, and time.' });
    }

    const { salon, service } = await loadBookingContext({ salonId: salon_id, serviceId: service_id });
    const { open, close, slotIntervalMinutes, closedDays } = salon.workingHours;
    const end_time = addMinutes(start_time, service.duration);
    const selectedStart = new Date(`${date}T${start_time}:00`);

    if (Number.isNaN(selectedStart.getTime()) || selectedStart < new Date()) {
      return res.status(400).json({ message: 'Cannot book a past time slot' });
    }

    if (isClosedDay(date, closedDays)) {
      return res.status(409).json({ message: 'This salon is closed on the selected date. Please choose another day.' });
    }

    if (!fitsWorkingHours({ startTime: start_time, endTime: end_time, open, close })) {
      return res.status(409).json({ message: 'This service does not fit within the salon working hours. Please choose another time.' });
    }

    if (!isAlignedToInterval({ startTime: start_time, open, intervalMinutes: slotIntervalMinutes })) {
      return res.status(400).json({ message: 'Please choose one of the available time slots shown in the app.' });
    }

    const displayStepMinutes =
      service.duration >= slotIntervalMinutes && service.duration % slotIntervalMinutes === 0
        ? service.duration
        : slotIntervalMinutes;

    if ((toMinutes(start_time) - toMinutes(open)) % displayStepMinutes !== 0) {
      return res.status(400).json({ message: 'Please choose one of the available time slots shown in the app.' });
    }

    const blocks = getBlocks(start_time, end_time, slotIntervalMinutes);
    const requestId = new mongoose.Types.ObjectId().toString();
    const lockDocs = blocks.map((block) => ({
      salon_id,
      date,
      block_start: block,
      request_id: requestId,
    }));

    let insertedLocks = [];

    try {
      insertedLocks = await BookingLock.insertMany(lockDocs, { ordered: true });
    } catch (error) {
      await BookingLock.deleteMany({ request_id: requestId });

      if (error.code === 11000 || error.writeErrors) {
        return res.status(409).json({ message: 'Sorry, that time was just booked by someone else. Please choose another slot.' });
      }

      throw error;
    }

    try {
      const feeSnapshot = await buildBookingFeeSnapshot(service.price);
      const booking = await Booking.create({
        customer_id: req.user._id,
        salon_id,
        service_id,
        date,
        start_time,
        end_time,
        status: 'confirmed',
        payment_status: 'unpaid',
        ...feeSnapshot,
      });

      await BookingLock.updateMany(
        { _id: { $in: insertedLocks.map((lock) => lock._id) } },
        { $set: { booking_id: booking._id }, $unset: { request_id: '' } }
      );

      await notifyBookingConfirmed({ booking, salon, service });
      res.status(201).json(booking);
    } catch (error) {
      await BookingLock.deleteMany({ _id: { $in: insertedLocks.map((lock) => lock._id) } });
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const filter =
      req.user.role === 'customer'
        ? { customer_id: req.user._id, is_deleted: { $ne: true } }
        : { is_deleted: { $ne: true } };

    if (req.user.role === 'barber') {
      const salons = await Salon.find({ owner_id: req.user._id }).select('_id');
      filter.salon_id = { $in: salons.map((salon) => salon._id) };
    }

    const bookings = await Booking.find(filter)
      .populate('salon_id', 'name address phone')
      .populate('service_id', 'name price duration')
      .populate('customer_id', 'name phone')
      .populate('cancelled_by_user', 'name phone role')
      .sort({ date: 1, start_time: 1 });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.get('/my', auth, requireRole('customer'), async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const bookings = await Booking.find({ customer_id: req.user._id, is_deleted: { $ne: true } })
      .populate('salon_id', 'name address phone')
      .populate('service_id', 'name price duration')
      .populate('cancelled_by_user', 'name phone role')
      .sort({ date: 1, start_time: 1 });

    const ratings = await Rating.find({
      booking_id: { $in: bookings.map((booking) => booking._id) },
      customer_id: req.user._id,
    }).select('booking_id rating comment');
    const ratingsByBooking = new Map(ratings.map((rating) => [String(rating.booking_id), rating]));

    res.json(bookings.map((booking) => {
      const data = booking.toObject();
      data.user_rating = ratingsByBooking.get(String(booking._id)) || null;
      return data;
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/salon/:salonId/daily', auth, requireRole('barber'), async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const salon = await Salon.findOne({ _id: req.params.salonId, owner_id: req.user._id });
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const bookings = await Booking.find({
      salon_id: req.params.salonId,
      date: req.query.date,
      status: { $ne: 'cancelled' },
      is_deleted: { $ne: true },
    })
      .populate('customer_id', 'name phone')
      .populate('service_id', 'name price duration')
      .sort({ start_time: 1 });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancel', auth, async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const booking = await Booking.findOne({
      _id: req.params.id,
      customer_id: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'completed') {
      return res.status(409).json({ message: 'Completed bookings cannot be cancelled' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ message: 'This booking is already cancelled' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(409).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    if (bookingStartDate(booking) <= new Date()) {
      return res.status(409).json({ message: 'Past bookings cannot be cancelled' });
    }

    await ensureBookingFeeSnapshot(booking);
    markBookingCancelled(booking, { role: 'customer', userId: req.user._id });
    await booking.save();
    await releaseBookingLocks(booking);
    await notifyBookingCancelled({ booking, cancelledByRole: 'customer' });

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/barber-cancel', auth, requireRole('barber'), async (req, res, next) => {
  try {
    await autoCompleteExpiredBookings();
    await cancelExpiredPendingPayments();

    const salonIds = await Salon.find({ owner_id: req.user._id }).distinct('_id');
    const booking = await Booking.findOne({
      _id: req.params.id,
      salon_id: { $in: salonIds },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'completed') {
      return res.status(409).json({ message: 'Completed bookings cannot be cancelled' });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({ message: 'This booking is already cancelled' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(409).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    if (bookingStartDate(booking) <= new Date()) {
      return res.status(409).json({ message: 'Past bookings cannot be cancelled' });
    }

    await ensureBookingFeeSnapshot(booking);
    markBookingCancelled(booking, { role: 'barber', userId: req.user._id });
    await booking.save();
    await releaseBookingLocks(booking);
    await notifyBookingCancelled({ booking, cancelledByRole: 'barber' });

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/complete', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salonIds = await Salon.find({ owner_id: req.user._id }).distinct('_id');
    const booking = await Booking.findOne({
      _id: req.params.id,
      salon_id: { $in: salonIds },
      status: 'confirmed',
    });

    if (!booking) {
      return res.status(404).json({ message: 'Confirmed booking not found' });
    }

    markBookingCompleted(booking);
    await booking.save();

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
