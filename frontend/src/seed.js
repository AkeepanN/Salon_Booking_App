require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDb = require('./config/db');
const Booking = require('./models/Booking');
const BookingLock = require('./models/BookingLock');
const Salon = require('./models/Salon');
const Service = require('./models/Service');
const User = require('./models/User');

const salons = [
  {
    owner: { name: 'Nimal Perera', phone: '+94711234567', email: 'nimal@example.com' },
    salon: {
      name: 'Colombo Gents Salon',
      address: 'Galle Road, Bambalapitiya, Colombo 04',
      phone: '+94112555111',
      workingHours: { open: '09:00', close: '19:00', slotIntervalMinutes: 15, closedDays: [] },
    },
    services: [
      { name: 'Haircut', price: 1200, duration: 30 },
      { name: 'Beard Trim', price: 700, duration: 15 },
      { name: 'Haircut and Beard', price: 1700, duration: 45 },
    ],
  },
  {
    owner: { name: 'Kasun Silva', phone: '+94772223344', email: 'kasun@example.com' },
    salon: {
      name: 'Kandy Style Cuts',
      address: 'Dalada Veediya, Kandy',
      phone: '+94812222444',
      workingHours: { open: '08:30', close: '18:00', slotIntervalMinutes: 15, closedDays: [0] },
    },
    services: [
      { name: 'Classic Haircut', price: 1000, duration: 30 },
      { name: 'Kids Haircut', price: 800, duration: 30 },
      { name: 'Shave', price: 600, duration: 15 },
    ],
  },
  {
    owner: { name: 'Fazly Ahamed', phone: '+94775556677', email: 'fazly@example.com' },
    salon: {
      name: 'Galle Fort Barber',
      address: 'Lighthouse Street, Galle Fort',
      phone: '+94912222333',
      workingHours: { open: '10:00', close: '20:00', slotIntervalMinutes: 15, closedDays: [] },
    },
    services: [
      { name: 'Fade Cut', price: 1500, duration: 45 },
      { name: 'Beard Shape', price: 900, duration: 30 },
      { name: 'Head Massage', price: 1200, duration: 30 },
    ],
  },
];

async function seed() {
  await connectDb();

  await Promise.all([
    Booking.deleteMany({}),
    BookingLock.deleteMany({}),
    Service.deleteMany({}),
    Salon.deleteMany({}),
    User.deleteMany({ phone: { $in: salons.map((item) => item.owner.phone) } }),
    User.deleteMany({ phone: '+94770000000' }),
  ]);

  const passwordHash = await bcrypt.hash('Password123', 10);

  await User.create({
    name: 'Sample Customer',
    phone: '+94770000000',
    email: 'customer@example.com',
    passwordHash,
    role: 'customer',
  });

  for (const item of salons) {
    const owner = await User.create({
      ...item.owner,
      passwordHash,
      role: 'barber',
    });

    const salon = await Salon.create({
      ...item.salon,
      owner_id: owner._id,
    });

    await Service.insertMany(
      item.services.map((service) => ({
        ...service,
        salon_id: salon._id,
      }))
    );
  }

  console.log('Seed data created');
  console.log('Customer login: +94770000000 / Password123');
  console.log('Barber login examples: +94711234567, +94772223344, +94775556677 / Password123');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
