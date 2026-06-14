const prisma = require('../config/db').default || require('../config/db');

// Default enterprise settings template for reset
const DEFAULT_SETTINGS = [
  // Restaurant Settings
  { key: 'restaurant_name', value: 'Ashn ERP Restaurant', group: 'Restaurant' },
  { key: 'restaurant_email', value: 'info@ashn.com', group: 'Restaurant' },
  { key: 'restaurant_phone', value: '+94 77 123 4567', group: 'Restaurant' },
  { key: 'restaurant_address', value: '123 Colombo Road, Colombo', group: 'Restaurant' },
  { key: 'restaurant_currency', value: '$', group: 'Restaurant' },
  { key: 'restaurant_timezone', value: 'Asia/Colombo', group: 'Restaurant' },
  { key: 'localization_language', value: 'si', group: 'Restaurant' }, // si for Sinhala default

  // Tax Settings
  { key: 'tax_rate', value: '0.08', group: 'Tax' },
  { key: 'service_charge_rate', value: '0.10', group: 'Tax' },
  { key: 'tax_enabled', value: 'true', group: 'Tax' },

  // Payment Settings
  { key: 'qr_payment_enabled', value: 'true', group: 'Payment' },
  { key: 'qr_payment_merchant', value: 'AshnPOS_Pay', group: 'Payment' },
  { key: 'credit_card_enabled', value: 'true', group: 'Payment' },
  { key: 'cash_enabled', value: 'true', group: 'Payment' },

  // Printer Settings
  { key: 'printer_ip', value: '192.168.1.100', group: 'Printer' },
  { key: 'printer_port', value: '9100', group: 'Printer' },
  { key: 'auto_print_receipts', value: 'true', group: 'Printer' },

  // Notification Settings
  { key: 'email_notifications', value: 'true', group: 'Notification' },
  { key: 'push_notifications', value: 'true', group: 'Notification' },
  { key: 'low_stock_alerts', value: 'true', group: 'Notification' },
  { key: 'security_alerts', value: 'true', group: 'Notification' },

  // Theme Settings
  { key: 'theme_mode', value: 'dark', group: 'Theme' },
  { key: 'primary_color', value: '#6366F1', group: 'Theme' },
  { key: 'secondary_color', value: '#10B981', group: 'Theme' },

  // Branch Settings
  { key: 'default_branch_id', value: '', group: 'Branch' },
  { key: 'multi_branch_sync', value: 'true', group: 'Branch' },

  // API Settings
  { key: 'api_key_enabled', value: 'false', group: 'API' },
  { key: 'webhook_url', value: '', group: 'API' }
];

// Get public settings for Login Screen and App Bootstrapping (Safe settings only)
const getPublicSettings = async (req, res) => {
  try {
    const publicKeys = ['restaurant_name', 'restaurant_currency', 'tax_rate', 'service_charge_rate', 'theme_mode'];
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: publicKeys } }
    });
    
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    // Fallbacks if not found
    if (!settingsObj.restaurant_name) settingsObj.restaurant_name = 'AshnPOS';
    if (!settingsObj.restaurant_currency) settingsObj.restaurant_currency = '$';
    if (!settingsObj.tax_rate) settingsObj.tax_rate = '0';
    if (!settingsObj.service_charge_rate) settingsObj.service_charge_rate = '0';
    
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public settings', error: error.message });
  }
};

// Get all system settings or filter by group
const getSettings = async (req, res) => {
  try {
    const { group } = req.query;
    const filter = group ? { group } : {};
    
    let settings = await prisma.systemSetting.findMany({ where: filter });
    
    // Seed default settings if database is empty
    if (settings.length === 0 && !group) {
      await prisma.systemSetting.createMany({ data: DEFAULT_SETTINGS });
      settings = await prisma.systemSetting.findMany();
    }
    
    // Convert array to a key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
};

// Update multiple settings at once and log history
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Expects { settings: { tax_rate: "0.18", primary_color: "#6366F1" } }
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }
    
    const changedBy = req.user?.name || 'Authorized Admin';
    const updatedSettings = [];
    
    // Perform operations in transaction
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        const oldSetting = await tx.systemSetting.findUnique({ where: { key } });
        const oldValue = oldSetting ? oldSetting.value : null;
        
        // Skip writing history if the value hasn't changed
        if (oldValue === String(value)) continue;

        // Determine group dynamically from DEFAULT_SETTINGS template
        const template = DEFAULT_SETTINGS.find(d => d.key === key);
        const group = template ? template.group : 'General';

        const updated = await tx.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), group }
        });

        // Write change history
        await tx.systemSettingHistory.create({
          data: {
            settingId: updated.id,
            key,
            oldValue,
            newValue: String(value),
            changedBy
          }
        });

        // Write to audit log
        await tx.auditLog.create({
          data: {
            userId: req.user?.id || null,
            branchId: req.user?.branchId || null,
            module: 'Settings',
            action: 'UPDATE_SETTING',
            details: `Updated setting ${key} from "${oldValue || ''}" to "${value}"`
          }
        });

        updatedSettings.push(updated);
      }
    });
    
    // Broadcast updated settings to clients via Socket.io
    if (req.io) {
      req.io.emit('settings.updated', settings);
    }
    
    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
};

// Fetch version history of settings changes
const getSettingsHistory = async (req, res) => {
  try {
    const history = await prisma.systemSettingHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings history', error: error.message });
  }
};

// Reset all settings to factory default templates
const resetSettings = async (req, res) => {
  try {
    const changedBy = req.user?.name || 'Authorized Admin';

    await prisma.$transaction(async (tx) => {
      // Log history of changes for everything we are resetting
      for (const def of DEFAULT_SETTINGS) {
        const oldSetting = await tx.systemSetting.findUnique({ where: { key: def.key } });
        const oldValue = oldSetting ? oldSetting.value : null;

        if (oldValue === def.value) continue;

        const updated = await tx.systemSetting.upsert({
          where: { key: def.key },
          update: { value: def.value },
          create: { key: def.key, value: def.value, group: def.group }
        });

        await tx.systemSettingHistory.create({
          data: {
            settingId: updated.id,
            key: def.key,
            oldValue,
            newValue: def.value,
            changedBy
          }
        });
      }

      // Clear any custom settings not in default list to clean DB completely
      const defaultKeys = DEFAULT_SETTINGS.map(d => d.key);
      await tx.systemSetting.deleteMany({
        where: {
          key: { notIn: defaultKeys }
        }
      });

      // Log to audit log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id || null,
          branchId: req.user?.branchId || null,
          module: 'Settings',
          action: 'RESET_SETTINGS',
          details: 'Reset all system settings to enterprise defaults'
        }
      });
    });

    const newSettings = await prisma.systemSetting.findMany();
    const settingsObj = {};
    newSettings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    if (req.io) {
      req.io.emit('settings.updated', settingsObj);
    }

    res.json({ success: true, message: 'Settings reset to defaults', data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset settings', error: error.message });
  }
};

module.exports = {
  getPublicSettings,
  getSettings,
  updateSettings,
  getSettingsHistory,
  resetSettings
};
