function money(value) {
  const number = Number(value);
  return Number((Number.isFinite(number) ? number : 0).toFixed(2));
}

function calculatePaymentSnapshot({
  servicePrice,
  bookingFeePercentage = 0,
  cancellationChargePercentage = 0,
  commissionPercentage = 0,
}) {
  const service_price = money(servicePrice);
  const booking_fee_percentage = money(bookingFeePercentage);
  const cancellation_charge_percentage = money(cancellationChargePercentage);
  const commission_percentage = money(commissionPercentage);
  const booking_fee_amount = money((service_price * booking_fee_percentage) / 100);
  const remaining_pay_at_salon = money(service_price - booking_fee_amount);
  const cancellation_charge_amount = money((service_price * cancellation_charge_percentage) / 100);
  const platform_commission_amount = money((service_price * commission_percentage) / 100);
  const barber_earning_from_advance = money(Math.max(booking_fee_amount - platform_commission_amount, 0));
  const barber_earning_completed = money(Math.max(service_price - platform_commission_amount, 0));
  const barber_earning_cancelled = money(Math.max(cancellation_charge_amount - platform_commission_amount, 0));

  return {
    service_price,
    booking_fee_percentage,
    booking_fee_amount,
    remaining_pay_at_salon,
    cancellation_charge_percentage,
    cancellation_charge_amount,
    commission_percentage,
    platform_commission_amount,
    admin_commission_amount: platform_commission_amount,
    commission_amount: platform_commission_amount,
    platform_fee: platform_commission_amount,
    total_amount: service_price,
    payment_amount: booking_fee_amount,
    barber_earning_from_advance,
    barber_earning_completed,
    barber_earning_cancelled,
    barber_amount: barber_earning_from_advance,
    barber_earning_amount: barber_earning_from_advance,
  };
}

function completionAmounts(booking) {
  const servicePrice = money(booking.service_price || booking.total_amount);
  const commission = money(
    booking.platform_commission_amount ?? booking.admin_commission_amount ?? booking.commission_amount
  );

  return {
    admin_commission_amount: commission,
    commission_amount: commission,
    platform_commission_amount: commission,
    barber_earning_amount: money(Math.max(servicePrice - commission, 0)),
  };
}

function cancellationAmounts(booking, { charge = true } = {}) {
  if (!charge) {
    return {
      cancellation_charge_waived: true,
      customer_charged_amount: 0,
      cancellation_charge_amount: 0,
      admin_commission_amount: 0,
      commission_amount: 0,
      platform_commission_amount: 0,
      barber_earning_amount: 0,
      cancellation_status: 'waived',
    };
  }

  const servicePrice = money(booking.service_price || booking.total_amount);
  const cancellationPercentage = money(booking.cancellation_charge_percentage);
  const commissionPercentage = money(booking.commission_percentage);
  const cancellationCharge = money(
    Number.isFinite(Number(booking.cancellation_charge_amount)) && Number(booking.cancellation_charge_amount) > 0
      ? booking.cancellation_charge_amount
      : (servicePrice * cancellationPercentage) / 100
  );
  const commission = money(
    Number.isFinite(Number(booking.platform_commission_amount)) && Number(booking.platform_commission_amount) > 0
      ? booking.platform_commission_amount
      : (servicePrice * commissionPercentage) / 100
  );

  return {
    cancellation_charge_waived: false,
    customer_charged_amount: cancellationCharge,
    cancellation_charge_amount: cancellationCharge,
    admin_commission_amount: commission,
    commission_amount: commission,
    platform_commission_amount: commission,
    barber_earning_amount: money(Math.max(cancellationCharge - commission, 0)),
    cancellation_status: cancellationCharge > 0 ? 'charge_applicable' : 'waived',
  };
}

module.exports = {
  calculatePaymentSnapshot,
  cancellationAmounts,
  completionAmounts,
  money,
};
