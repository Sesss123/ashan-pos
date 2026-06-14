import { Router } from 'express';
const { getExecutiveDashboard, getSalesChartData } = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticate);

router.get('/executive-dashboard', getExecutiveDashboard);
router.get('/sales-chart', getSalesChartData);

export default router;
