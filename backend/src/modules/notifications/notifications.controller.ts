const prisma = require('../../config/db').default || require('../../config/db');

// Centralized Notification Sender (handles DB write, Socket emit, and mock email/push)
const sendNotification = async ({ message, category, priority = 'Medium', userId = null, io, tenantId }) => {
  try {
    if (!tenantId) {
      console.warn(`[Notification Engine]: Skipped DB write for notification due to missing tenantId. Msg: ${message}`);
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        message,
        category, // Orders, Inventory, Purchases, Customers, Security, System
        priority, // High, Medium, Low
        userId,
        tenantId
      }
    });

    // Emit Socket events dynamically based on category/event
    if (io) {
      io.emit('notification.created', notification);

      // Map to exact required Socket.IO event names
      if (category === 'Orders') {
        if (message.toLowerCase().includes('ready')) {
          io.emit('order.ready', notification);
        } else {
          io.emit('order.created', notification);
        }
      } else if (category === 'Inventory' && (message.toLowerCase().includes('low') || message.toLowerCase().includes('stock'))) {
        io.emit('inventory.low_stock', notification);
      } else if (category === 'Purchases' && message.toLowerCase().includes('received')) {
        io.emit('purchase.received', notification);
      } else if (category === 'Security') {
        io.emit('security.alert', notification);
      } else if (category === 'System' && message.toLowerCase().includes('backup')) {
        io.emit('backup.completed', notification);
      }
    }

    // Read notification preferences from system settings
    const settings = await prisma.systemSetting.findMany({
      where: { group: 'NotificationSettings' }
    });

    const emailEnabled = settings.find(s => s.key === 'email_notifications')?.value === 'true';
    const pushEnabled = settings.find(s => s.key === 'push_notifications')?.value === 'true';

    // Mock Dispatchers
    if (emailEnabled) {
      console.log(`[MOCK EMAIL SENT] Alert Category: ${category} | Priority: ${priority} | Message: ${message}`);
    }
    if (pushEnabled) {
      console.log(`[MOCK PUSH DISPATCHED] Alert Category: ${category} | Msg: ${message}`);
    }

    return notification;
  } catch (error) {
    console.error('[Notification Engine error]:', error.message);
  }
};

// Fetch all notifications with filters and search
const getNotifications = async (req, res) => {
  try {
    const { category, priority, isRead, search } = req.query;

    const filter: any = { tenantId: req.tenantId };
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (search) {
      filter.message = {
        contains: search
      };
    }

    const notifications = await prisma.notification.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.notification.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { isRead: true }
    });
    
    // Fetch it to emit
    const notification = await prisma.notification.findUnique({ where: { id } });
    
    if (req.io) {
      req.io.emit('notification.updated', notification);
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { tenantId: req.tenantId },
      data: { isRead: true }
    });

    if (req.io) {
      req.io.emit('notification.all_read');
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.deleteMany({ where: { id, tenantId: req.tenantId } });

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear all notifications
const clearAllNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { tenantId: req.tenantId } });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch preferences
const getPreferences = async (req, res) => {
  try {
    let settings = await prisma.systemSetting.findMany({
      where: { group: 'NotificationSettings' }
    });

    // Seed defaults if empty
    if (settings.length === 0) {
      await prisma.systemSetting.createMany({
        data: [
          { key: 'email_notifications', value: 'true', group: 'NotificationSettings' },
          { key: 'push_notifications', value: 'true', group: 'NotificationSettings' },
          { key: 'low_stock_alerts', value: 'true', group: 'NotificationSettings' },
          { key: 'security_alerts', value: 'true', group: 'NotificationSettings' }
        ]
      });
      settings = await prisma.systemSetting.findMany({
        where: { group: 'NotificationSettings' }
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save preferences
const savePreferences = async (req, res) => {
  try {
    const { preferences } = req.body; // Array of key-value pairs
    if (!preferences || !Array.isArray(preferences)) {
      return res.status(400).json({ success: false, message: 'Preferences array required' });
    }

    for (const pref of preferences) {
      await prisma.systemSetting.upsert({
        where: { key: pref.key },
        update: { value: pref.value.toString() },
        create: {
          key: pref.key,
          value: pref.value.toString(),
          group: 'NotificationSettings'
        }
      });
    }

    res.json({ success: true, message: 'Preferences saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getPreferences,
  savePreferences
};

export {};
