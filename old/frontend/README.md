# Salon Booking React Frontend

React frontend for the Sri Lanka salon booking app.

## Current Roles

Customer:

- Login/signup with mobile number and password
- Search salons by name or location
- Use nearby salons
- Select salon, service, date, and slot
- See service price, booking fee/advance, remaining pay at salon, and cancellation rule
- Book appointment directly without PayHere
- See booking success card
- View `My Bookings`
- Cancel future confirmed bookings with a custom confirmation card

Barber:

- Login/signup as `barber`
- Manage multiple salons
- Edit salon details and working hours
- Add/edit/delete services
- Copy services from another owned salon
- Reserve/block time slots
- Cancel reserved slots
- View today's bookings
- Mark bookings completed
- See service price, advance paid, remaining pay at salon, and cancellation charge when relevant

Admin:

- Login as seeded/admin-created user
- Separate admin dashboard
- Manage users, salons, bookings
- Manage payment rules:
  - booking fee percentage
  - cancellation charge percentage

## Setup

Start the backend first on:

```text
http://localhost:4000
```

Then run:

```powershell
cd C:\Users\BANUJAN\frontend
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## API Base URL

The app uses:

```js
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";
```

Create `.env` from `.env.example` if you need to change it:

```powershell
Copy-Item .env.example .env
```

For Android emulator with backend running on your Windows machine:

```env
REACT_APP_API_URL=http://10.0.2.2:4000/api
```

## Test Logins

If backend seed data was added:

```powershell
cd C:\Users\BANUJAN\Documents\Codex\2026-04-27\i-want-to-build-a-full-2\backend
npm run seed
npm run seed:admin
```

Use mobile number login:

- Customer: `+94770000000` / `Password123`
- Barber: `+94711234567` / `Password123`
- Barber: `+94772223344` / `Password123`
- Barber: `+94775556677` / `Password123`
- Admin: `0770000001` / `123456`

Public signup only supports `customer` and `barber`. Admin signup is intentionally blocked.

## Payment Behavior

The customer booking flow currently does not redirect to PayHere.

When a customer books, the frontend calls:

```text
POST /api/bookings
```

The booking stores a snapshot of:

- service price
- booking fee percentage
- booking fee/advance amount
- remaining pay at salon
- cancellation charge percentage
- cancellation charge amount

Admin can update future booking rules in the `Payment Rules` section.

## Screens

Customer:

- `Book Appointment`
- `My Bookings`

Barber:

- `My Salons`
- salon details
- working hours
- reserve time slot
- services
- today's bookings

Admin:

- `Payment Rules`
- `Users`
- `Salons`
- `Bookings`

## Build

```powershell
npm run build
```

## Capacitor Android Setup

Run these from `C:\Users\BANUJAN\frontend`:

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap init "Salon Booking LK" "com.salonbooking.lk" --web-dir=build
npx cap add android
npx cap sync android
npx cap open android
```

After future React changes:

```powershell
npm run build
npx cap sync android
npx cap open android
```

For real Android devices, set `REACT_APP_API_URL` to your computer LAN IP or public backend URL before building.

## Notes

- The app is intentionally simple and mobile-friendly.
- Customer booking/cancel flow uses inline cards, not browser alerts.
- Barber destructive actions use custom confirmation cards.
- Some admin actions are intentionally simple table actions for fast management.
