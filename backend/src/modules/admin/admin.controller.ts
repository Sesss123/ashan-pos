const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const util = require('util');
const pipe = util.promisify(pipeline);
const bcrypt = require('bcrypt');
const { encryptFile, decryptFile, uploadToCloud, downloadFromCloud } = require('../../services/backupService');
const prisma = require('../../config/db').default || require('../../config/db');
const socketEmitter = require('../../realtime/socketEmitter');

const BACKUP_DIR = path.join(__dirname, '../../../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const DB_PATH = path.join(__dirname, '../../../../dev.db');

// System Settings
const getSettings = async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, group } = req.body;

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, group },
      create: { key, value, group: group || 'General' }
    });

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettingsBatch = async (req, res) => {
  try {
    const { settings } = req.body; // Expects settings: { restaurantName: '...', ... }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }

    const result = await prisma.$transaction(
      Object.entries(settings).map(([key, value]) => 
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), group: 'General' }
        })
      )
    );

    if (req.io) {
      req.io.emit('settings.updated', settings);
    }

    res.json({ success: true, message: 'Settings updated successfully', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Branches
const getBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany();
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBranch = async (req, res) => {
  try {
    const { name, location, contact } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Branch name is required' });
    }

    // 1. Generate a URL/email safe slug from the branch name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove special characters
      .trim()
      .replace(/\s+/g, '.'); // replace spaces with dots

    const safeSlug = slug || 'branch';
    const cashierEmail = `${safeSlug}.cashier@ashnpos.local`;
    const waiterEmail = `${safeSlug}.waiter@ashnpos.local`;
    
    // Default easy-to-use passwords based on branch slug
    const cashierPasswordText = `${safeSlug}.cashier123`;
    const waiterPasswordText = `${safeSlug}.waiter123`;

    // Hash passwords before database creation
    const hashedCashierPassword = await bcrypt.hash(cashierPasswordText, 10);
    const hashedWaiterPassword = await bcrypt.hash(waiterPasswordText, 10);

    // Run database insertions inside a transaction to ensure complete branch setup
    const result = await prisma.$transaction(async (tx) => {
      // 2. Create the branch record
      const branch = await tx.branch.create({
        data: { name, location, contact }
      });

      // 3. Create Cashier User linked to the branch
      let uniqueCashierEmail = cashierEmail;
      const existingCashier = await tx.user.findUnique({ where: { email: uniqueCashierEmail } });
      if (existingCashier) {
        uniqueCashierEmail = `${safeSlug}.${branch.id.substring(0, 4)}.cashier@ashnpos.local`;
      }
      await tx.user.create({
        data: {
          name: `${name} Cashier`,
          email: uniqueCashierEmail,
          password: hashedCashierPassword,
          role: 'Cashier',
          branchId: branch.id
        }
      });

      // 4. Create Waiter User linked to the branch
      let uniqueWaiterEmail = waiterEmail;
      const existingWaiter = await tx.user.findUnique({ where: { email: uniqueWaiterEmail } });
      if (existingWaiter) {
        uniqueWaiterEmail = `${safeSlug}.${branch.id.substring(0, 4)}.waiter@ashnpos.local`;
      }
      await tx.user.create({
        data: {
          name: `${name} Waiter`,
          email: uniqueWaiterEmail,
          password: hashedWaiterPassword,
          role: 'Waiter',
          branchId: branch.id
        }
      });

      return {
        branch,
        credentials: {
          cashier: {
            email: uniqueCashierEmail,
            password: cashierPasswordText
          },
          waiter: {
            email: uniqueWaiterEmail,
            password: waiterPasswordText
          }
        }
      };
    });

    // Return the created branch info and generated credentials to display on the UI
    res.status(201).json({ 
      success: true, 
      data: result.branch, 
      credentials: result.credentials 
    });

    // Emit real-time event AFTER responding (non-blocking)
    socketEmitter.branch.created(req.io, result.branch);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'branch_create' });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, contact, isActive } = req.body;
    const branch = await prisma.branch.update({
      where: { id },
      data: { name, location, contact, isActive }
    });

    // Emit real-time event (broadcast + branch-specific room)
    socketEmitter.branch.updated(req.io, branch);

    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /admin/branches/:id/stats
 * Returns today's sales KPIs for a specific branch.
 */
const getBranchStats = async (req, res) => {
  try {
    const { id } = req.params;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch today's completed orders for this branch
    const orders = await prisma.order.findMany({
      where: {
        branchId: id,
        status: 'Completed',
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: { payments: true }
    });

    // Count active (occupied) tables for this branch
    const activeTables = await prisma.table.count({
      where: { branchId: id, status: 'Occupied' }
    });

    const totalTables = await prisma.table.count({
      where: { branchId: id }
    });

    // Count staff logged in (users assigned to this branch)
    const totalStaff = await prisma.user.count({
      where: { branchId: id, isActive: true }
    });

    const dailySales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;

    res.json({
      success: true,
      data: {
        dailySales,
        totalOrders,
        activeTables,
        totalTables,
        totalStaff
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Backups
const getBackups = async (req, res) => {
  try {
    const backups = await prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Format output as requested
    const formatted = backups.map(b => ({
      id: b.id,
      file: b.fileUrl.split('/').pop(),
      createdAt: b.createdAt.toISOString().split('T')[0]
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBackupById = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await prisma.backupLog.findUnique({ where: { id } });
    if (!backup) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: backup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await prisma.backupLog.findUnique({ where: { id } });
    if (!backup) return res.status(404).json({ success: false, message: 'Not found' });
    
    const filePath = path.join(BACKUP_DIR, path.basename(backup.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await prisma.backupLog.delete({ where: { id } });
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const compressedFileName = `backup_${timestamp}.db.gz`;
    const encryptedFileName = `${compressedFileName}.enc`;
    
    const localCompressedPath = path.join(BACKUP_DIR, compressedFileName);
    const localEncryptedPath = path.join(BACKUP_DIR, encryptedFileName);
    
    // 1. Database Dump & Compress (Gzip)
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(DB_PATH);
    const destination = fs.createWriteStream(localCompressedPath);
    await pipe(source, gzip, destination);
    
    // 2. Encrypt the compressed database file (AES-256-GCM)
    encryptFile(localCompressedPath, localEncryptedPath);
    
    // Clean up unencrypted compressed file
    fs.unlinkSync(localCompressedPath);
    
    // 3. Upload to Cloud Storage if configured
    const cloudUrl = await uploadToCloud(localEncryptedPath, encryptedFileName);
    
    // Get encrypted file size
    const stats = fs.statSync(localEncryptedPath);
    
    // 4. Create BackupLog entry in database
    const backup = await prisma.backupLog.create({
      data: {
        fileUrl: cloudUrl || `/backups/${encryptedFileName}`,
        status: 'Success',
        sizeBytes: stats.size
      }
    });

    // 5. Log System Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: req.user?.branchId || null,
        module: 'System',
        action: 'RUN_BACKUP',
        details: `Manual backup successfully created, compressed and encrypted: ${encryptedFileName}`
      }
    });
    
    // 6. Emit Socket.IO alert & Database Notification
    const notification = await prisma.notification.create({
      data: { 
        message: `System backup completed successfully: ${encryptedFileName}`,
        category: 'System',
        priority: 'Medium'
      }
    });
    // Use socketEmitter for consistent room-targeted events
    socketEmitter.notification.created(req.io, notification);
    socketEmitter.backup.completed(req.io, backup);

    res.status(201).json({ success: true, message: 'Backup created successfully', data: backup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const restoreBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await prisma.backupLog.findUnique({ where: { id } });
    if (!backup) return res.status(404).json({ success: false, message: 'Backup not found' });
    
    const backupFileName = path.basename(backup.fileUrl);
    const localEncryptedPath = path.join(BACKUP_DIR, backupFileName);
    
    // Download from Cloud if missing from local backups directory
    if (!fs.existsSync(localEncryptedPath)) {
      if (backup.fileUrl.startsWith('cloud://')) {
        console.log(`[Backup] Downloading backup ${backupFileName} from S3/R2...`);
        const downloaded = await downloadFromCloud(backupFileName, localEncryptedPath);
        if (!downloaded) {
          return res.status(500).json({ success: false, message: 'Failed to download backup from cloud storage' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Backup file missing from local disk and cloud storage' });
      }
    }
    
    const decryptedTempPath = path.join(BACKUP_DIR, `temp_restore_${Date.now()}.gz`);
    const finalDbTempPath = path.join(BACKUP_DIR, `temp_restore_final_${Date.now()}.db`);
    
    // 1. Decrypt the backup file using AES-256-GCM
    decryptFile(localEncryptedPath, decryptedTempPath);
    
    // 2. Decompress the decrypted database (Gunzip)
    const gunzip = zlib.createGunzip();
    const sourceStream = fs.createReadStream(decryptedTempPath);
    const destStream = fs.createWriteStream(finalDbTempPath);
    await pipe(sourceStream, gunzip, destStream);
    
    // Clean up temporary decrypted compressed file
    fs.unlinkSync(decryptedTempPath);

    // 3. Hot-swap the active SQLite database
    await prisma.$disconnect();
    
    fs.copyFileSync(finalDbTempPath, DB_PATH);
    fs.unlinkSync(finalDbTempPath); // clean up

    await prisma.$connect();
    
    // 4. Log Audit Log & Notifications
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: req.user?.branchId || null,
        module: 'System',
        action: 'RESTORE_BACKUP',
        details: `System restored from backup: ${backupFileName}`
      }
    });

    const notification = await prisma.notification.create({
      data: { 
        message: `System restored from backup: ${backupFileName}`,
        category: 'System',
        priority: 'High'
      }
    });
    if (req.io) {
      req.io.emit('notification.created', notification);
    }
    
    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (error) {
    await prisma.$connect(); // Try to reconnect if failed
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sessions & Security History
const getActiveSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { expiresAt: { gte: new Date() } },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.session.delete({ where: { id } });
    
    // Broadcast socket event to force logout on client
    if (req.io) {
      req.io.emit('session.revoked', id);
    }
    
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const history = await prisma.loginHistory.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSetting,
  updateSettingsBatch,
  getBranches,
  createBranch,
  updateBranch,
  getBranchStats,
  getBackups,
  getBackupById,
  deleteBackup,
  runBackup,
  restoreBackup,
  getActiveSessions,
  revokeSession,
  getLoginHistory
};
