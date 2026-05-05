const Notification = require('../models/Notification');
const Salon = require('../models/Salon');

async function createNotification({
  userId,
  role,
  type,
  title,
  message,
  bookingId,
  salonId,
}) {
  if (!userId || !role || !type || !title || !message) {
    return null;
  }

  return Notification.create({
    user_id: userId,
    role,
    type,
    title,
    message,
    related_booking_id: bookingId,
    related_salon_id: salonId,
  });
}

async function notifyBookingConfirmed({ booking, salon, service }) {
  await createNotification({
    userId: booking.customer_id,
    role: 'customer',
    type: 'booking_confirmed',
    title: 'Booking confirmed',
    message: `${salon?.name || 'Salon'} confirmed for ${booking.date} at ${booking.start_time}.`,
    bookingId: booking._id,
    salonId: booking.salon_id,
  });

  const ownerId = salon?.owner_id;
  if (ownerId) {
    await createNotification({
      userId: ownerId,
      role: 'barber',
      type: 'new_booking',
      title: 'New booking',
      message: `${service?.name || 'Service'} booked for ${booking.date} at ${booking.start_time}.`,
      bookingId: booking._id,
      salonId: booking.salon_id,
    });
  }
}

async function notifyBookingCancelled({ booking, cancelledByRole }) {
  const salon = await Salon.findById(booking.salon_id).select('name owner_id');
  const title = 'Booking cancelled';
  const message = `${salon?.name || 'Salon'} booking on ${booking.date} at ${booking.start_time} was cancelled.`;

  await createNotification({
    userId: booking.customer_id,
    role: 'customer',
    type: 'booking_cancelled',
    title,
    message,
    bookingId: booking._id,
    salonId: booking.salon_id,
  });

  if (salon?.owner_id && cancelledByRole !== 'barber') {
    await createNotification({
      userId: salon.owner_id,
      role: 'barber',
      type: 'booking_cancelled',
      title,
      message,
      bookingId: booking._id,
      salonId: booking.salon_id,
    });
  }
}

async function notifyPaymentSuccess({ booking }) {
  await createNotification({
    userId: booking.customer_id,
    role: 'customer',
    type: 'payment_success',
    title: 'Payment success',
    message: `Payment received for your booking on ${booking.date} at ${booking.start_time}.`,
    bookingId: booking._id,
    salonId: booking.salon_id,
  });
}

module.exports = {
  createNotification,
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyPaymentSuccess,
};
