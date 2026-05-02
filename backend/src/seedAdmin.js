require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDb = require('./config/db');
const User = require('./models/User');

async function seedAdmin() {
  await connectDb();

  const name = process.env.ADMIN_NAME || 'Admin';
  const phone = process.env.ADMIN_PHONE || '0770000001';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || '123456';
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { phone },
    {
      name,
      phone,
      email,
      passwordHash,
      role: 'admin',
      active: true,
      status: 'active',
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log('Admin user ready');
  console.log(`Admin login: ${phone} / ${password}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
