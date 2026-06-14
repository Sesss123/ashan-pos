import { Router } from 'express';
const router = Router();
const adminController = require('./admin.controller');
const dashboardController = require('./dashboard.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

router.use(authenticateToken);
// Only Admin has access to these routes
router.use(requireRole(['Admin']));

// Dashboard Stats
router.get('/dashboard/stats', dashboardController.getDashboardStats);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettingsBatch);
router.put('/settings/:key', adminController.updateSetting);

// Branches
router.get('/branches', adminController.getBranches);
router.post('/branches', adminController.createBranch);
router.put('/branches/:id', adminController.updateBranch);
router.get('/branches/:id/stats', adminController.getBranchStats);

// Backups
router.get('/backups', adminController.getBackups);
router.get('/backups/:id', adminController.getBackupById);
router.post('/backups/run', adminController.runBackup);
router.post('/backups/restore/:id', adminController.restoreBackup);
router.delete('/backups/:id', adminController.deleteBackup);

// Session Security
router.get('/sessions', adminController.getActiveSessions);
router.delete('/sessions/:id', adminController.revokeSession);
router.get('/login-history', adminController.getLoginHistory);

export default router;
