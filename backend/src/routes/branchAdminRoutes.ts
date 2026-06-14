import { Router } from 'express';
const { createBranchTransfer, receiveBranchTransfer, updateBranchConfig } = require('../controllers/branchAdminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../shared/middlewares/validateRequest');
const { branchTransferSchema, updateBranchConfigSchema } = require('../dtos/schemas');

const router = Router();

router.use(authenticate);

// Branch Config
router.put('/:id/config', validateRequest(updateBranchConfigSchema), updateBranchConfig);

// Branch Transfers
router.post('/transfers', validateRequest(branchTransferSchema), createBranchTransfer);
router.put('/transfers/:id/receive', receiveBranchTransfer); // Receiver schema would just be { receivedBy }

export default router;
