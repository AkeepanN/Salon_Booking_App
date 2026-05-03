const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    barber_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock_quantity: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'General' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ barber_id: 1, createdAt: -1 });
productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
