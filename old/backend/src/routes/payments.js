const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingLock = require('../models/BookingLock');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const { auth, requireRole } = require('../middleware/auth');
const {
  cancelExpiredPendingPayments,
  markBookingCancelled,
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
} = require('../utils/time');
const { buildBookingFeeSnapshot } = require('../utils/bookingFees');
const {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyPaymentSuccess,
} = require('../utils/notifications');

const router = express.Router();

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex').toUpperCase();
}

function merchantSecretHash() {
  return md5(process.env.PAYHERE_MERCHANT_SECRET || '');
}

function payhereCheckoutUrl() {
  return process.env.PAYHERE_SANDBOX === 'false'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';
}

function frontendUrl(path) {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

function backendPublicUrl(path) {
  const base = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
  return `${base}${path}`;
}

function paymentHash({ merchantId, orderId, amount, currency }) {
  return md5(`${merchantId}${orderId}${amount}${currency}${merchantSecretHash()}`);
}

function notifyHash({ merchantId, orderId, amount, currency, statusCode }) {
  return md5(`${merchantId}${orderId}${amount}${currency}${statusCode}${merchantSecretHash()}`);
}

async function loadBookingContext({ salonId, serviceId }) {
  const [salon, service] = await Promise.all([
    Salon.findOne({
      _id: salonId,
      active: { $ne: false },
      status: { $nin: ['blocked', 'deleted'] },
      approval_status: { $ne: 'rejected' },
    }),
    Service.findOne({ _id: serviceId, salon_id: salonId, active: { $ne: false } }),
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

  return { salon, service };
}

async function createPendingBookingWithLocks({ user, salonId, serviceId, date, startTime }) {
  const { salon, service } = await loadBookingContext({ salonId, serviceId });
  const { open, close, slotIntervalMinutes, closedDays } = salon.workingHours;
  const endTime = addMinutes(startTime, service.duration);
  const selectedStart = new Date(`${date}T${startTime}:00`);

  if (Number.isNaN(selectedStart.getTime()) || selectedStart < new Date()) {
    const error = new Error('Cannot book a past time slot');
    error.status = 400;
    throw error;
  }

  if (isClosedDay(date, closedDays)) {
    const error = new Error('This salon is closed on the selected date. Please choose another day.');
    error.status = 409;
    throw error;
  }

  if (!fitsWorkingHours({ startTime, endTime, open, close })) {
    const error = new Error('This service does not fit within the salon working hours. Please choose another time.');
    error.status = 409;
    throw error;
  }

  if (!isAlignedToInterval({ startTime, open, intervalMinutes: slotIntervalMinutes })) {
    const error = new Error('Please choose one of the available time slots shown in the app.');
    error.status = 400;
    throw error;
  }

  const displayStepMinutes =
    service.duration >= slotIntervalMinutes && service.duration % slotIntervalMinutes === 0
      ? service.duration
      : slotIntervalMinutes;

  if ((toMinutes(startTime) - toMinutes(open)) % displayStepMinutes !== 0) {
    const error = new Error('Please choose one of the available time slots shown in the app.');
    error.status = 400;
    throw error;
  }

  const blocks = getBlocks(startTime, endTime, slotIntervalMinutes);
  const requestId = new mongoose.Types.ObjectId().toString();
  const lockDocs = blocks.map((block) => ({
    salon_id: salonId,
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
      const conflict = new Error('Sorry, that time was just booked or reserved. Please choose another slot.');
      conflict.status = 409;
      throw conflict;
    }

    throw error;
  }

  try {
    const feeSnapshot = await buildBookingFeeSnapshot(service.price);
    const booking = await Booking.create({
      customer_id: user._id,
      salon_id: salonId,
      service_id: serviceId,
      date,
      start_time: startTime,
      end_time: endTime,
      status: 'pending_payment',
      payment_status: 'pending',
      payment_currency: 'LKR',
      ...feeSnapshot,
    });

    await BookingLock.updateMany(
      { _id: { $in: insertedLocks.map((lock) => lock._id) } },
      { $set: { booking_id: booking._id }, $unset: { request_id: '' } }
    );

    return { booking, salon, service };
  } catch (error) {
    await BookingLock.deleteMany({ _id: { $in: insertedLocks.map((lock) => lock._id) } });
    throw error;
  }
}

router.post('/payhere/create-booking', auth, requireRole('customer'), async (req, res, next) => {
  try {
    await cancelExpiredPendingPayments();

    const { salon_id, service_id, date, start_time } = req.body;

    if (!salon_id || !service_id || !isDateString(date || '') || !isTimeString(start_time || '')) {
      return res.status(400).json({ message: 'Please choose a salon, service, date, and time.' });
    }

    if (!process.env.PAYHERE_MERCHANT_ID || !process.env.PAYHERE_MERCHANT_SECRET) {
      return res.status(500).json({ message: 'PayHere is not configured on the server.' });
    }

    const { booking, salon, service } = await createPendingBookingWithLocks({
      user: req.user,
      salonId: salon_id,
      serviceId: service_id,
      date,
      startTime: start_time,
    });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const orderId = `BOOKING_${booking._id}_${Date.now()}`;
    const amount = Number(booking.payment_amount || booking.booking_fee_amount || service.price).toFixed(2);
    const currency = 'LKR';
    const nameParts = (req.user.name || 'Customer').trim().split(/\s+/);

    booking.payment_order_id = orderId;
    booking.payment_amount = Number(amount);
    booking.payment_currency = currency;
    await booking.save();

    res.status(201).json({
      booking_id: booking._id,
      checkout_url: payhereCheckoutUrl(),
      merchant_id: merchantId,
      return_url: frontendUrl(`/payment-return?booking_id=${booking._id}`),
      cancel_url: frontendUrl(`/payment-cancelled?booking_id=${booking._id}`),
      notify_url: backendPublicUrl('/api/payments/payhere/notify'),
      order_id: orderId,
      items: `${salon.name} - ${service.name}`,
      amount,
      currency,
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || ' ',
      email: req.user.email || 'customer@example.com',
      phone: req.user.phone,
      address: salon.address || 'Sri Lanka',
      city: 'Colombo',
      country: 'Sri Lanka',
      hash: paymentHash({ merchantId, orderId, amount, currency }),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/payhere/notify', express.urlencoded({ extended: false }), async (req, res, next) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
    } = req.body;

    const expectedSig = notifyHash({
      merchantId: merchant_id,
      orderId: order_id,
      amount: payhere_amount,
      currency: payhere_currency,
      statusCode: status_code,
    });

    if (!md5sig || md5sig.toUpperCase() !== expectedSig) {
      return res.status(400).send('Invalid signature');
    }

    const booking = await Booking.findOne({ payment_order_id: order_id });
    if (!booking) {
      return res.status(200).send('Booking not found');
    }

    booking.payment_id = payment_id;
    booking.payment_method = method;
    booking.payment_amount = Number(payhere_amount);
    booking.payment_currency = payhere_currency;

    if (status_code === '2') {
      booking.status = 'confirmed';
      booking.payment_status = 'paid';
      booking.payment_verified_at = new Date();
      await booking.save();
      const [salon, service] = await Promise.all([
        Salon.findById(booking.salon_id),
        Service.findById(booking.service_id),
      ]);
      await notifyPaymentSuccess({ booking });
      await notifyBookingConfirmed({ booking, salon, service });
    } else if (status_code === '0') {
      await booking.save();
    } else if (['-1', '-2', '-3'].includes(status_code)) {
      markBookingCancelled(booking, { role: 'payment' });
      booking.payment_status =
        status_code === '-1' ? 'cancelled' : status_code === '-3' ? 'refunded' : 'failed';
      await booking.save();
      await releaseBookingLocks(booking);
      await notifyBookingCancelled({ booking, cancelledByRole: 'payment' });
    }

    res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
});

router.get('/status/:bookingId', auth, async (req, res, next) => {
  try {
    await cancelExpiredPendingPayments();

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isCustomer = String(booking.customer_id) === String(req.user._id);
    let isSalonOwner = false;

    if (req.user.role === 'barber') {
      isSalonOwner = Boolean(await Salon.exists({ _id: booking.salon_id, owner_id: req.user._id }));
    }

    if (!isCustomer && !isSalonOwner) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      booking_id: booking._id,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_amount: booking.payment_amount,
      payment_currency: booking.payment_currency,
      payment_method: booking.payment_method,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/dev/mark-paid/:bookingId', auth, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.PAYHERE_SANDBOX === 'false') {
      return res.status(404).json({ message: 'Not found' });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      customer_id: req.user._id,
      status: 'pending_payment',
    });

    if (!booking) {
      return res.status(404).json({ message: 'Pending payment booking not found' });
    }

    booking.status = 'confirmed';
    booking.payment_status = 'paid';
    booking.payment_id = `DEV_${Date.now()}`;
    booking.payment_method = 'dev';
    booking.payment_verified_at = new Date();
    await booking.save();
    await notifyPaymentSuccess({ booking });

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
