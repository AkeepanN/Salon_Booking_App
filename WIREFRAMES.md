# Flutter Screen Wireframes

These wireframes describe the current Flutter app flow in `mobile_app/lib/screens`.

## 1. Login Screen

File: `mobile_app/lib/screens/login_screen.dart`

Purpose: Entry point for both customers and barbers.

```text
+----------------------------------+
| Salon Booking LK                 |
+----------------------------------+
|                                  |
| Phone or email                   |
| [______________________________] |
|                                  |
| Password                         |
| [______________________________] |
|                                  |
| [ Login ]                        |
|                                  |
| Create account                   |
|                                  |
+----------------------------------+
```

Flow:

- Customer login goes to Salon List.
- Barber login goes to Barber Dashboard.
- Create account opens Signup Screen.

## 2. Signup Screen

File: `mobile_app/lib/screens/signup_screen.dart`

Purpose: Create either a customer account or barber account.

```text
+----------------------------------+
| Create account                   |
+----------------------------------+
| [ Customer ] [ Barber ]          |
|                                  |
| Name                             |
| [______________________________] |
|                                  |
| Phone                            |
| [______________________________] |
|                                  |
| Email optional                   |
| [______________________________] |
|                                  |
| Password                         |
| [______________________________] |
|                                  |
| [ Sign up ]                      |
+----------------------------------+
```

Flow:

- Select `Customer` to create a customer profile.
- Select `Barber` to create a salon owner profile.
- After signup, the app routes by role.

## 3. Salon List Screen

File: `mobile_app/lib/screens/salon_list_screen.dart`

Purpose: Customer browses available salons.

```text
+----------------------------------+
| Find a salon                 [≡] |
+----------------------------------+
| Colombo Gents Salon             |
| Galle Road, Bambalapitiya       |
| +94112555111                >   |
+----------------------------------+
| Kandy Style Cuts                |
| Dalada Veediya, Kandy           |
| +94812222444                >   |
+----------------------------------+
| Galle Fort Barber               |
| Lighthouse Street, Galle        |
| +94912222333                >   |
+----------------------------------+
```

Flow:

- Tapping a salon opens Booking Screen.
- Top-right bookings icon opens My Bookings Screen.

## 4. Booking Screen

File: `mobile_app/lib/screens/booking_screen.dart`

Purpose: Customer chooses service, date, and available slot.

```text
+----------------------------------+
| Colombo Gents Salon              |
+----------------------------------+
| Galle Road, Bambalapitiya        |
|                                  |
| Service                          |
| [ Haircut - Rs. 1200        v ]  |
|                                  |
| [ Calendar icon  2026-04-27 ]    |
|                                  |
| Available slots                  |
|                                  |
| [09:00 - 09:30] [09:15 - 09:45] |
| [09:30 - 10:00] [09:45 - 10:15] |
| [10:00 - 10:30]                 |
+----------------------------------+
```

Empty state:

```text
+----------------------------------+
| No available slots               |
+----------------------------------+
```

Flow:

- Service dropdown loads services for the selected salon.
- Date button opens date picker.
- Slot chips come from backend availability.
- Tapping a slot calls booking API.
- If valid, booking is immediately confirmed.
- If someone else booked the slot first, customer sees a friendly conflict message.

## 5. My Bookings Screen

File: `mobile_app/lib/screens/my_bookings_screen.dart`

Purpose: Customer views and cancels bookings.

```text
+----------------------------------+
| My bookings                      |
+----------------------------------+
| Haircut at Colombo Gents Salon   |
| 2026-04-27 09:00 - 09:30         |
| confirmed                    [x] |
+----------------------------------+
| Beard Trim at Kandy Style Cuts   |
| 2026-04-29 14:00 - 14:15         |
| completed                        |
+----------------------------------+
| Fade Cut at Galle Fort Barber    |
| 2026-05-01 11:00 - 11:45         |
| cancelled                        |
+----------------------------------+
```

Flow:

- Confirmed bookings show a cancel icon.
- Cancelled bookings release their availability on the backend.
- Completed/cancelled bookings remain visible for history.

## 6. Barber Dashboard Screen

File: `mobile_app/lib/screens/barber_dashboard_screen.dart`

Purpose: Salon owner manages salon profile, services, hours, and daily bookings.

```text
+----------------------------------+
| Barber dashboard                 |
+----------------------------------+
| Salon profile                    |
| Salon name                       |
| [______________________________] |
| Address                          |
| [______________________________] |
| Phone                            |
| [______________________________] |
| [ store icon  Create salon ]     |
+----------------------------------+
| Current salon                    |
| [ Colombo Gents Salon        v ] |
+----------------------------------+
| Working hours                    |
| Open            Close            |
| [09:00]         [18:00]          |
| Slot interval minutes            |
| [15___________________________]  |
| [ schedule icon  Save hours ]    |
+----------------------------------+
| Add service                      |
| Service name                     |
| [______________________________] |
| Price Rs.                        |
| [______________________________] |
| Duration minutes                 |
| [30___________________________]  |
| [ +  Add service ]               |
+----------------------------------+
| Today bookings                   |
| 09:00 Haircut                [✓] |
| Sahan +9477xxxxxxx               |
+----------------------------------+
```

Flow:

- Barber creates a salon profile first.
- Barber selects current salon from dropdown.
- Barber saves working hours.
- Barber adds services with price and duration.
- Daily bookings show customer and service details.
- Check icon marks a confirmed booking as completed.

## Overall App Flow

```text
Login
  |
  +-- Create account
  |     |
  |     +-- Customer signup --> Salon List
  |     |
  |     +-- Barber signup ----> Barber Dashboard
  |
  +-- Customer login ---------> Salon List
  |                              |
  |                              +-- Select salon --> Booking Screen
  |                              |
  |                              +-- My bookings --> Cancel booking
  |
  +-- Barber login ------------> Barber Dashboard
                                 |
                                 +-- Create salon
                                 +-- Set working hours
                                 +-- Add services
                                 +-- View today bookings
                                 +-- Mark completed
```

## Booking Confirmation Flow

```text
Customer taps slot
  |
  v
API checks date, time, service, salon
  |
  v
API checks working hours and service duration fit
  |
  v
API checks slot is aligned to salon interval
  |
  v
API creates booking locks
  |
  +-- Lock conflict --> show "slot just booked" error
  |
  +-- Locks saved --> create confirmed booking
                      |
                      v
                 Customer sees "Booking confirmed"
```

