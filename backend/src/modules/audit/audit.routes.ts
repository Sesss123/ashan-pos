import { Router } from 'express';
const router = Router();
const auditController = require('./audit.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

router.use(authenticateToken);
// Only Admin has access to audit logs
router.use(requireRole(['Admin']));

router.get('/logs', auditController.getAuditLogs);

export default router;
