const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'unpaid',
    },
    payment_id: { type: String },
    payment_order_id: { type: String },
    payment_amount: { type: Number },
    payment_currency: { type: String, default: 'LKR' },
    payment_method: { type: String },
    payment_verified_at: { type: Date },
    service_price: { type: Number },
    booking_fee_percentage: { type: Number, default: 0 },
    booking_fee_amount: { type: Number, default: 0 },
    remaining_pay_at_salon: { type: Number, default: 0 },
    cancellation_charge_percentage: { type: Number, default: 0 },
    cancellation_charge_amount: { type: Number, default: 0 },
    customer_charged_amount: { type: Number, default: 0 },
    cancellation_status: { type: String, default: 'none' },
    cancellation_charge_waived: { type: Boolean, default: false },
    cancellation_charge_decided_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellation_charge_decided_at: { type: Date },
    completed_at: { type: Date },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_reason: { type: String },
    cancelled_by_role: {
      type: String,
      enum: ['customer', 'barber', 'admin', 'system', 'payment'],
    },
    cancelled_by_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelled_at: { type: Date },
    platform_fee: { type: Number, default: 0 },
    barber_amount: { type: Number, default: 0 },
    total_amount: { type: Number },
    commission_percentage: { type: Number, default: 0 },
    commission_amount: { type: Number, default: 0 },
    admin_commission_amount: { type: Number, default: 0 },
    platform_commission_amount: { type: Number, default: 0 },
    barber_earning_from_advance: { type: Number, default: 0 },
    barber_earning_amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bookingSchema.index({ customer_id: 1, date: 1 });
bookingSchema.index({ salon_id: 1, date: 1, start_time: 1 });
bookingSchema.index({ payment_order_id: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
