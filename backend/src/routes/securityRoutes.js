const express = require('express');
const { getAuditLogs, getActiveDevices, revokeDevice, getLoginHistory } = require('../controllers/securityController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Audits
router.get('/audit-logs', getAuditLogs);
router.get('/login-history', getLoginHistory);

// Devices
router.get('/devices/:userId', getActiveDevices);
router.put('/devices/:deviceId/revoke', revokeDevice);

module.exports = router;
