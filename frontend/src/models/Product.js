const mongoose = require('mongoose');

const imagePositionSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 50, min: 0, max: 100 },
    y: { type: Number, default: 50, min: 0, max: 100 },
    zoom: { type: Number, default: 1, min: 1, max: 3 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    barber_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    salon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', default: null },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock_quantity: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true, default: '' },
    imagePosition: { type: imagePositionSchema, default: () => ({}) },
    category: { type: String, trim: true, default: 'General' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ barber_id: 1, createdAt: -1 });
productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ name: 'text', brand: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
