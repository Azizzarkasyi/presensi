import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

export const startCleanupCron = () => {
  // Schedule a job to run at 02:00 AM every day
  cron.schedule('0 2 * * *', () => {
    console.log('[CRON] Running daily upload cleanup task...');
    
    // Target directory: absolute path to uploads folder at the root of 'absensi'
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    
    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log(`[CRON] Uploads directory not found: ${uploadsDir}`);
      return;
    }

    // 30 days in milliseconds
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        // Ensure we only delete files, not directories (if any exist)
        if (stats.isFile()) {
          const fileAge = now - stats.mtimeMs;
          
          if (fileAge > THIRTY_DAYS_MS) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
      
      console.log(`[CRON] Cleanup finished. Deleted ${deletedCount} files older than 30 days.`);
    } catch (error) {
      console.error('[CRON] Failed to run cleanup task:', error);
    }
  });
  
  console.log('[CRON] Automated cleanup task scheduled (runs daily at 02:00 AM)');
};
