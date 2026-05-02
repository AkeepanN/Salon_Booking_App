const express = require('express');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/salon/:salonId/manage', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.params.salonId, owner_id: req.user._id });

    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const services = await Service.find({ salon_id: req.params.salonId })
      .select('salon_id name description price duration active')
      .sort({ price: 1 });

    res.json(services);
  } catch (error) {
    next(error);
  }
});

router.get('/salon/:salonId', async (req, res, next) => {
  try {
    const services = await Service.find({ salon_id: req.params.salonId, active: { $ne: false } })
      .select('salon_id name description price duration active')
      .sort({ price: 1 });

    res.json(services);
  } catch (error) {
    next(error);
  }
});

router.post('/copy', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { from_salon_id, to_salon_id } = req.body;

    if (!from_salon_id || !to_salon_id) {
      return res.status(400).json({ message: 'from_salon_id and to_salon_id are required' });
    }

    if (from_salon_id === to_salon_id) {
      return res.status(400).json({ message: 'Choose two different salons to copy services' });
    }

    const ownedSalonCount = await Salon.countDocuments({
      _id: { $in: [from_salon_id, to_salon_id] },
      owner_id: req.user._id,
    });

    if (ownedSalonCount !== 2) {
      return res.status(403).json({ message: 'You must own both salons to copy services' });
    }

    const sourceServices = await Service.find({ salon_id: from_salon_id }).select('name description price duration active');
    const existingServices = await Service.find({ salon_id: to_salon_id }).select('name');
    const existingNames = new Set(existingServices.map((service) => service.name.trim().toLowerCase()));
    const servicesToCopy = sourceServices
      .filter((service) => !existingNames.has(service.name.trim().toLowerCase()))
      .map((service) => ({
        salon_id: to_salon_id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        active: service.active,
      }));

    const copiedServices = servicesToCopy.length > 0
      ? await Service.insertMany(servicesToCopy, { ordered: false })
      : [];

    res.status(201).json({
      copied: copiedServices.length,
      skipped: sourceServices.length - copiedServices.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Some services already exist in the target salon' });
    }
    next(error);
  }
});

router.post('/', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const { salon_id, name, description, price, duration, active } = req.body;

    if (!salon_id || !name || price === undefined || !duration) {
      return res.status(400).json({ message: 'Salon, service name, price, and duration are required' });
    }

    const salon = await Salon.findOne({ _id: salon_id, owner_id: req.user._id });
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const service = await Service.create({ salon_id, name, description, price, duration, active });
    res.status(201).json(service);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Service already exists for this salon' });
    }
    next(error);
  }
});

router.patch('/:id', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const salon = await Salon.findOne({ _id: service.salon_id, owner_id: req.user._id });
    if (!salon) {
      return res.status(403).json({ message: 'You do not own this service' });
    }

    const allowedFields = ['name', 'description', 'price', 'duration', 'active'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();
    res.json(service);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Service already exists for this salon' });
    }
    next(error);
  }
});

router.delete('/:id', auth, requireRole('barber'), async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const salon = await Salon.findOne({ _id: service.salon_id, owner_id: req.user._id });
    if (!salon) {
      return res.status(403).json({ message: 'You do not own this service' });
    }

    const bookingCount = await Booking.countDocuments({ service_id: service._id });

    if (bookingCount > 0) {
      service.active = false;
      await service.save();
      return res.json({ message: 'Service disabled because bookings exist', service });
    }

    await Service.deleteOne({ _id: service._id });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
