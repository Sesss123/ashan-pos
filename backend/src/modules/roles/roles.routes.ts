import { Router } from 'express';
const router = Router();
const rolesController = require('./roles.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

// All role configuration routes require admin role
router.use(authenticateToken);
router.use(requireRole(['Admin']));

router.get('/', rolesController.getRoles);
router.post('/', rolesController.createRole);
router.put('/:id', rolesController.updateRole);
router.post('/:id/clone', rolesController.cloneRole);
router.delete('/:id', rolesController.deleteRole);

export default router;
