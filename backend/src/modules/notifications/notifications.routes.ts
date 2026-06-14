import { Router } from 'express';
const router = Router();
const notificationsController = require('./notifications.controller');
const { authenticateToken } = require('../../shared/middlewares/security');

router.use(authenticateToken);

// Notifications Core Routes
router.get('/', notificationsController.getNotifications);
router.put('/read-all', notificationsController.markAllAsRead);
router.put('/:id/read', notificationsController.markAsRead);
router.delete('/', notificationsController.clearAllNotifications);
router.delete('/:id', notificationsController.deleteNotification);

// Notification Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.savePreferences);

export default router;
