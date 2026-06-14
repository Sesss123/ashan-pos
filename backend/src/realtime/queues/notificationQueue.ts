const { Queue, Worker } = require('bullmq');
const { Redis } = require('ioredis');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Define Queue
const notificationQueue = new Queue('Notifications', { connection });

// Define Worker (Background Job Processor)
const worker = new Worker('Notifications', async job => {
  console.log(`[BullMQ] Processing Job ${job.id}: ${job.name}`);
  
  if (job.name === 'low_stock_alert') {
    // Logic to send email/SMS to Admin
    console.log(`[BullMQ] Sending Low Stock Alert for item: ${job.data.itemName}`);
  }
  
  if (job.name === 'purchase_order_created') {
    console.log(`[BullMQ] Sending Email to Supplier: ${job.data.supplierId}`);
  }
}, { connection });

worker.on('completed', job => {
  console.log(`[BullMQ] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job.id} failed:`, err);
});

module.exports = { notificationQueue };
