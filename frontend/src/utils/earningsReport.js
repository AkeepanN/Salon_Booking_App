const Booking = require('../models/Booking');

function pad(value) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function normalizeReportQuery(query = {}) {
  const now = new Date();
  const view = query.view === 'yearly' ? 'yearly' : 'monthly';
  const year = Number(query.year) || now.getFullYear();
  const month = Math.min(Math.max(Number(query.month) || now.getMonth() + 1, 1), 12);

  return { view, year, month };
}

function dateFilterForReport({ view, year, month }) {
  if (view === 'yearly') {
    return {
      $gte: `${year}-01-01`,
      $lte: `${year}-12-31`,
    };
  }

  return {
    $gte: `${year}-${pad(month)}-01`,
    $lte: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  };
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

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function itemFromBooking(booking, { includeBarber = false } = {}) {
  const item = {
    booking_id: booking._id,
    _id: booking._id,
    date: booking.date,
    customer_name: booking.customer_id?.name || booking.customer_id?.phone || 'Customer',
    salon_name: booking.salon_id?.name || 'Salon',
    service_name: booking.service_id?.name || 'Service',
    status: booking.status,
    service_price: money(booking.service_price || booking.total_amount),
    booking_fee_amount: money(booking.booking_fee_amount || booking.payment_amount),
    cancellation_charge_amount: money(booking.customer_charged_amount ?? booking.cancellation_charge_amount),
    admin_commission_amount: money(
      booking.admin_commission_amount ?? booking.platform_commission_amount ?? booking.commission_amount
    ),
    barber_earning_amount: money(booking.barber_earning_amount),
    payment_status: booking.payment_status || 'unpaid',
    start_time: booking.start_time,
    end_time: booking.end_time,
  };

  if (includeBarber) {
    item.barber_name = booking.salon_id?.owner_id?.name || booking.salon_id?.owner_id?.phone || 'Barber';
  }

  return item;
}

function emptySummary() {
  return {
    total_service_value: 0,
    total_booking_fees: 0,
    total_cancellation_charges: 0,
    total_admin_commission: 0,
    total_barber_earnings: 0,
    total_platform_revenue: 0,
    total_bookings: 0,
    completed_bookings: 0,
    cancelled_bookings: 0,
  };
}

function buildChartBuckets({ view, year, month }) {
  if (view === 'yearly') {
    return Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      barber_earnings: 0,
      admin_commission: 0,
      service_value: 0,
    }));
  }

  return Array.from({ length: daysInMonth(year, month) }, (_, index) => ({
    date: `${year}-${pad(month)}-${pad(index + 1)}`,
    barber_earnings: 0,
    admin_commission: 0,
    service_value: 0,
  }));
}

async function buildEarningsReport({ filter = {}, query = {}, includeBarber = false }) {
  const normalized = normalizeReportQuery(query);
  const bookings = await Booking.find({
    ...filter,
    date: dateFilterForReport(normalized),
    status: { $in: ['confirmed', 'completed', 'cancelled'] },
  })
    .populate('customer_id', 'name phone')
    .populate({
      path: 'salon_id',
      select: 'name owner_id',
      populate: includeBarber ? { path: 'owner_id', select: 'name phone' } : undefined,
    })
    .populate('service_id', 'name')
    .sort({ date: 1, start_time: 1 });

  const earningBookings = bookings.filter(isEarningBooking);
  const items = earningBookings.map((booking) => itemFromBooking(booking, { includeBarber }));
  const summary = items.reduce((sum, item) => {
    sum.total_service_value += Number(item.service_price || 0);
    sum.total_booking_fees += Number(item.booking_fee_amount || 0);
    sum.total_cancellation_charges += Number(item.cancellation_charge_amount || 0);
    sum.total_admin_commission += Number(item.admin_commission_amount || 0);
    sum.total_barber_earnings += Number(item.barber_earning_amount || 0);
    sum.total_platform_revenue += Number(item.admin_commission_amount || 0);
    return sum;
  }, emptySummary());

  summary.total_bookings = earningBookings.length;
  summary.completed_bookings = earningBookings.filter((booking) => booking.status === 'completed').length;
  summary.cancelled_bookings = earningBookings.filter((booking) => booking.status === 'cancelled').length;
  Object.keys(summary).forEach((key) => {
    summary[key] = money(summary[key]);
  });

  const chart_data = buildChartBuckets(normalized);
  const chartMap = new Map(
    chart_data.map((point) => [
      normalized.view === 'yearly' ? String(point.month) : point.date,
      point,
    ])
  );

  items.forEach((item) => {
    const key = normalized.view === 'yearly' ? String(Number(item.date.slice(5, 7))) : item.date;
    const point = chartMap.get(key);

    if (point) {
      point.barber_earnings = money(point.barber_earnings + Number(item.barber_earning_amount || 0));
      point.admin_commission = money(point.admin_commission + Number(item.admin_commission_amount || 0));
      point.service_value = money(point.service_value + Number(item.service_price || 0));
    }
  });

  return {
    ...normalized,
    summary,
    totals: summary,
    chart_data,
    items,
  };
}

module.exports = {
  buildEarningsReport,
};
