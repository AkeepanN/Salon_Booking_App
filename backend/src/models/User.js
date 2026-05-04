const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    profilePhotoUrl: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'barber', 'admin'],
      required: true,
    },
    professional_type: {
      type: String,
      enum: ['barber', 'beautician', 'makeup_artist'],
      default: 'barber',
    },
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'blocked', 'inactive', 'deleted'],
      default: 'active',
    },
    blocked_at: { type: Date },
    blocked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
