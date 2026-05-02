# Salon Booking LK

Full-stack salon booking app for Sri Lanka with customer, barber, and admin flows.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Frontend: React web app at `C:\Users\BANUJAN\frontend`
- Mobile scaffold: Flutter app folder is included from the original project

## Current Features

Customer:

- Login/signup with mobile number and password
- Search salons by name or location
- View nearby salons if location is available
- Select salon, service, date, and slot
- See service price, advance/booking fee, remaining amount payable at salon, and cancellation charge rule
- Book appointments directly without PayHere for now
- See clean booking success UI
- View `My Bookings`
- Cancel future confirmed bookings with a custom confirmation card

Barber:

- Login/signup as `barber`
- Create and manage multiple salons
- Edit salon details, working hours, and map coordinates
- Add, edit, delete/disable services
- Copy services between own salons
- Reserve/block time slots so customers cannot book them
- Cancel reserved slots and release availability
- View today's bookings
- Mark confirmed bookings as completed
- See service price, advance paid, remaining pay at salon, and cancellation charge when relevant

Admin:

- Admin dashboard is shown only for users with `role: "admin"`
- Manage users: enable/disable users
- Manage salons: approve, reject, delete/deactivate salons
- Manage bookings: filter, view, and cancel bookings
- Manage payment rules:
  - booking fee percentage
  - cancellation charge percentage

## Important Business Rules

- Customer booking is automatically confirmed when the slot is valid.
- There is no manual approval for customer appointments.
- Availability is controlled by booking locks and reserved-slot locks.
- Cancelled bookings release locks, so the slot becomes available again.
- Barber reserved slots do not appear as customer bookings.
- Past slots cannot be booked.
- Confirmed bookings auto-complete after their end time passes.
- Inactive salons/services/users cannot be booked.

## Payment Rules

PayHere code exists in the backend for later, but the customer UI currently books directly with:

```text
POST /api/bookings
```

Current calculation model:

- `service_price`: full salon service charge
- `booking_fee_percentage`: admin-controlled advance percentage
- `booking_fee_amount`: customer advance, calculated from full service price
- `remaining_pay_at_salon`: amount customer pays at the salon
- `cancellation_charge_percentage`: admin-controlled percentage
- `cancellation_charge_amount`: calculated from full service price

Example:

```text
Service price = Rs. 1000
Booking fee percentage = 20%
Customer advance = Rs. 200
Remaining pay at salon = Rs. 800
Cancellation charge percentage = 50%
Cancellation charge = Rs. 500
```

Each booking stores its own calculation snapshot. If admin changes percentages later, old bookings do not change.

## Windows Setup

### 1. Install Requirements

- Node.js LTS from `https://nodejs.org`
- MongoDB Community Server from `https://www.mongodb.com/try/download/community`
- Flutter SDK only if you want to run the mobile scaffold

### 2. Start MongoDB

If MongoDB was installed as a Windows service:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

### 3. Configure Backend

From this project folder:

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Open `backend\.env` and set a strong `JWT_SECRET`.

Default local database:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/salon_booking_lk
```

### 4. Seed Sample Data

```powershell
npm run seed
npm run seed:admin
```

Seed logins:

- Customer: `+94770000000` / `Password123`
- Barber: `+94711234567` / `Password123`
- Barber: `+94772223344` / `Password123`
- Barber: `+94775556677` / `Password123`
- Admin: `0770000001` / `123456`

Admin signup is intentionally not public. Use `npm run seed:admin` or create an admin user manually.

### 5. Run Backend API

```powershell
npm run dev
```

API URL:

```text
http://localhost:4000
```

### 6. Run React Frontend

Open a second PowerShell window:

```powershell
cd C:\Users\BANUJAN\frontend
npm install
npm start
```

Frontend URL:

```text
http://localhost:3000
```

The frontend currently uses:

```js
const API_BASE = "http://localhost:4000/api";
```

## Environment Variables

Backend `.env.example` includes:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/salon_booking_lk
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=*
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_SANDBOX=true
FRONTEND_URL=http://localhost:3000
BACKEND_PUBLIC_URL=https://your-public-url.com
```

PayHere variables are kept for future re-enable work. The active customer UI does not redirect to PayHere right now.

## Main API Endpoints

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`

Customer/salons:

- `GET /api/salons`
- `GET /api/salons/nearby?lat=&lng=`
- `GET /api/salons/:salonId/availability?date=YYYY-MM-DD&service_id=SERVICE_ID`
- `GET /api/services/salon/:salonId`
- `GET /api/settings/payment-rules`

Bookings:

- `POST /api/bookings`
- `GET /api/bookings/my`
- `GET /api/bookings/mine`
- `PATCH /api/bookings/:id/cancel`

Barber:

- `GET /api/salons/mine`
- `POST /api/salons`
- `PATCH /api/salons/:id`
- `DELETE /api/salons/:id`
- `PATCH /api/salons/:id/working-hours`
- `POST /api/services`
- `GET /api/services/salon/:salonId/manage`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`
- `POST /api/services/copy`
- `GET /api/bookings/salon/:salonId/daily?date=YYYY-MM-DD`
- `PATCH /api/bookings/:id/complete`
- `POST /api/salons/:salonId/reserved-slots`
- `GET /api/salons/:salonId/reserved-slots?date=YYYY-MM-DD`
- `PATCH /api/reserved-slots/:id/cancel`

Admin:

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/salons`
- `PATCH /api/admin/salons/:id`
- `DELETE /api/admin/salons/:id`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/:id`
- `GET /api/admin/settings/payment-rules`
- `PATCH /api/admin/settings/payment-rules`

PayHere kept for later:

- `POST /api/payments/payhere/create-booking`
- `POST /api/payments/payhere/notify`
- `GET /api/payments/status/:bookingId`
- `POST /api/payments/dev/mark-paid/:bookingId`

## Booking Statuses

- `confirmed`: valid booking created
- `completed`: appointment end time passed or barber marks completed
- `cancelled`: customer/admin cancels
- `pending_payment`: kept for future PayHere flow, not used by current customer UI

## Notes

- Public signup supports only `customer` and `barber`.
- Admin users should be seeded or manually created.
- The backend logs the MongoDB URI and database name on startup to help avoid deleting data from the wrong database.
"# SaloonBooking" 
