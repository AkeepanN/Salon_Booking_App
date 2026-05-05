const mongoose = require('mongoose');

const reservedSlotSchema = new mongoose.Schema(
  {
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

reservedSlotSchema.index({ salon_id: 1, date: 1, status: 1 });
reservedSlotSchema.index({ owner_id: 1 });

module.exports = mongoose.model('ReservedSlot', reservedSlotSchema);
