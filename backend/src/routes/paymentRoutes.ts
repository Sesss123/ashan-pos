import { Router } from 'express';
const { generateQr, webhookCallback } = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = Router();

router.post('/generate-qr', authenticate, generateQr);
// Webhook doesn't usually use normal auth, it uses signature verification
router.post('/webhook', webhookCallback);

export default router;
