const mongoose = require('mongoose');

const bookingLockSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    reserved_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReservedSlot' },
    request_id: { type: String },
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    date: { type: String, required: true },
    block_start: { type: String, required: true },
  },
  { timestamps: true }
);

bookingLockSchema.index(
  { salon_id: 1, date: 1, block_start: 1 },
  { unique: true }
);
bookingLockSchema.index({ booking_id: 1 });
bookingLockSchema.index({ reserved_slot_id: 1 });

module.exports = mongoose.model('BookingLock', bookingLockSchema);
