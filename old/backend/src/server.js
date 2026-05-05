require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');
const connectDb = require('./config/db');
const {
  autoCompleteExpiredBookings,
  cancelExpiredPendingPayments,
} = require('./utils/bookingLifecycle');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const barberRoutes = require('./routes/barber');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const productOrderRoutes = require('./routes/productOrders');
const productRoutes = require('./routes/products');
const salonRoutes = require('./routes/salons');
const serviceRoutes = require('./routes/services');
const userRoutes = require('./routes/users');
const reservedSlotRoutes = require('./routes/reservedSlots');
const settingRoutes = require('./routes/settings');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://salonb.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ ok: true, country: 'LK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/barber', barberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-orders', productOrderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reserved-slots', reservedSlotRoutes);
app.use('/api/settings', settingRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
    return res.status(400).json({ message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id or request value' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image must be 5MB or smaller' });
  }

  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Something went wrong. Please try again.',
  });
});

const port = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`API running on port ${port}`));
    setInterval(() => {
      autoCompleteExpiredBookings().catch((error) => {
        console.error('Failed to auto-complete bookings', error);
      });
      cancelExpiredPendingPayments().catch((error) => {
        console.error('Failed to cancel expired pending payments', error);
      });
    }, 5 * 60 * 1000);
  })
  .catch((error) => {
    console.error('Failed to start API', error);
    process.exit(1);
  });
