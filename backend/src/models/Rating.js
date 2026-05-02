const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

ratingSchema.index({ salon_id: 1, createdAt: -1 });
ratingSchema.index({ booking_id: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
