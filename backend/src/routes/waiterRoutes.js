const express = require('express');
const { getTables, createTableOrder, transferTable } = require('../controllers/waiterController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/tables', getTables);
router.post('/tables/order', createTableOrder);
router.post('/tables/transfer', transferTable);

module.exports = router;
