const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema(
  {
    open: { type: String, required: true, default: '09:00' },
    close: { type: String, required: true, default: '18:00' },
    slotIntervalMinutes: { type: Number, required: true, default: 15, min: 5, max: 120 },
    closedDays: {
      type: [Number],
      default: [],
      validate: {
        validator: (days) => days.every((day) => day >= 0 && day <= 6),
        message: 'closedDays must contain weekday numbers 0-6',
      },
    },
  },
  { _id: false }
);

const salonSchema = new mongoose.Schema(
  {
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    board_photo_url: { type: String, trim: true, default: '' },
    latitude: { type: Number },
    longitude: { type: Number },
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'blocked', 'deleted'],
      default: 'active',
    },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blocked_at: { type: Date },
    blocked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workingHours: { type: workingHoursSchema, default: () => ({}) },
  },
  { timestamps: true }
);

salonSchema.index({ owner_id: 1 });
salonSchema.index({ name: 'text', address: 'text' });

module.exports = mongoose.model('Salon', salonSchema);
