const prisma = require('../config/db');

const generateQr = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    // Simulate generating a QR code payload or payment intent with a 3rd party
    const paymentIntentId = `pi_${Date.now()}`;
    const qrPayload = `LANKAQR://pay?id=${paymentIntentId}&amount=${amount}`;

    // Normally we save this payment intent to DB
    res.status(200).json({ 
      success: true, 
      paymentIntentId,
      qrPayload,
      message: 'QR Code generated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR', error: error.message });
  }
};

const webhookCallback = async (req, res) => {
  try {
    const { paymentIntentId, status, orderId } = req.body;
    
    // In a real scenario, verify signature from payment gateway here.
    const io = req.app.get('io');

    if (status === 'SUCCESS') {
      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'Paid', status: 'Completed' }
      });

      // Emit success
      io.emit('payment.success', { transactionId: paymentIntentId, orderId });
      io.emit('order.completed', { orderId });
      
      res.status(200).send('Webhook Received: Success');
    } else {
      io.emit('payment.failed', { reason: 'Declined by bank', orderId });
      res.status(200).send('Webhook Received: Failed');
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook Processing Error');
  }
};

module.exports = {
  generateQr,
  webhookCallback
};
