const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 5, max: 480 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ salon_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
