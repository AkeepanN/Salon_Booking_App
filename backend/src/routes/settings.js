const express = require('express');
const {
  calculateBookingFees,
  getPaymentRules,
} = require('../utils/bookingFees');

const router = express.Router();

router.get('/payment-rules', async (req, res, next) => {
  try {
    const rules = await getPaymentRules();

    res.json({
      ...rules,
      example: calculateBookingFees(
        1000,
        rules.booking_fee_percentage,
        rules.cancellation_charge_percentage,
        rules.commission_percentage
      ),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
