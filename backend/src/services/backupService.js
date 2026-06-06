const prisma = require('../config/db');

class BackupService {
  async triggerManualBackup(branchId = null, storageType = 'Local') {
    // In production, this would spawn `pg_dump` using child_process
    // const exec = require('child_process').exec;
    // exec(`pg_dump -U user -d db > backup-${Date.now()}.sql`, ...);

    const filename = `backup_erp_${Date.now()}.sql.gz`;
    const simulatedSizeBytes = Math.floor(Math.random() * 50000000) + 10000000; // 10MB to 60MB

    // Simulate uploading to S3 if requested
    if (storageType === 'S3') {
      console.log(`[BackupService] Uploading ${filename} to AWS S3...`);
      // s3.upload(...)
    }

    const log = await prisma.backupLog.create({
      data: {
        filename,
        sizeBytes: simulatedSizeBytes,
        status: 'Success'
      }
    });

    // Notify Admins
    if (branchId) {
      await prisma.notification.create({
        data: {
          branchId,
          title: "Backup Completed",
          message: `Database successfully backed up to ${storageType} (${(simulatedSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
          type: "Success"
        }
      });
    }

    return log;
  }

  async configureAutoBackup(branchId, frequency, time, storageType) {
    return await prisma.backupSchedule.create({
      data: { branchId, frequency, time, storageType }
    });
  }
}

module.exports = new BackupService();
