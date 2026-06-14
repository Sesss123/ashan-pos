import { Router } from 'express';
const { createFloor, getFloors, updateTableStatus, createReservation, getReservations, getTables, createTable, updateTable, deleteTable } = require('../controllers/tableAdminController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticate);

// Floor Routes
router.post('/floors', createFloor);
router.get('/floors', getFloors);

// Table Status Routes
router.put('/tables/:id/status', updateTableStatus);

// Table CRUD Routes
router.get('/', getTables);
router.post('/', createTable);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);

// Reservation Routes
router.post('/reservations', createReservation);
router.get('/reservations', getReservations);

export default router;
