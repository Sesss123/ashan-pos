const express = require('express');
const { createBranchTransfer, receiveBranchTransfer, updateBranchConfig } = require('../controllers/branchAdminController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Branch Config
router.put('/branches/:id/config', updateBranchConfig);

// Branch Transfers
router.post('/transfers', createBranchTransfer);
router.put('/transfers/:id/receive', receiveBranchTransfer);

module.exports = router;
