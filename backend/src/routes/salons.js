const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Booking = require('../models/Booking');
const BookingLock = require('../models/BookingLock');
const Rating = require('../models/Rating');
const ReservedSlot = require('../models/ReservedSlot');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const { auth, requireRole } = require('../middleware/auth');
const {
  cancelExpiredPendingPayments,
  cleanStaleBookingLocks,
} = require('../utils/bookingLifecycle');
const {
  addMinutes,
  getBlocks,
  fitsWorkingHours,
  isAlignedToInterval,
  isClosedDay,
  isDateString,
  isTimeString,
  toMinutes,
  toTime,
} = require('../utils/time');

const router = express.Router();
const uploadRoot = path.join(__dirname, '..', '..', 'uploads', 'salons');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${new mongoose.Types.ObjectId()}${extension}`);
  },
});

const uploadSalonPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error('Only jpg, jpeg, png, and webp images are allowed');
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

async function deleteOldSalonPhoto(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/salons/')) {
    return;
  }

  const filename = path.basename(photoUrl);
  const photoPath = path.resolve(uploadRoot, filename);
  const safeRoot = path.resolve(uploadRoot);

  if (!photoPath.startsWith(safeRoot)) {
    return;
  }

  try {
    await fs.promises.unlink(photoPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not delete old salon photo', error.message);
    }
  }
}

async function attachSalonSummaries(salons) {
  const salonIds = salons.map((salon) => salon._id);
  const ownerIds = [...new Set(salons.map((salon) => String(salon.owner_id)).filter(Boolean))];
  const [ratingRows, serviceRows, owners] = await Promise.all([
    Rating.aggregate([
      { $match: { salon_id: { $in: salonIds } } },
      {
        $group: {
          _id: '$salon_id',
          average_rating: { $avg: '$rating' },
          rating_count: { $sum: 1 },
        },
      },
    ]),
    Service.aggregate([
      { $match: { salon_id: { $in: salonIds }, active: { $ne: false } } },
      {
        $group: {
          _id: '$salon_id',
          services_count: { $sum: 1 },
          service_categories: { $addToSet: '$service_category' },
        },
      },
    ]),
    ownerIds.length
      ? require('../models/User').find({ _id: { $in: ownerIds } }).select('professional_type name')
      : [],
  ]);
  const ratingsBySalon = new Map(ratingRows.map((row) => [String(row._id), row]));
  const servicesBySalon = new Map(serviceRows.map((row) => [String(row._id), row]));
  const ownersById = new Map(owners.map((owner) => [String(owner._id), owner]));
  const latestRatings = await Rating.find({
    salon_id: { $in: salonIds },
    comment: { $ne: '' },
  })
    .populate('customer_id', 'name')
    .select('salon_id customer_id rating comment createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const commentsBySalon = new Map();
  const highestBySalon = new Map();

  latestRatings.forEach((rating) => {
    const key = String(rating.salon_id);
    const comments = commentsBySalon.get(key) || [];
    if (comments.length < 5) {
      comments.push(rating);
      commentsBySalon.set(key, comments);
    }

    const currentHighest = highestBySalon.get(key);
    if (!currentHighest || rating.rating > currentHighest.rating) {
      highestBySalon.set(key, rating);
    }
  });

  return salons.map((salon) => {
    const data = salon.toObject ? salon.toObject() : salon;
    const rating = ratingsBySalon.get(String(data._id));
    const serviceRow = servicesBySalon.get(String(data._id));
    const owner = ownersById.get(String(data.owner_id));
    return {
      ...data,
      average_rating: rating ? Number(rating.average_rating.toFixed(1)) : 0,
      rating_count: rating?.rating_count || 0,
      services_count: serviceRow?.services_count || 0,
      service_categories: serviceRow?.service_categories?.filter(Boolean) || [],
      professional_type: owner?.professional_type || 'barber',
      latest_comments: commentsBySalon.get(String(data._id)) || [],
      recent_reviews: commentsBySalon.get(String(data._id)) || [],
      highest_rated_review: highestBySalon.get(String(data._id)) || null,
    };
  });
}

function sortByRating(salons) {
  return salons.sort((a, b) => (
    (b.average_rating || 0) - (a.average_rating || 0) ||
    (b.rating_count || 0) - (a.rating_count || 0) ||
    String(a.name || '').localeCompare(String(b.name || ''))
  ));
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const allowedProfessionalTypes = new Set(['barber', 'beautician', 'makeup_artist']);
const allowedServiceCategories = new Set(['hair', 'beauty', 'makeup']);

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const professionalType =
      typeof req.query.professional_type === 'string' ? req.query.professional_type.trim() : '';
    const serviceCategory =
      typeof req.query.service_category === 'string'
        ? req.query.service_category.trim()
        : typeof req.query.service_type === 'string'
          ? req.query.service_type.trim()
          : '';

    const query = {
      active: { $ne: false },
      status: { $nin: ['blocked', 'deleted'] },
      approval_status: { $ne: 'rejected' },
    };

    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: pattern }, { address: pattern }];
    }

    const salons = await Salon.find(query)
      .select('name address phone board_photo_url latitude longitude workingHours active status approval_status createdAt')
      .sort({ name: 1 })
      .limit(50);

    let withSummaries = await attachSalonSummaries(salons);

    if (allowedProfessionalTypes.has(professionalType)) {
      withSummaries = withSummaries.filter((salon) => (salon.professional_type || 'barber') === professionalType);
    }

    if (allowedServiceCategories.has(serviceCategory)) {
      withSummaries = withSummaries.filter((salon) => {
        const categories = salon.service_categories || [];
        const type = salon.professional_type || 'barber';

        if (serviceCategory === 'hair') {
          return type === 'barber' || categories.includes('hair');
        }

        if (serviceCategory === 'beauty') {
          return type === 'beautician' || categories.includes('beauty');
        }

        if (serviceCategory === 'makeup') {
          return type === 'makeup_artist' || categories.includes('makeup');
        }

        return true;
      });
    }

    console.log('GET /api/salons returning:', withSummaries.length);
    res.json(sortByRating(withSummaries));
  } catch (error) {
    next(error);
  }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const salons = await Salon.find({
      active: { $ne: false },
      status: { $nin: ['blocked', 'deleted'] },
      approval_status: { $ne: 'rejected' },
      latitude: { $exists: true },
      longitude: { $exists: true },
    }).select('name address phone board_photo_url latitude longitude workingHours active status approval_status createdAt');

    const withSummaries = await attachSalonSummaries(salons);
    const sorted = withSummaries
      .map((salon) => ({
        ...salon,
        distance_km: Number(distanceKm(lat, lng, salon.latitude, salon.longitude).toFixed(2)),
      }))
      .sort((a, b) => (
        (b.average_rating || 0) - (a.average_rating || 0) ||
        (b.rating_count || 0) - (a.rating_count || 0) ||
        a.distance_km - b.distance_km
      ));

    res.json(sorted);
  } catch (error) {
    next(error);
  }
});

router.get('/:salonId/availability', async (req, res, next) => {
  try {
    await cancelExpiredPendingPayments();

    const { date, service_id } = req.query;

    if (!service_id || !isDateString(date || '')) {
      return res.status(400).json({ message: 'Please choose a service and valid date.' });
    }

    const [salon, service] = await Promise.all([
      Salon.findOne({
        _id: req.params.salonId,
        active: { $ne: false },
        status: { $nin: ['blocked', 'deleted'] },
        approval_status: { $ne: 'rejected' },
      }),
      Service.findOne({ _id: service_id, salon_id: req.params.salonId, active: { $ne: false } }),
    ]);

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    if (!service) {
      return res.status(404).json({ message: 'Service not found for this salon' });
    }

    const { open, close, slotIntervalMinutes, closedDays } = salon.workingHours;

    if (isClosedDay(date, closedDays)) {
      return res.json({ date, slots: [] });
    }

    await cleanStaleBookingLocks({
      salon_id: req.params.salonId,
      date,
    });

    const locks = await BookingLock.find({
      salon_id: req.params.salonId,
      date,
    }).select('block_start booking_id reserved_slot_id');
    const lockedBlocks = new Map(
      locks.map((lock) => [
        lock.block_start,
        lock.reserved_slot_id ? 'reserved' : 'booked',
      ])
    );
    const slots = [];
    const start = toMinutes(open);
    const latestStart = toMinutes(close) - service.duration;
    const displayStepMinutes =
      service.duration >= slotIntervalMinutes && service.duration % slotIntervalMinutes === 0
        ? service.duration
        : slotIntervalMinutes;

    for (let cursor = start; cursor <= latestStart; cursor += displayStepMinutes) {
      const startTime = toTime(cursor);
      const endTime = addMinutes(startTime, service.duration);
      const neededBlocks = getBlocks(startTime, endTime, slotIntervalMinutes);
      const lockedReason = neededBlocks
        .map((block) => lockedBlocks.get(block))
        .find(Boolean);

      slots.push({
        start_time: startTime,
        end_time: endTime,
        available: !lockedReason,
        reason: lockedReason,
      });
    }

    res.json({ date, salon_id: req.params.salonId, service_id, slots });
  } catch (error) {
    next(error);
  }
});

router.post('/:salonId/reserved-slots', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { date, start_time, end_time, reason } = req.body;

    if (!isDateString(date || '') || !isTimeString(start_time || '') || !isTimeString(end_time || '')) {
      return res.status(400).json({ message: 'Please choose a valid date, start time, and end time.' });
    }

    if (toMinutes(start_time) >= toMinutes(end_time)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const selectedStart = new Date(`${date}T${start_time}:00`);
    if (Number.isNaN(selectedStart.getTime()) || selectedStart < new Date()) {
      return res.status(400).json({ message: 'Cannot reserve a past time slot' });
    }

    const salon = await Salon.findOne({
      _id: req.params.salonId,
      owner_id: req.user._id,
      active: { $ne: false },
    });

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const { open, close, slotIntervalMinutes, closedDays } = salon.workingHours;

    if (isClosedDay(date, closedDays)) {
      return res.status(409).json({ message: 'This salon is closed on the selected date.' });
    }

    if (!fitsWorkingHours({ startTime: start_time, endTime: end_time, open, close })) {
      return res.status(409).json({ message: 'Reserved time must be within salon working hours.' });
    }

    if (
      !isAlignedToInterval({ startTime: start_time, open, intervalMinutes: slotIntervalMinutes }) ||
      (toMinutes(end_time) - toMinutes(open)) % slotIntervalMinutes !== 0
    ) {
      return res.status(400).json({ message: 'Please reserve time using the salon slot interval.' });
    }

    const [overlappingBooking, overlappingReservedSlot] = await Promise.all([
      Booking.exists({
        salon_id: req.params.salonId,
        date,
        status: { $ne: 'cancelled' },
        start_time: { $lt: end_time },
        end_time: { $gt: start_time },
      }),
      ReservedSlot.exists({
        salon_id: req.params.salonId,
        date,
        status: 'active',
        start_time: { $lt: end_time },
        end_time: { $gt: start_time },
      }),
    ]);

    if (overlappingBooking) {
      return res.status(409).json({ message: 'This time overlaps with an existing customer booking.' });
    }

    if (overlappingReservedSlot) {
      return res.status(409).json({ message: 'This time overlaps with an existing reserved slot.' });
    }

    const blocks = getBlocks(start_time, end_time, slotIntervalMinutes);
    const requestId = new mongoose.Types.ObjectId().toString();
    const lockDocs = blocks.map((block) => ({
      salon_id: req.params.salonId,
      date,
      block_start: block,
      request_id: requestId,
    }));

    let insertedLocks = [];

    try {
      insertedLocks = await BookingLock.insertMany(lockDocs, { ordered: true });
    } catch (error) {
      await BookingLock.deleteMany({ request_id: requestId });

      if (error.code === 11000 || error.writeErrors) {
        return res.status(409).json({ message: 'This time overlaps with an existing booking or reserved slot.' });
      }

      throw error;
    }

    try {
      const reservedSlot = await ReservedSlot.create({
        salon_id: req.params.salonId,
        owner_id: req.user._id,
        created_by: req.user._id,
        date,
        start_time,
        end_time,
        reason,
        status: 'active',
      });

      await BookingLock.updateMany(
        { _id: { $in: insertedLocks.map((lock) => lock._id) } },
        { $set: { reserved_slot_id: reservedSlot._id }, $unset: { request_id: '' } }
      );

      res.status(201).json(reservedSlot);
    } catch (error) {
      await BookingLock.deleteMany({ _id: { $in: insertedLocks.map((lock) => lock._id) } });
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:salonId/reserved-slots', auth, requireRole('barber'), async (req, res, next) => {
  try {
    if (!isDateString(req.query.date || '')) {
      return res.status(400).json({ message: 'Please choose a valid date.' });
    }

    const salon = await Salon.findOne({ _id: req.params.salonId, owner_id: req.user._id });
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const reservedSlots = await ReservedSlot.find({
      salon_id: req.params.salonId,
      date: req.query.date,
      status: 'active',
    }).sort({ start_time: 1 });

    res.json(reservedSlots);
  } catch (error) {
    next(error);
  }
});

router.get('/:salonId/ratings', async (req, res, next) => {
  try {
    const ratings = await Rating.find({ salon_id: req.params.salonId })
      .populate('customer_id', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const summary = await Rating.aggregate([
      { $match: { salon_id: new mongoose.Types.ObjectId(req.params.salonId) } },
      {
        $group: {
          _id: '$salon_id',
          average_rating: { $avg: '$rating' },
          rating_count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      average_rating: summary[0] ? Number(summary[0].average_rating.toFixed(1)) : 0,
      rating_count: summary[0]?.rating_count || 0,
      ratings,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:salonId/ratings', auth, requireRole('customer'), async (req, res, next) => {
  try {
    const ratingValue = Number(req.body.rating);
    const { booking_id, comment } = req.body;

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: 'Rating must be a number from 1 to 5' });
    }

    if (!booking_id) {
      return res.status(400).json({ message: 'Completed booking is required to rate a salon' });
    }

    const booking = await Booking.findOne({
      _id: booking_id,
      salon_id: req.params.salonId,
      customer_id: req.user._id,
      status: 'completed',
    });

    if (!booking) {
      return res.status(403).json({ message: 'You can rate only after a completed booking at this salon' });
    }

    const rating = await Rating.create({
      salon_id: req.params.salonId,
      customer_id: req.user._id,
      booking_id,
      rating: ratingValue,
      comment,
    });

    res.status(201).json(rating);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already rated this completed booking' });
    }

    next(error);
  }
});

router.post('/', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { name, address, phone, latitude, longitude, workingHours } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({ message: 'name, address, and phone are required' });
    }

    if (workingHours?.open && workingHours?.close && toMinutes(workingHours.open) >= toMinutes(workingHours.close)) {
      return res.status(400).json({ message: 'Close time must be after open time' });
    }

    const salon = await Salon.create({
      owner_id: req.user._id,
      name,
      address,
      phone,
      latitude,
      longitude,
      active: true,
      status: 'active',
      approval_status: 'approved',
      workingHours,
    });

    res.status(201).json(salon);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { name, address, phone, latitude, longitude } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({ message: 'name, address, and phone are required' });
    }

    const salon = await Salon.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user._id },
      { name, address, phone, latitude, longitude },
      { new: true, runValidators: true }
    );

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(salon);
  } catch (error) {
    next(error);
  }
});

router.patch('/:salonId/board-photo', auth, uploadSalonPhoto.single('board_photo'), async (req, res, next) => {
  try {
    if (!['barber', 'admin'].includes(req.user.role)) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }

      return res.status(403).json({ message: 'Only barbers can update salon photos' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please choose an image to upload' });
    }

    const query = req.user.role === 'admin'
      ? { _id: req.params.salonId }
      : { _id: req.params.salonId, owner_id: req.user._id };

    const salon = await Salon.findOne(query);

    if (!salon) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Salon not found' });
    }

    const oldPhotoUrl = salon.board_photo_url;
    salon.board_photo_url = `/uploads/salons/${req.file.filename}`;
    await salon.save();
    await deleteOldSalonPhoto(oldPhotoUrl);

    res.json({
      message: 'Salon board photo updated',
      salon,
      board_photo_url: salon.board_photo_url,
    });
  } catch (error) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
});

router.delete('/:id', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.params.id, owner_id: req.user._id });

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const bookingCount = await Booking.countDocuments({ salon_id: salon._id });

    if (bookingCount > 0) {
      salon.active = false;
      await salon.save();
      await Service.updateMany({ salon_id: salon._id }, { active: false });
      return res.json({ message: 'Salon deactivated because bookings exist', salon });
    }

    await Promise.all([
      Service.deleteMany({ salon_id: salon._id }),
      Salon.deleteOne({ _id: salon._id }),
    ]);

    res.json({ message: 'Salon deleted' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/working-hours', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const input = req.body.workingHours || req.body;
    const workingHours = {
      open: input?.open,
      close: input?.close,
      slotIntervalMinutes: Number(input?.slotIntervalMinutes),
      closedDays: Array.isArray(input?.closedDays) ? input.closedDays : [],
    };

    if (!workingHours?.open || !workingHours?.close || !workingHours?.slotIntervalMinutes) {
      return res.status(400).json({ message: 'Open time, close time, and slot interval are required' });
    }

    if (!Number.isInteger(workingHours.slotIntervalMinutes) || workingHours.slotIntervalMinutes < 5 || workingHours.slotIntervalMinutes > 120) {
      return res.status(400).json({ message: 'Slot interval must be between 5 and 120 minutes' });
    }

    if (!isTimeString(workingHours.open) || !isTimeString(workingHours.close)) {
      return res.status(400).json({ message: 'Open and close times must use HH:mm format' });
    }

    if (toMinutes(workingHours.open) >= toMinutes(workingHours.close)) {
      return res.status(400).json({ message: 'Close time must be after open time' });
    }

    const salon = await Salon.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user._id },
      { workingHours },
      { new: true, runValidators: true }
    );

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    res.json(salon);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salons = await Salon.find({ owner_id: req.user._id }).sort({ createdAt: -1 });
    res.json(await attachSalonSummaries(salons));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
