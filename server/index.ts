import express, { type Request, Response, NextFunction } from "express";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { networkInterfaces } from "os";
import { runMigrations } from "./migrate";
import { storage } from "./storage";
import { DatabaseStorage, initializeDatabase } from "./database-storage";
import { logUserActivity, logUserAuth, logSystemAlert, logDatabaseOperation, logApiRequest } from './logger';
import { emailService } from "./email-service";
import { db } from "./db";
import { ensureApprovalMonitoringTable } from "./ensure-approval-monitoring-table";
import { registerPageBuilderRoutes } from "./page-builder-routes"; // Import Page Builder routes
import { registerZabbixRoutes } from "./zabbix-api"; // Import Zabbix routes
import { registerEmailBulkSenderRoutes } from "./email-bulk-sender-routes"; // Import Email Bulk Sender routes

const app = express();
// Parse JSON and URL-encoded bodies with increased size limits for CSV imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Import database connection status
  const { databaseConnected } = await import("./db");

  console.log("🔄 Starting application initialization...");

  let usingDatabase = false;

  // Add a longer delay and verify connection more thoroughly
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Import fresh database connection status after delay
  const { databaseConnected: freshConnectionStatus, db: freshDb } = await import("./db");

  // Additional verification - try to connect directly
  let actualConnectionVerified = false;
  if (process.env.DATABASE_URL && freshDb) {
    try {
      const { sql } = await import("drizzle-orm");
      const testResult = await freshDb.execute(sql`SELECT 1 as connection_test`);
      actualConnectionVerified = testResult && testResult.rows && testResult.rows.length > 0;
      console.log("🔍 Direct connection test result:", actualConnectionVerified ? "✅ SUCCESS" : "❌ FAILED");

      if (actualConnectionVerified) {
        // Test VM monitoring table specifically
        try {
          await freshDb.execute(sql`SELECT COUNT(*) FROM vm_monitoring`);
          console.log("🔍 VM monitoring table accessible: ✅ SUCCESS");
        } catch (vmTableError) {
          console.log("🔍 VM monitoring table check: ⚠️ TABLE MISSING OR INACCESSIBLE");
        }
      }
    } catch (testError) {
      console.error("🔍 Direct connection test failed:", testError.message);
      actualConnectionVerified = false;
    }
  }

  // Prioritize PostgreSQL - attempt database operations if connection exists
  if ((freshConnectionStatus || databaseConnected || actualConnectionVerified) && process.env.DATABASE_URL && freshDb) {
    console.log("🔄 PostgreSQL connection verified - proceeding with comprehensive database verification...");
    console.log("🔧 Database URL configured:", process.env.DATABASE_URL ? "✅ YES" : "❌ NO");
    console.log("🔧 Database instance available:", freshDb ? "✅ YES" : "❌ NO");
    console.log("🔧 Connection status flags:", {
      freshConnectionStatus,
      databaseConnected,
      actualConnectionVerified
    });
    try {
      console.log("🔄 Running comprehensive database verification and auto-repair...");
      await runMigrations();

      // Initialize database storage
      try {
        await initializeDatabase();
        console.log("🔄 Initializing PostgreSQL storage...");

        // Create new database storage instance
        const databaseStorage = new DatabaseStorage();

        // Replace all methods on the storage object with database storage methods
        Object.getOwnPropertyNames(DatabaseStorage.prototype).forEach(name => {
          if (name !== 'constructor' && typeof databaseStorage[name] === 'function') {
            storage[name] = databaseStorage[name].bind(databaseStorage);
          }
        });

        usingDatabase = true;
        console.log("✅ PostgreSQL storage initialized successfully!");
        console.log("✅ Data will persist between restarts");

      } catch (error: any) {
        console.error("❌ Failed to initialize database storage:", error.message);
        console.warn("⚠️ Falling back to in-memory storage");
        usingDatabase = false;
      }

    } catch (migrationError: any) {
      console.error("❌ Database migrations failed:", migrationError.message);
      console.warn("⚠️ Falling back to in-memory storage");
      usingDatabase = false;
    }
  } else {
    console.log("⚠️ PostgreSQL not available - using in-memory storage");
    console.log("📝 Data will NOT persist between server restarts");
    console.log("💡 Set up PostgreSQL database for persistent storage");
    usingDatabase = false;
  }

  // Initialize email service
  setTimeout(async () => {
    try {
      console.log('📧 Initializing email service...');
      await emailService.initialize();
      console.log('✅ Email service initialization complete');
    } catch (error) {
      console.error('⚠️ Email service initialization failed:', error);
    }

    // Ensure approval_monitoring table exists
    console.log('Checking approval_monitoring table...');
    await ensureApprovalMonitoringTable();

    // Add automatic backup scheduler with complete data export
    const runScheduledBackup = async () => {
      try {
        const settings = await storage.getSystemSettings();

        if (settings?.autoBackup) {
          console.log('🔄 Running scheduled automatic backup with complete data export...');

          const fs = await import('fs');
          const path = await import('path');
          const backupDir = path.join(process.cwd(), 'backups');

          // Ensure backup directory exists
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('📁 Created backups directory:', backupDir);
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
          const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
          const backupFilename = `auto-backup-${timestamp}-${timeStamp}.sql`;
          const backupPath = path.join(backupDir, backupFilename);

          try {
            // Verify database connection
            if (!db) {
              throw new Error('Database connection not available');
            }

            // Create comprehensive backup content with schema and data
            let backupContent = `-- =============================================\n`;
            backupContent += `-- Automatic PostgreSQL Database Backup\n`;
            backupContent += `-- =============================================\n`;
            backupContent += `-- Created: ${new Date().toISOString()}\n`;
            backupContent += `-- Database: srph_mis\n`;
            backupContent += `-- Backup Schedule: Daily at ${settings.backupTime}\n`;
            backupContent += `-- =============================================\n\n`;

            const tablesToBackup = [
              'users', 'assets', 'activities', 'licenses', 'components',
              'accessories', 'consumables', 'license_assignments', 'consumable_assignments',
              'it_equipment', 'it_equipment_assignments', 'vm_inventory', 'bitlocker_keys',
              'iam_accounts', 'monitor_inventory', 'vm_approval_history', 'approval_monitoring',
              'azure_inventory', 'gcp_inventory', 'aws_inventory', 'system_settings',
              'zabbix_settings', 'zabbix_subnets', 'discovered_hosts', 'vm_monitoring',
              'aws_historical_data', 'azure_historical_data', 'gcp_historical_data',
              'iam_account_approval_history'
            ];

            let totalRecords = 0;
            let backedUpTables = 0;

            for (const table of tablesToBackup) {
              try {
                const { sql } = await import("drizzle-orm");

                // Get table data
                const tableData = await db.execute(sql.raw(`SELECT * FROM ${table}`));

                if (tableData.rows && tableData.rows.length > 0) {
                  const columns = Object.keys(tableData.rows[0]);
                  totalRecords += tableData.rows.length;
                  backedUpTables++;

                  backupContent += `\n-- =============================================\n`;
                  backupContent += `-- Table: ${table}\n`;
                  backupContent += `-- Total Records: ${tableData.rows.length}\n`;
                  backupContent += `-- =============================================\n\n`;

                  // Truncate table before insert
                  backupContent += `TRUNCATE TABLE ${table} CASCADE;\n\n`;

                  // Export each row with proper escaping
                  tableData.rows.forEach((row: any, index: number) => {
                    const values = columns.map(col => {
                      const value = row[col];

                      if (value === null || value === undefined) return 'NULL';

                      if (typeof value === 'string') {
                        const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "''");
                        return `'${escaped}'`;
                      }

                      if (value instanceof Date) {
                        return `'${value.toISOString()}'`;
                      }

                      if (typeof value === 'boolean') {
                        return value ? 'TRUE' : 'FALSE';
                      }

                      if (typeof value === 'object') {
                        const jsonStr = JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
                        return `'${jsonStr}'`;
                      }

                      if (typeof value === 'number') {
                        return value.toString();
                      }

                      return `'${String(value).replace(/'/g, "''")}'`;
                    });

                    backupContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
                  });

                  backupContent += `\n-- Completed ${table}: ${tableData.rows.length} rows exported\n\n`;
                }
              } catch (tableError: any) {
                console.warn(`⚠️ Warning: Could not backup table ${table}:`, tableError.message);
                backupContent += `\n-- ERROR backing up table ${table}:\n`;
                backupContent += `-- ${tableError.message}\n\n`;
              }
            }

            backupContent += `\n-- =============================================\n`;
            backupContent += `-- Backup Summary\n`;
            backupContent += `-- =============================================\n`;
            backupContent += `-- Total Tables Backed Up: ${backedUpTables}/${tablesToBackup.length}\n`;
            backupContent += `-- Total Records: ${totalRecords}\n`;
            backupContent += `-- Backup Completed: ${new Date().toISOString()}\n`;
            backupContent += `-- =============================================\n`;

            // Write backup file
            fs.writeFileSync(backupPath, backupContent, 'utf8');
            const fileSize = (fs.statSync(backupPath).size / 1024).toFixed(2);

            console.log(`✅ Automatic backup created successfully!`);
            console.log(`   File: ${backupFilename}`);
            console.log(`   Path: ${backupPath}`);
            console.log(`   Size: ${fileSize} KB`);
            console.log(`   Records: ${totalRecords}`);
            console.log(`   Tables: ${backedUpTables}/${tablesToBackup.length}`);

            // Log the backup activity
            await storage.createActivity({
              action: "backup",
              itemType: "database",
              itemId: 1,
              userId: 1,
              timestamp: new Date().toISOString(),
              notes: `Automatic database backup created: ${backupFilename} (${fileSize} KB, ${totalRecords} records across ${backedUpTables} tables)`,
            });

          } catch (backupError: any) {
            console.error('❌ Automatic backup failed:', backupError);
            console.error('   Error:', backupError.message);
            console.error('   Stack:', backupError.stack);

            await storage.createActivity({
              action: "backup_failed",
              itemType: "database",
              itemId: 1,
              userId: 1,
              timestamp: new Date().toISOString(),
              notes: `Automatic backup failed: ${backupError.message}`,
            });
          }
        } else {
          console.log('⏸️ Automatic backup skipped - autoBackup is disabled');
        }
      } catch (error: any) {
        console.error('❌ Error in scheduled backup:', error);
      }
    };

    // Track current backup timeout
    let currentBackupTimeout: NodeJS.Timeout | null = null;
    let lastKnownBackupTime: string | null = null;
    let lastKnownAutoBackupState: boolean | null = null;

    // Schedule automatic backups to run daily at configured time
    const scheduleNextBackup = async () => {
      // Clear any existing timeout
      if (currentBackupTimeout) {
        clearTimeout(currentBackupTimeout);
        currentBackupTimeout = null;
        console.log('🔄 Cleared previous backup schedule');
      }

      try {
        const settings = await storage.getSystemSettings();

        console.log('📋 Loading backup schedule settings:', {
          autoBackup: settings?.autoBackup,
          backupTime: settings?.backupTime,
          automaticBackups: settings?.automaticBackups
        });

        // Support both autoBackup and automaticBackups field names
        const isAutoBackupEnabled = settings?.autoBackup || settings?.automaticBackups || false;
        const backupTime = settings?.backupTime || '03:00';

        if (isAutoBackupEnabled && backupTime) {
          const now = new Date();
          const [hours, minutes] = backupTime.split(':');
          const scheduledTime = new Date();
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // If scheduled time has passed today, schedule for tomorrow
          if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }

          const msUntilBackup = scheduledTime.getTime() - now.getTime();
          const hoursUntil = Math.floor(msUntilBackup / (1000 * 60 * 60));
          const minutesUntil = Math.floor((msUntilBackup % (1000 * 60 * 60)) / (1000 * 60));

          console.log(`✅ Automatic backup ENABLED`);
          console.log(`📅 Next backup scheduled for: ${scheduledTime.toLocaleString()}`);
          console.log(`⏰ Time until backup: ${hoursUntil}h ${minutesUntil}m`);
          console.log(`🕐 Backup time setting: ${backupTime}`);

          // Store the current settings for change detection
          lastKnownBackupTime = backupTime;
          lastKnownAutoBackupState = isAutoBackupEnabled;

          currentBackupTimeout = setTimeout(async () => {
            console.log('⏰ Automatic backup triggered at scheduled time');
            try {
              await runScheduledBackup();
              console.log('✅ Scheduled backup completed successfully');
            } catch (err) {
              console.error('❌ Scheduled backup failed:', err);
            }
            // Schedule the next backup after this one completes
            scheduleNextBackup();
          }, msUntilBackup);
        } else {
          console.log('⏸️ Automatic backups are DISABLED');
          console.log(`   autoBackup: ${settings?.autoBackup}`);
          console.log(`   automaticBackups: ${settings?.automaticBackups}`);
          console.log(`   backupTime: ${settings?.backupTime}`);
          lastKnownBackupTime = null;
          lastKnownAutoBackupState = false;
        }
      } catch (err) {
        console.error('❌ Error scheduling backup:', err);
        // Retry scheduling after 1 hour if there's an error
        currentBackupTimeout = setTimeout(scheduleNextBackup, 60 * 60 * 1000);
      }
    };

    // Check for settings changes periodically
    const checkForBackupTimeChanges = async () => {
      try {
        const settings = await storage.getSystemSettings();

        // Handle both field names for backward compatibility
        const isAutoBackupEnabled = settings?.autoBackup ?? settings?.automaticBackups ?? false;
        const backupTime = settings?.backupTime || '03:00';

        // Check if auto backup was toggled or time changed
        if (isAutoBackupEnabled !== lastKnownAutoBackupState || backupTime !== lastKnownBackupTime) {
          console.log(`🔄 Backup settings changed:`);
          console.log(`   Auto backup: ${lastKnownAutoBackupState} → ${isAutoBackupEnabled}`);
          console.log(`   Backup time: ${lastKnownBackupTime} → ${backupTime}`);
          console.log(`   Re-scheduling backup...`);
          await scheduleNextBackup();
        }
      } catch (err) {
        console.error('Error checking backup time changes:', err);
      }
    };

    // Start backup scheduler after 5 seconds
    setTimeout(scheduleNextBackup, 5000);

    // Check for settings changes every 10 seconds (more frequent for better responsiveness)
    setInterval(checkForBackupTimeChanges, 10000);

    // Start daily expiration check (runs every 24 hours)
    const checkExpirations = async () => {
      try {
        console.log('🔍 Running daily expiration checks...');
        const settings = await storage.getSystemSettings();

        // Check IAM expirations
        if (settings?.notifyOnIamExpiration) {
          const iamAccounts = await storage.getIamAccounts();
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset to start of day

          const expiredAccounts = iamAccounts.filter((account: any) => {
            if (!account.durationEndDate) return false;

            const endDate = new Date(account.durationEndDate);
            endDate.setHours(0, 0, 0, 0); // Reset to start of day

            // Check if expired and not yet notified
            const isExpired = endDate < today;
            const notYetNotified = account.status !== 'expired_notified' &&
                                   account.status !== 'access_removed' &&
                                   account.status !== 'extended';

            return isExpired && notYetNotified;
          });

          console.log(`Found ${expiredAccounts.length} expired IAM accounts out of ${iamAccounts.length} total`);

          if (expiredAccounts.length > 0) {
            const accountsData = expiredAccounts.map((account: any) => ({
              requestor: account.requestor || 'N/A',
              knoxId: account.knoxId || 'N/A',
              name: account.name || null,
              permission: account.permission || 'N/A',
              cloudPlatform: account.cloudPlatform || 'N/A',
              endDate: account.durationEndDate,
              approvalId: account.approvalId || 'N/A'
            }));

            await emailService.sendIamExpirationNotification({ accounts: accountsData });

            // Update status to prevent re-sending
            for (const account of expiredAccounts) {
              await storage.updateIamAccount(account.id, { status: 'expired_notified' });
            }

            console.log(`✅ Sent notification for ${expiredAccounts.length} expired IAM account(s)`);
          }
        }

        // Check VM expirations
        if (settings?.notifyOnVmExpiration) {
          const vms = await storage.getVmInventory();
          const today = new Date();
          const expiredVMs = vms.filter((vm: any) => {
            if (!vm.endDate) return false;
            const endDate = new Date(vm.endDate);
            return today > endDate && vm.vmStatus === 'Overdue - Not Notified';
          });

          if (expiredVMs.length > 0) {
            const vmsData = expiredVMs.map((vm: any) => ({
              vmName: vm.vmName || 'N/A',
              knoxId: vm.knoxId || 'N/A',
              requestor: vm.requestor || 'N/A',
              department: vm.department || 'N/A',
              endDate: vm.endDate,
              approvalNumber: vm.approvalNumber || 'N/A'
            }));

            await emailService.sendVmExpirationNotification({ vms: vmsData });
            console.log(`✅ Sent notification for ${expiredVMs.length} expired VM(s)`);
          }
        }
      } catch (error) {
        console.error('❌ Error in expiration check:', error);
      }
    };

    // Run initial check after 1 minute
    setTimeout(checkExpirations, 60000);

    // Run daily checks (every 24 hours)
    setInterval(checkExpirations, 24 * 60 * 60 * 1000);
  }, 1000);


  // Ensure default admin user exists regardless of storage type
  setTimeout(async () => {
    try {
      // First verify MFA columns exist
      if (freshDb) {
        try {
          const { sql } = await import("drizzle-orm");
          await freshDb.execute(sql`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'mfa_enabled'
              ) THEN
                ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
              END IF;

              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'mfa_secret'
              ) THEN
                ALTER TABLE users ADD COLUMN mfa_secret TEXT;
              END IF;
            END $$;
          `);
          console.log('✅ MFA columns verified/added');
        } catch (mfaColError) {
          console.error('⚠️ MFA column verification failed:', mfaColError.message);
        }
      }

      console.log('🔧 Checking for default admin user...');
      const defaultAdmin = await storage.getUserByUsername('admin');

      if (!defaultAdmin) {
        console.log('Creating default admin user...');
        await storage.createUser({
          username: 'admin',
          password: 'admin123',
          email: 'admin@srph.com',
          firstName: 'Admin',
          lastName: 'User',
          department: 'IT',
          isAdmin: true
        });
        console.log('✅ Default admin user created successfully');
      } else {
        console.log('✅ Default admin user already exists');
      }
    } catch (error: any) {
      if (error.message === 'Failed to decrypt data') {
        console.error('❌ Encryption key mismatch detected!');
        console.error('⚠️  The data in your database was encrypted with a different key.');
        console.error('📋 Options:');
        console.error('   1. Restore the original ENCRYPTION_KEY in your .env file');
        console.error('   2. Run: npm run encrypt-data (after clearing old encrypted data)');
        console.error('   3. Delete your database and start fresh');
      } else {
        console.error('❌ Failed to initialize default admin user:', error);
      }
    }
  }, 2000);
})();

async function startServer() {
  const { requireAuth, requireAdmin } = setupAuth(app);
  const server = await registerRoutes(app);

// Register Page Builder routes
  registerPageBuilderRoutes(app, requireAuth, requireAdmin);

  // Register Zabbix routes
  registerZabbixRoutes(app, requireAuth);

  // Register Email Bulk Sender routes
  registerEmailBulkSenderRoutes(app, requireAuth);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Get the local machine's IP address
  function getLocalIP() {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1'; // fallback
  }

  // Serve the app on port 5000 for Replit
  const PORT = 5000;
  const host = "0.0.0.0";
  const localIP = getLocalIP();

  server.listen({
    port: PORT,
    host,
  }, () => {
    log(`serving on port ${PORT}`);
    console.log(`\n🚀 SRPH-MIS is running at: http://0.0.0.0:${PORT}`);
    console.log(`💻 Access your app through Replit's webview`);
    console.log(`🌐 Network access: http://${localIP}:${PORT}\n`);

    // Test logger functionality
    logDatabaseOperation({
      type: 'migration',
      status: 'completed',
      details: 'Server startup logging test'
    });
    logUserActivity({
      action: 'server_started',
      details: 'Application initialized successfully'
    });
    logUserAuth({
      username: 'system',
      action: 'login',
      ipAddress: '127.0.0.1'
    });
    logSystemAlert({
      level: 'info',
      message: 'Server started successfully',
      details: { port: PORT }
    });
    logApiRequest({
      method: 'SYSTEM',
      path: '/startup',
      statusCode: 200
    });
  });
}

startServer();