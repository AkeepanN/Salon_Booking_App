const Setting = require('../models/Setting');
const Service = require('../models/Service');
const { calculatePaymentSnapshot } = require('./paymentCalculations');

const BOOKING_FEE_KEY = 'booking_fee_percentage';
const CANCELLATION_CHARGE_KEY = 'cancellation_charge_percentage';
const COMMISSION_KEY = 'commission_percentage';

function normalizePercentage(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function getSettingPercentage(key) {
  const setting = await Setting.findOne({ key });
  const value = normalizePercentage(setting?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function getBookingFeePercentage() {
  return getSettingPercentage(BOOKING_FEE_KEY);
}

async function getPaymentRules() {
  const [bookingFeePercentage, cancellationChargePercentage, commissionPercentage] = await Promise.all([
    getSettingPercentage(BOOKING_FEE_KEY),
    getSettingPercentage(CANCELLATION_CHARGE_KEY),
    getSettingPercentage(COMMISSION_KEY),
  ]);

  return {
    booking_fee_percentage: bookingFeePercentage,
    cancellation_charge_percentage: cancellationChargePercentage,
    commission_percentage: commissionPercentage,
  };
}

function calculateBookingFees(servicePrice, bookingFeePercentage, cancellationChargePercentage = 0, commissionPercentage = 0) {
  return calculatePaymentSnapshot({
    servicePrice,
    bookingFeePercentage,
    cancellationChargePercentage,
    commissionPercentage,
  });
}

async function buildBookingFeeSnapshot(servicePrice) {
  const rules = await getPaymentRules();
  return calculateBookingFees(
    servicePrice,
    rules.booking_fee_percentage,
    rules.cancellation_charge_percentage,
    rules.commission_percentage
  );
}

async function ensureBookingFeeSnapshot(booking) {
  const hasRuleSnapshot = (
    Number(booking.service_price || booking.total_amount || 0) > 0 &&
    (
      Number(booking.booking_fee_percentage || 0) > 0 ||
      Number(booking.cancellation_charge_percentage || 0) > 0 ||
      Number(booking.commission_percentage || 0) > 0
    )
  );

  if (hasRuleSnapshot) {
    return booking;
  }

  const service = booking.service_id ? await Service.findById(booking.service_id).select('price') : null;
  const servicePrice = Number(booking.service_price || booking.total_amount || service?.price || 0);

  if (!servicePrice) {
    return booking;
  }

  const snapshot = await buildBookingFeeSnapshot(servicePrice);
  Object.assign(booking, snapshot);
  return booking;
}

module.exports = {
  BOOKING_FEE_KEY,
  CANCELLATION_CHARGE_KEY,
  COMMISSION_KEY,
  buildBookingFeeSnapshot,
  calculateBookingFees,
  ensureBookingFeeSnapshot,
  getBookingFeePercentage,
  getPaymentRules,
};
