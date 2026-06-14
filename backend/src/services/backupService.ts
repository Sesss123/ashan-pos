const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 / R2 Configuration from Environment
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// Optional S3 / AWS Configuration fallback
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Encryption Secret Key (Must be 32 bytes/characters for AES-256)
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'super_secret_backup_key_32_chars!';

// Initialize standard S3 client compatible with Cloudflare R2 or AWS S3
let s3Client = null;
let bucketName = '';

if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT && R2_BUCKET_NAME) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
  bucketName = R2_BUCKET_NAME;
  console.log('[Backup] Configured Cloudflare R2 cloud storage.');
} else if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_BUCKET_NAME) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
  bucketName = AWS_BUCKET_NAME;
  console.log('[Backup] Configured AWS S3 cloud storage.');
} else {
  console.log('[Backup] Cloud storage credentials missing. Backups will only save locally.');
}

/**
 * Encrypt a backup file using AES-256-GCM.
 */
const encryptFile = (sourcePath, targetPath) => {
  const iv = crypto.randomBytes(12); // 12-byte initialization vector for GCM
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const source = fs.readFileSync(sourcePath);
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine IV (12 bytes) + Tag (16 bytes) + Encrypted Data
  const result = Buffer.concat([iv, tag, encrypted]);
  fs.writeFileSync(targetPath, result);
};

/**
 * Decrypt a backup file using AES-256-GCM.
 */
const decryptFile = (sourcePath, targetPath) => {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const data = fs.readFileSync(sourcePath);

  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(targetPath, decrypted);
};

/**
 * Upload an encrypted backup to Cloudflare R2 or AWS S3.
 */
const uploadToCloud = async (localFilePath, cloudFileName) => {
  if (!s3Client || !bucketName) {
    console.log('[Backup] Cloud backup skipped: credentials not configured.');
    return null;
  }

  try {
    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cloudFileName,
      Body: fileStream,
      ContentType: 'application/octet-stream'
    });

    await s3Client.send(command);
    console.log(`[Backup] Uploaded encrypted backup to cloud: ${cloudFileName}`);
    return `cloud://${bucketName}/${cloudFileName}`;
  } catch (error) {
    console.error('[Backup] Cloud upload failed:', error.message);
    throw error;
  }
};

/**
 * Download an encrypted backup from Cloudflare R2 or AWS S3.
 */
const downloadFromCloud = async (cloudFileName, localFilePath) => {
  if (!s3Client || !bucketName) {
    console.log('[Backup] Cloud download skipped: credentials not configured.');
    return false;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cloudFileName
    });

    const response = await s3Client.send(command);
    const stream = response.Body;
    const fileStream = fs.createWriteStream(localFilePath);
    
    return new Promise((resolve, reject) => {
      stream.pipe(fileStream);
      stream.on('error', (err) => reject(err));
      fileStream.on('finish', () => resolve(true));
    });
  } catch (error) {
    console.error('[Backup] Cloud download failed:', error.message);
    return false;
  }
};

/**
 * Trigger an automatic scheduled backup (runs daily).
 */
const runDailyBackup = async (prisma, io) => {
  try {
    console.log('[Backup Scheduler] Starting automatic daily backup...');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const rawFileName = `auto_backup_${timestamp}.db`;
    const encryptedFileName = `${rawFileName}.enc.gz`;
    
    const BACKUP_DIR = path.join(__dirname, '../../../../backups');
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const DB_PATH = path.join(__dirname, '../../prisma/dev.db');
    const localRawPath = path.join(BACKUP_DIR, rawFileName);
    const localEncryptedPath = path.join(BACKUP_DIR, encryptedFileName);

    // 1. Copy database file to local backup dir
    fs.copyFileSync(DB_PATH, localRawPath);

    // 2. Encrypt the database backup file
    encryptFile(localRawPath, localEncryptedPath);
    fs.unlinkSync(localRawPath); // delete unencrypted copy

    // 3. Upload encrypted backup to Cloud Storage (R2 / S3)
    const cloudUrl = await uploadToCloud(localEncryptedPath, encryptedFileName);

    // 4. Get file size
    const stats = fs.statSync(localEncryptedPath);

    // 5. Create BackupLog entry in DB
    const backupLog = await prisma.backupLog.create({
      data: {
        fileUrl: cloudUrl || `/backups/${encryptedFileName}`,
        status: 'Success',
        sizeBytes: stats.size
      }
    });

    // 6. Emit Socket.IO alert & Database Notification
    const notification = await prisma.notification.create({
      data: { message: `Automatic daily backup completed successfully: ${encryptedFileName}` }
    });

    if (io) {
      io.emit('notification.created', notification);
      io.emit('backup.completed', backupLog);
    }

    console.log('[Backup Scheduler] Automatic daily backup completed successfully!');
  } catch (error) {
    console.error('[Backup Scheduler] Automatic daily backup failed:', error.message);
    if (prisma) {
      await prisma.backupLog.create({
        data: {
          fileUrl: 'N/A',
          status: 'Failed',
          sizeBytes: 0
        }
      });
    }
  }
};

/**
 * Start the daily cron check (executes daily at midnight local time).
 */
const initBackupScheduler = (prisma, io) => {
  console.log('[Backup Scheduler] Initialized.');

  // Run a check every hour
  setInterval(() => {
    const now = new Date();
    // Run backup at 00:00 (Midnight)
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      runDailyBackup(prisma, io);
    }
  }, 60000); // Check every minute
};

export {
  encryptFile,
  decryptFile,
  uploadToCloud,
  downloadFromCloud,
  runDailyBackup,
  initBackupScheduler
};
