const express = require('express');
const { getExecutiveDashboard, getSalesChartData } = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/executive-dashboard', getExecutiveDashboard);
router.get('/sales-chart', getSalesChartData);

module.exports = router;
