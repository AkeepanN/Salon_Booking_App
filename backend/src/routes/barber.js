const express = require('express');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const { auth, requireRole } = require('../middleware/auth');
const { buildEarningsReport } = require('../utils/earningsReport');

const router = express.Router();

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function earningValue(booking) {
  return Number(booking.barber_earning_amount || 0);
}

function rangeFilter(range) {
  const now = new Date();
  const today = dateString(now);

  if (range === 'week') {
    return { $gte: dateString(startOfWeek(now)), $lte: today };
  }

  if (range === 'month') {
    return { $gte: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, $lte: today };
  }

  return today;
}

function isEarningBooking(booking) {
  if (booking.status === 'completed') {
    return true;
  }

  if (booking.status === 'cancelled') {
    return Number(booking.cancellation_charge_amount || 0) > 0;
  }

  return booking.status === 'confirmed' && booking.payment_status === 'paid';
}

router.get('/insights', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salonIds = await Salon.find({ owner_id: req.user._id }).distinct('_id');
    const today = dateString(new Date());
    const weekStart = dateString(startOfWeek(new Date()));
    const activeStatuses = ['confirmed', 'completed'];

    const bookings = await Booking.find({
      salon_id: { $in: salonIds },
    }).populate('service_id', 'name');

    const todayBookings = bookings.filter((booking) => (
      booking.date === today && activeStatuses.includes(booking.status)
    ));
    const weekBookings = bookings.filter((booking) => (
      booking.date >= weekStart && booking.date <= today && activeStatuses.includes(booking.status)
    ));
    const nonCancelledBookings = bookings.filter((booking) => booking.status !== 'cancelled');
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled');
    const serviceCounts = new Map();
    const hourCounts = new Map();

    bookings
      .filter((booking) => activeStatuses.includes(booking.status))
      .forEach((booking) => {
        const serviceName = booking.service_id?.name || 'Service';
        serviceCounts.set(serviceName, (serviceCounts.get(serviceName) || 0) + 1);
        const hour = (booking.start_time || '').slice(0, 2);
        if (hour) {
          hourCounts.set(`${hour}:00`, (hourCounts.get(`${hour}:00`) || 0) + 1);
        }
      });

    const mostPopularService = [...serviceCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0];
    const peakHours = [...hourCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour, count }));
    const totalForCancelRate = nonCancelledBookings.length + cancelledBookings.length;

    res.json({
      today_booking_count: todayBookings.length,
      today_earnings: Number(todayBookings.reduce((sum, booking) => sum + earningValue(booking), 0).toFixed(2)),
      this_week_booking_count: weekBookings.length,
      this_week_earnings: Number(weekBookings.reduce((sum, booking) => sum + earningValue(booking), 0).toFixed(2)),
      most_popular_service: mostPopularService ? mostPopularService[0] : 'No bookings yet',
      cancel_rate_percentage: totalForCancelRate
        ? Number(((cancelledBookings.length / totalForCancelRate) * 100).toFixed(1))
        : 0,
      peak_hours: peakHours,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/earnings', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salonIds = await Salon.find({ owner_id: req.user._id }).distinct('_id');
    res.json(await buildEarningsReport({
      filter: { salon_id: { $in: salonIds } },
      query: req.query,
    }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
