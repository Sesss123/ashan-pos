import { Router } from 'express';
const router = Router();
const reportsController = require('./reports.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

router.use(authenticateToken);
// Only Admin can view reports
router.use(requireRole(['Admin']));

router.get('/dashboard', reportsController.getDashboardKPIs);
router.get('/sales', reportsController.getSalesReport);
router.get('/ai-forecast', reportsController.getAIForecast);
router.get('/multi-branch', reportsController.getMultiBranchAnalytics);

export default router;
