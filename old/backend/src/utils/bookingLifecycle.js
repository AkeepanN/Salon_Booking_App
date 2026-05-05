const Booking = require('../models/Booking');
const BookingLock = require('../models/BookingLock');
const ReservedSlot = require('../models/ReservedSlot');
const Salon = require('../models/Salon');
const { cancellationAmounts, completionAmounts } = require('./paymentCalculations');

function bookingEndDate(booking) {
  return new Date(`${booking.date}T${booking.end_time}:00`);
}

function bookingStartDate(booking) {
  return new Date(`${booking.date}T${booking.start_time}:00`);
}

function markBookingCompleted(booking) {
  const amounts = completionAmounts(booking);

  booking.status = 'completed';
  booking.completed_at = booking.completed_at || new Date();
  booking.commission_amount = amounts.commission_amount;
  booking.admin_commission_amount = amounts.admin_commission_amount;
  booking.platform_commission_amount = amounts.platform_commission_amount;
  booking.barber_earning_amount = amounts.barber_earning_amount;
}

async function autoCompleteExpiredBookings() {
  const now = new Date();
  const confirmedBookings = await Booking.find({ status: 'confirmed' }).select('date end_time');
  const expiredIds = confirmedBookings
    .filter((booking) => {
      const endDate = bookingEndDate(booking);
      return !Number.isNaN(endDate.getTime()) && endDate < now;
    })
    .map((booking) => booking._id);

  if (expiredIds.length === 0) {
    return { matched: 0, modified: 0 };
  }

  const expiredBookings = await Booking.find({ _id: { $in: expiredIds }, status: 'confirmed' });
  for (const booking of expiredBookings) {
    markBookingCompleted(booking);
    await booking.save();
  }
  await BookingLock.deleteMany({ booking_id: { $in: expiredIds } });

  return {
    matched: expiredBookings.length,
    modified: expiredBookings.length,
  };
}

async function cleanStaleBookingLocks(filter = {}) {
  const locks = await BookingLock.find(filter)
    .select('booking_id reserved_slot_id request_id createdAt')
    .lean();

  const bookingIds = locks
    .filter((lock) => lock.booking_id)
    .map((lock) => lock.booking_id);
  const reservedSlotIds = locks
    .filter((lock) => lock.reserved_slot_id)
    .map((lock) => lock.reserved_slot_id);

  const [activeBookingIds, activeReservedSlotIds] = await Promise.all([
    bookingIds.length
      ? Booking.find({
          _id: { $in: bookingIds },
          status: { $in: ['confirmed', 'pending_payment'] },
        }).distinct('_id')
      : [],
    reservedSlotIds.length
      ? ReservedSlot.find({
          _id: { $in: reservedSlotIds },
          status: 'active',
        }).distinct('_id')
      : [],
  ]);

  const activeBookingIdSet = new Set(activeBookingIds.map((id) => String(id)));
  const activeReservedSlotIdSet = new Set(activeReservedSlotIds.map((id) => String(id)));
  const staleBookingIds = bookingIds.filter((id) => !activeBookingIdSet.has(String(id)));
  const staleReservedSlotIds = reservedSlotIds.filter((id) => !activeReservedSlotIdSet.has(String(id)));
  const staleRequestLockIds = locks
    .filter((lock) => (
      !lock.booking_id &&
      !lock.reserved_slot_id &&
      lock.request_id &&
      lock.createdAt &&
      lock.createdAt < new Date(Date.now() - 10 * 60 * 1000)
    ))
    .map((lock) => lock._id);

  const deleteFilters = [];

  if (staleBookingIds.length) {
    deleteFilters.push({ ...filter, booking_id: { $in: staleBookingIds } });
  }

  if (staleReservedSlotIds.length) {
    deleteFilters.push({ ...filter, reserved_slot_id: { $in: staleReservedSlotIds } });
  }

  if (staleRequestLockIds.length) {
    deleteFilters.push({ _id: { $in: staleRequestLockIds } });
  }

  if (!deleteFilters.length) {
    return { deleted: 0 };
  }

  const result = await BookingLock.deleteMany({ $or: deleteFilters });
  return { deleted: result.deletedCount || 0 };
}

async function releaseBookingLocks(booking) {
  const salon = await Salon.findById(booking.salon_id).select('workingHours.slotIntervalMinutes');
  const interval = salon?.workingHours?.slotIntervalMinutes || 15;
  const blocks = [];
  const [startHours, startMinutes] = booking.start_time.split(':').map(Number);
  const [endHours, endMinutes] = booking.end_time.split(':').map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;

  for (let cursor = start; cursor < end; cursor += interval) {
    const hours = Math.floor(cursor / 60);
    const minutes = cursor % 60;
    blocks.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }

  await BookingLock.deleteMany({
    $or: [
      { booking_id: booking._id },
      {
        booking_id: { $exists: false },
        salon_id: booking.salon_id,
        date: booking.date,
        block_start: { $in: blocks },
      },
    ],
  });
}

function markBookingCancelled(booking, { role = 'system', userId = null, chargeCancellationFee } = {}) {
  const charge = typeof chargeCancellationFee === 'boolean' ? chargeCancellationFee : role !== 'barber';
  const amounts = cancellationAmounts(booking, { charge });

  booking.status = 'cancelled';
  booking.cancellation_charge_waived = amounts.cancellation_charge_waived;
  booking.customer_charged_amount = amounts.customer_charged_amount;
  booking.cancellation_charge_amount = amounts.cancellation_charge_amount;
  booking.commission_amount = amounts.commission_amount;
  booking.admin_commission_amount = amounts.admin_commission_amount;
  booking.platform_commission_amount = amounts.platform_commission_amount;
  booking.barber_earning_amount = amounts.barber_earning_amount;
  booking.cancellation_status = amounts.cancellation_status;
  booking.cancelled_by_role = role;
  booking.cancelled_by_user = userId || undefined;
  booking.cancelled_at = new Date();

  if (booking.payment_status === 'pending') {
    booking.payment_status = 'cancelled';
  }
}

async function cancelFutureConfirmedBookings(filter, cancellationMeta = {}) {
  const bookings = await Booking.find({ ...filter, status: 'confirmed' });
  const now = new Date();
  const futureBookings = bookings.filter((booking) => bookingStartDate(booking) > now);

  for (const booking of futureBookings) {
    markBookingCancelled(booking, cancellationMeta.role ? cancellationMeta : { role: 'system' });
    await booking.save();
    await releaseBookingLocks(booking);
  }

  return futureBookings.length;
}

async function cancelExpiredPendingPayments() {
  const expiresAt = new Date(Date.now() - 10 * 60 * 1000);
  const expiredBookings = await Booking.find({
    status: 'pending_payment',
    payment_status: 'pending',
    createdAt: { $lt: expiresAt },
  });

  for (const booking of expiredBookings) {
    markBookingCancelled(booking, { role: 'payment' });
    booking.payment_status = 'cancelled';
    await booking.save();
    await releaseBookingLocks(booking);
  }

  return { cancelled: expiredBookings.length };
}

module.exports = {
  autoCompleteExpiredBookings,
  bookingEndDate,
  bookingStartDate,
  cancelExpiredPendingPayments,
  cancelFutureConfirmedBookings,
  cleanStaleBookingLocks,
  markBookingCancelled,
  markBookingCompleted,
  releaseBookingLocks,
};
