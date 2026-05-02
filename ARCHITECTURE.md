# Sri Lanka Salon Booking App Architecture

## Stack

- Mobile app: Flutter
- API: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT bearer tokens

MongoDB is a good first choice for this version because salon profiles, working hours, services, bookings, and availability locks fit naturally as documents. Firebase is also valid, but MongoDB keeps the booking rules centralized in one Express API and avoids putting important availability logic in the client.

## Core Flow

1. Customer opens salon list.
2. Customer selects a salon and service.
3. App requests available slots for a date.
4. API calculates slots from salon working hours, slot interval, service duration, and existing booking locks.
5. Customer books a slot.
6. API validates working hours, duration fit, and existing locks.
7. API creates slot locks and a `confirmed` booking automatically.

There is no `pending` or manual approval state.

## Folder Structure

```text
backend/
  src/
    config/
      db.js
    middleware/
      auth.js
    models/
      Booking.js
      BookingLock.js
      Salon.js
      Service.js
      User.js
    routes/
      auth.js
      bookings.js
      salons.js
      services.js
    utils/
      time.js
    server.js
  .env.example
  package.json

mobile_app/
  lib/
    models/
      salon.dart
      service.dart
    screens/
      barber_dashboard_screen.dart
      booking_screen.dart
      login_screen.dart
      salon_list_screen.dart
      signup_screen.dart
    services/
      api_service.dart
    main.dart
  pubspec.yaml
```

## Booking Reliability

The API stores one `BookingLock` document for each small time block, using a unique key:

```text
salon_id + date + block_start
```

Example: a 30-minute haircut from 10:00 to 10:30 locks `10:00` and `10:15` when the salon uses 15-minute blocks. If another booking overlaps, MongoDB rejects the duplicate lock. This is simple and safer than relying only on checking existing bookings before insert.

## Low Data Usage Choices

- The mobile app fetches compact JSON only.
- Salon list returns basic profile fields first.
- Services and slots are loaded only when a customer opens booking.
- No chat, images, payments, or realtime subscriptions in the first version.
