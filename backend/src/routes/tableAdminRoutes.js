const express = require('express');
const { createFloor, getFloors, updateTableStatus, createReservation, getReservations } = require('../controllers/tableAdminController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Floor Routes
router.post('/floors', createFloor);
router.get('/floors', getFloors);

// Table Status Routes
router.put('/tables/:id/status', updateTableStatus);

// Reservation Routes
router.post('/reservations', createReservation);
router.get('/reservations', getReservations);

module.exports = router;
