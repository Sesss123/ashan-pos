import { Router } from 'express';
const router = Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public settings endpoint (App Name, Currency, etc.)
router.get('/public', settingsController.getPublicSettings);

// Apply authentication to settings endpoints to track who is making changes
router.use(authenticate);

// Get all settings
router.get('/', settingsController.getSettings);

// Update multiple settings at once
router.put('/', settingsController.updateSettings);

// Get change history / audit trails of settings
router.get('/history', settingsController.getSettingsHistory);

// Reset settings to factory defaults
router.post('/reset', settingsController.resetSettings);

export default router;
