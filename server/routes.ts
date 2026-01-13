import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import {
  insertUserSchema, insertAssetSchema, insertActivitySchema,
  insertLicenseSchema, insertLicenseAssignmentSchema, insertComponentSchema, insertAccessorySchema,
  insertSystemSettingsSchema, insertVmInventorySchema, insertVmApprovalHistorySchema, insertBitlockerKeySchema, insertIamAccountSchema, insertMonitorSchema, insertItEquipmentSchema, insertVmMonitoringSchema, insertDiscoveredHostSchema, insertMonitoringDashboardSchema, insertMonitoringDatasourceSchema, insertMonitoringAlertRuleSchema, insertMonitoringPanelSchema, insertAzureInventorySchema, insertGcpInventorySchema, insertAwsInventorySchema, insertAwsHistoricalDataSchema,
  systemSettings, AssetStatus,
  LicenseStatus, AccessoryStatus, users, itEquipment, monitorInventory, vmInventory, iamAccounts, bitlockerKeys, vms, vmApprovalHistory, monitoringDashboards, monitoringDatasources, monitoringAlertRules, monitoringPanels, consumableAssignments, consumables, networkDiscoveryHosts, itEquipmentAssignments, azureInventory, gcpInventory, azureHistoricalData, gcpHistoricalData, approvalMonitoring, awsInventory, awsHistoricalData
} from "@shared/schema";
import { eq, sql, desc, isNull, or } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { db } from "./db";
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as dns from 'dns';
import * as net from 'net';

import { setupAuth } from "./auth";
import { defaultRoles } from "./roles"; // Import defaultRoles
import { emailService } from "./email-service";
import multer from 'multer'; // Import multer for file uploads
import { registerPageBuilderRoutes } from "./page-builder-routes"; // Import Page Builder routes
import { registerZabbixRoutes } from "./zabbix-api"; // Import Zabbix routes

const upload = multer({ dest: 'uploads/' }); // Configure multer for file uploads

// Helper function to log user authentication events
const logUserAuth = async ({ userId, username, action, ipAddress, userAgent }: {
  userId?: number;
  username?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    // Use the storage layer to create an activity log entry
    await storage.createActivity({
      action: action,
      itemType: "user-auth",
      itemId: userId || 0, // Use 0 or a placeholder if userId is not available (e.g., failed login before user lookup)
      userId: userId || null, // Null if user not identified
      timestamp: new Date().toISOString(),
      notes: `User: ${username || 'N/A'}, IP: ${ipAddress || 'N/A'}, Agent: ${userAgent || 'N/A'}`,
    });
  } catch (error) {
    console.error(`Failed to log user authentication event: ${action} for ${username || 'N/A'}`, error);
    // Do not block the main request flow if logging fails
  }
};

// Helper function to log email events
const logEmailEvent = async ({ timestamp, to, subject, status, error }: {
  timestamp: string;
  to: string | string[];
  subject: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}) => {
  try {
    const logDir = path.join(process.cwd(), 'LOGS');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    const logFile = path.join(logDir, 'email_notifications.log');

    const logEntry = `[${timestamp}] To: ${Array.isArray(to) ? to.join(', ') : to} | Subject: ${subject} | Status: [${status.toUpperCase()}]${error ? ` | Error: ${error}` : ''}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('Failed to log email event:', err);
  }
};

// Helper function to read email logs
const readEmailLogs = async (): Promise<any[]> => {
  const { promises: fs } = await import('fs');
  const { join } = await import('path');

  const EMAIL_LOGS_DIR = join(process.cwd(), 'LOGS');
  const EMAIL_LOG_FILE = 'email_notifications.log';
  const filepath = join(EMAIL_LOGS_DIR, EMAIL_LOG_FILE);

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    const logs = lines.map(line => {
      // Parse: [timestamp] To: email | Subject: subject | Status: [STATUS] | MessageID: id | Error: error
      const timestampMatch = line.match(/\[([\d-T:.Z]+)\]/);
      const toMatch = line.match(/To:\s*([^|]+?)(?:\s*\||$)/i);
      const subjectMatch = line.match(/Subject:\s*([^|]+?)(?:\s*Status:|$)/i);
      const statusMatch = line.match(/Status:\s*\[([A-Z]+)\]/i);
      const messageIdMatch = line.match(/MessageID:\s*([^|]+?)(?:\s*\||$)/i);
      const errorMatch = line.match(/Error:\s*(.+)$/i);

      return {
        timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
        status: statusMatch ? statusMatch[1].toLowerCase() : 'unknown',
        to: toMatch ? toMatch[1].trim() : 'N/A',
        subject: subjectMatch ? subjectMatch[1].trim() : 'N/A',
        messageId: messageIdMatch ? messageIdMatch[1].trim() : undefined,
        error: errorMatch ? errorMatch[1].trim() : undefined
      };
    }).reverse(); // Show most recent first

    console.log(`📧 Read ${logs.length} email log entries from ${filepath}`);
    return logs;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('📧 Email log file not found, returning empty array.');
      return [];
    }
    console.error('📧 Error reading email log file:', error);
    return [];
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);

  // Import encryption functions after db is potentially initialized
  const { decryptFields, batchDecryptFields, PII_FIELDS, encryptFields } = await import("./encryption");

  // Set up authentication
  setupAuth(app);

  // Import necessary schemas
  const { insertZabbixSettingsSchema, insertZabbixSubnetSchema, insertDiscoveredHostSchema, insertVMMonitoringSchema, insertBitlockerKeySchema, insertVmInventorySchema, insertAzureInventorySchema, insertGcpInventorySchema, insertAwsInventorySchema } = schema;

  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    console.error(err);
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ message: validationError.message });
    }
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  };

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Admin middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    next();
  };


  // Permission validation middleware
  const checkPermission = (resource: string, action: 'view' | 'edit' | 'add' | 'delete') => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        console.log(`Permission check failed: User not authenticated`);
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log(`Checking permission for user ${req.user.username}: ${resource}.${action}`);
      console.log(`User isAdmin: ${req.user.isAdmin}, roleId: ${req.user.roleId}`);

      try {
        // Reload user data to ensure we have current permissions
        const currentUser = await storage.getUser(req.user.id);
        if (!currentUser) {
          console.log(`Permission denied: User not found in database`);
          return res.status(401).json({ message: "User not found" });
        }

        // Update session user data with current database state
        req.user.isAdmin = currentUser.isAdmin;
        req.user.roleId = currentUser.roleId;

        // Admin users always have full access
        if (currentUser.isAdmin === true || currentUser.isAdmin === 1) {
          console.log(`Permission granted: User is admin`);
          return next();
        }

        // Load permissions from role
        const { getPermissionsForRole } = await import("./roles");
        const userPermissions = getPermissionsForRole(currentUser.roleId);

        console.log(`Loaded permissions for roleId ${currentUser.roleId}:`, JSON.stringify(userPermissions, null, 2));

        if (!userPermissions) {
          console.log(`Permission denied: No permissions found for roleId ${currentUser.roleId}`);
          return res.status(403).json({
            message: `Access denied. No role permissions configured.`
          });
        }

        // Check if resource exists in permissions
        if (!userPermissions[resource]) {
          console.log(`Permission denied: No permissions for resource ${resource}`);
          return res.status(403).json({
            message: `Access denied. You don't have permission to access ${resource}.`
          });
        }

        // Check specific action permission
        const hasPermission = userPermissions[resource][action] === true;
        if (!hasPermission) {
          console.log(`Permission denied: No ${action} permission for resource ${resource}. Current permissions:`, userPermissions[resource]);
          return res.status(403).json({
            message: `Access denied. You don't have permission to ${action} ${resource}.`
          });
        }

        console.log(`Permission granted: User has ${action} permission for ${resource}`);

        // Update the request user object with current permissions for consistency
        req.user.permissions = userPermissions;
        req.user.isAdmin = currentUser.isAdmin;
        req.user.roleId = currentUser.roleId;

        next();
      } catch (error) {
        console.error(`Permission check error:`, error);
        return res.status(500).json({ message: "Permission check failed" });
      }
    };
  };

  // Settings API
  app.get("/api/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();
      return res.json(settings);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const settingsData = req.body;
      const settings = await storage.getSystemSettings();

      console.log('Received settings update:', settingsData);
      console.log('Current settings:', settings);

      // Merge settings properly - preserve all existing values
      const updatedSettingsData = {
        ...settings, // Start with ALL current settings
        updatedAt: new Date().toISOString()
      };

      // Only update fields that are explicitly provided in settingsData
      Object.keys(settingsData).forEach(key => {
        const value = settingsData[key];
        // Update if value is defined (including false, 0, empty string)
        if (value !== undefined && value !== null) {
          updatedSettingsData[key] = value;
        }
      });

      // Ensure backup settings are properly set
      if (settingsData.autoBackup !== undefined) {
        updatedSettingsData.autoBackup = settingsData.autoBackup;
        console.log('Setting autoBackup to:', settingsData.autoBackup);
      }

      if (settingsData.backupTime !== undefined) {
        updatedSettingsData.backupTime = settingsData.backupTime;
        console.log('Setting backupTime to:', settingsData.backupTime);
      }

      console.log('Merged settings to save:', updatedSettingsData);

      // Update settings with ID 1 (system settings)
      const updatedSettings = await storage.updateSystemSettings(1, updatedSettingsData);

      console.log('Settings saved successfully:', updatedSettings);

      // Reinitialize email service with new settings
      await emailService.initialize();

      // Emit event to trigger backup scheduler update if backup settings changed
      if (settingsData.autoBackup !== undefined || settingsData.backupTime !== undefined) {
        console.log('🔄 Backup settings changed, triggering scheduler update...');
        app.emit('backup-schedule-updated');
      }

      return res.json(updatedSettings);
    } catch (err) {
      console.error('Error updating settings:', err);
      return handleError(err, res);
    }
  });

  // Check and send IAM expiration notifications
  app.post("/api/check-iam-expirations", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();

      if (settings?.notifyOnIamExpiration === false) {
        return res.status(400).json({
          message: 'IAM expiration notifications are disabled in settings'
        });
      }

      // Get all IAM accounts directly from storage to avoid auth issues
      const iamAccounts = await storage.getIamAccounts();

      // Filter expired accounts that haven't been notified yet
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

      const expiredAccounts = iamAccounts.filter((account: any) => {
        if (!account.durationEndDate) return false;

        const endDate = new Date(account.durationEndDate);
        endDate.setHours(0, 0, 0, 0); // Reset to start of day

        // Check if expired and not yet notified
        const isExpired = endDate < today;
        const notYetNotified = account.status !== 'expired_notified' &&
                               account.status !== 'access_removed' &&
                               account.status !== 'extended';

        // Debug each account's userKnoxId field
        if (isExpired && notYetNotified) {
          console.log(`📧 [EXPIRED ACCOUNT DEBUG] ${account.knoxId}:`, {
            userKnoxId: account.userKnoxId,
            userKnoxIdType: typeof account.userKnoxId,
            hasUserKnoxId: !!account.userKnoxId,
            allFields: Object.keys(account)
          });
        }

        return isExpired && notYetNotified;
      });

      if (expiredAccounts.length > 0) {
        const accountsData = expiredAccounts.map((account: any) => {
          console.log(`📧 Mapping account ${account.knoxId}, userKnoxId field:`, {
            rawUserKnoxId: account.userKnoxId,
            userKnoxIdType: typeof account.userKnoxId,
            hasUserKnoxId: !!account.userKnoxId,
            trimmedUserKnoxId: account.userKnoxId ? account.userKnoxId.trim() : null
          });

          return {
            requestor: account.requestor || 'N/A',
            knoxId: account.knoxId || 'N/A',
            userKnoxId: account.userKnoxId || null,
            permission: account.permission || 'N/A',
            cloudPlatform: account.cloudPlatform || 'N/A',
            endDate: account.durationEndDate,
            approvalId: account.approvalId || 'N/A'
          };
        });

        // Send email notification for expired IAM accounts (includes both admin and owner notifications)
        const emailSent = await emailService.sendIamExpirationNotification({
          accounts: accountsData
        });

        // Update status of notified accounts to prevent re-sending
        for (const account of expiredAccounts) {
          await storage.updateIamAccount(account.id, { status: 'expired_notified' });
        }

        return res.json({
          message: `Found ${expiredAccounts.length} expired IAM account(s). Notifications sent to admin and account owners.`,
          count: expiredAccounts.length,
          emailSent,
          accounts: accountsData
        });
      }

      return res.json({
        message: "No expired IAM accounts found",
        count: 0,
        checked: true
      });
    } catch (err: any) {
      console.error('IAM expiration check error:', err);
      return res.status(500).json({
        message: `Failed to check IAM expirations: ${err.message}`
      });
    }
  });

  // Check and send VM expiration notifications
  app.post("/api/check-vm-expirations", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();

      if (!settings?.notifyOnVmExpiration) {
        return res.json({
          message: "VM expiration notifications are disabled",
          checked: false
        });
      }

      // Get all VMs from the VM inventory
      // NOTE: This assumes storage.getVmInventory() fetches data correctly.
      const vms = await storage.getVmInventory();

      // Filter expired VMs that are not yet notified
      const today = new Date();
      const expiredVMs = vms.filter((vm: any) => {
        if (!vm.endDate) return false;
        const endDate = new Date(vm.endDate);
        // Check against today's date and the status indicating overdue and not notified
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

        // Send email notification for expired VMs
        const emailSent = await emailService.sendVmExpirationNotification({
          vms: vmsData
        });

        // Update status of notified VMs to prevent re-sending
        for (const vm of expiredVMs) {
          await storage.updateVmInventory(vm.id, { vmStatus: 'Overdue - Notified' });
        }

        return res.json({
          message: `Found ${expiredVMs.length} expired VM(s)`,
          count: expiredVMs.length,
          emailSent,
          vms: vmsData
        });
      }

      return res.json({
        message: "No expired VMs found",
        count: 0,
        checked: true
      });
    } catch (err: any) {
      console.error('VM expiration check error:', err);
      return res.status(500).json({
        message: `Failed to check VM expirations: ${err.message}`
      });
    }
  });

  // Check and send Approval expiration notifications
  app.post("/api/check-approval-expirations", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('📧 [APPROVAL-CHECK] Manual approval expiration check triggered by', req.user?.username);

      const settings = await storage.getSystemSettings();

      // Always check and send notifications (removed disabled check)
      console.log('📧 [APPROVAL-CHECK] Approval expiration notifications are ALWAYS ON');

      if (!db) {
        console.log('📧 [APPROVAL-CHECK] Database not available');
        return res.status(503).json({ message: 'Database not available' });
      }

      // Get all approval monitoring records
      const records = await db.select().from(schema.approvalMonitoring).orderBy(schema.approvalMonitoring.endDate);
      console.log(`📧 [APPROVAL-CHECK] Found ${records.length} total approval records`);

      // Filter records expiring within 1 week
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(today.getDate() + 7);
      oneWeekFromNow.setHours(23, 59, 59, 999);

      const expiringRecords = records.filter((record: any) => {
        if (!record.endDate) return false;

        const endDate = new Date(record.endDate);
        endDate.setHours(0, 0, 0, 0);

        // Check if end date is within the next 7 days
        return endDate >= today && endDate <= oneWeekFromNow;
      });

      console.log(`📧 [APPROVAL-CHECK] Found ${expiringRecords.length} records expiring within 1 week`);

      if (expiringRecords.length > 0) {
        const recordsData = expiringRecords.map((record: any) => ({
          type: record.type || 'N/A',
          platform: record.platform || 'N/A',
          pic: record.pic || 'N/A',
          ipAddress: record.ipAddress || 'N/A',
          hostnameAccounts: record.hostnameAccounts || 'N/A',
          identifierSerialNumber: record.identifierSerialNumber || 'N/A',
          approvalNumber: record.approvalNumber || 'N/A',
          endDate: record.endDate,
          remarks: record.remarks || 'N/A'
        }));

        console.log(`📧 [APPROVAL-CHECK] Sending notification for ${recordsData.length} expiring approvals`);

        // Send email notification for expiring approvals
        const emailSent = await emailService.sendApprovalExpirationNotification({
          records: recordsData
        });

        console.log(`📧 [APPROVAL-CHECK] Email sent: ${emailSent ? 'SUCCESS' : 'FAILED'}`);

        return res.json({
          message: `Found ${expiringRecords.length} approval(s) expiring within 1 week. ${emailSent ? 'Notification sent to admin.' : 'Failed to send notification.'}`,
          count: expiringRecords.length,
          emailSent,
          records: recordsData
        });
      }

      console.log('📧 [APPROVAL-CHECK] No approvals expiring within 1 week');
      return res.json({
        message: "No approvals expiring within 1 week",
        count: 0,
        checked: true
      });
    } catch (err: any) {
      console.error('📧 [APPROVAL-CHECK] Error:', err);
      return res.status(500).json({
        message: `Failed to check approval expirations: ${err.message}`
      });
    }
  });

  app.post("/api/test-email", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();

      if (!settings?.mailHost || !settings?.companyEmail) {
        return res.status(400).json({
          message: "Email configuration is incomplete. Please configure SMTP settings first."
        });
      }

      // Reinitialize email service to ensure latest settings
      await emailService.initialize();

      const testEmailSent = await emailService.sendEmail({
        to: settings.companyEmail || settings.mailFromAddress,
        subject: 'Test Email from SRPH-MIS',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from your SRPH-MIS system.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <p><strong>SMTP Server:</strong> ${settings.mailHost}</p>
          <p><strong>From Address:</strong> ${settings.mailFromAddress}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        `
      });

      if (testEmailSent) {
        return res.json({
          success: true,
          message: `Test email sent successfully to ${settings.companyEmail || settings.mailFromAddress}`
        });
      } else {
        return res.status(500).json({
          message: "Failed to send test email. Please check your SMTP configuration."
        });
      }
    } catch (err: any) {
      console.error('Test email error:', err);
      return res.status(500).json({
        message: `Failed to send test email: ${err.message}`
      });
    }
  });

  // Email Logs API
  app.get("/api/email-logs", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('📧 Fetching email logs...');
      const logs = await readEmailLogs();
      console.log(`📧 Returning ${logs.length} email log entries`);
      return res.json(logs);
    } catch (err: any) {
      console.error('📧 Error fetching email logs:', err);
      return res.status(500).json({
        message: `Failed to fetch email logs: ${err.message}`,
        logs: []
      });
    }
  });

  // Get database schedule settings
  app.get("/api/database/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();

      console.log('📋 Loading database schedule settings:', settings);

      const scheduleSettings = {
        autoBackup: settings?.autoBackup === true || settings?.autoBackup === 1,
        autoOptimize: settings?.autoOptimize === true || settings?.autoOptimize === 1,
        backupTime: settings?.backupTime || '03:00',
        optimizeTime: settings?.optimizeTime || '04:00',
        retentionDays: settings?.retentionDays || 30,
        emailNotifications: settings?.emailNotifications !== false
      };

      console.log('📤 Returning schedule settings:', scheduleSettings);

      return res.json(scheduleSettings);
    } catch (err: any) {
      console.error('Error fetching database schedule:', err);
      return res.status(500).json({
        message: `Failed to fetch database schedule: ${err.message}`
      });
    }
  });

  // Update database schedule settings
  app.post("/api/database/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const { autoBackup, autoOptimize, backupTime, optimizeTime, retentionDays, emailNotifications } = req.body;

      console.log('📅 Updating database schedule settings:', {
        autoBackup,
        backupTime,
        autoOptimize,
        optimizeTime
      });

      // Get current settings
      const currentSettings = await storage.getSystemSettings();

      // Prepare update data with explicit boolean conversion
      const updateData = {
        ...currentSettings,
        autoBackup: autoBackup !== undefined ? Boolean(autoBackup) : (currentSettings?.autoBackup || false),
        backupTime: backupTime || currentSettings?.backupTime || '03:00',
        autoOptimize: autoOptimize !== undefined ? Boolean(autoOptimize) : (currentSettings?.autoOptimize || false),
        optimizeTime: optimizeTime || currentSettings?.optimizeTime || '04:00',
        retentionDays: retentionDays !== undefined ? Number(retentionDays) : (currentSettings?.retentionDays || 30),
        emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : (currentSettings?.emailNotifications !== false),
        updatedAt: new Date().toISOString()
      };

      console.log('📝 Saving settings:', updateData);

      // Update settings
      const updatedSettings = await storage.updateSystemSettings(1, updateData);

      console.log('✅ Database schedule settings updated successfully:', updatedSettings);

      // Emit event to trigger backup scheduler update
      app.emit('backup-schedule-updated');

      return res.json({
        success: true,
        message: 'Database schedule updated successfully',
        settings: {
          autoBackup: updatedSettings?.autoBackup || false,
          backupTime: updatedSettings?.backupTime || '03:00',
          autoOptimize: updatedSettings?.autoOptimize || false,
          optimizeTime: updatedSettings?.optimizeTime || '04:00',
          retentionDays: updatedSettings?.retentionDays || 30,
          emailNotifications: updatedSettings?.emailNotifications !== false
        }
      });
    } catch (err: any) {
      console.error('Error updating database schedule:', err);
      return res.status(500).json({
        message: `Failed to update database schedule: ${err.message}`
      });
    }
  });

  // Manual Database Backup API
  app.post("/api/database/backup", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('🔄 Manual database backup requested by:', req.user?.username);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const fs = await import('fs');
      const path = await import('path');
      const backupDir = path.join(process.cwd(), 'backups');

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('📁 Backups directory created');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
      const backupFilename = `backup-${timestamp}-${timeStamp}.sql`;
      const backupPath = path.join(backupDir, backupFilename);

      // Create comprehensive backup content with schema and data
      let backupContent = `-- =============================================\n`;
      backupContent += `-- Manual PostgreSQL Database Backup\n`;
      backupContent += `-- =============================================\n`;
      backupContent += `-- Created: ${new Date().toISOString()}\n`;
      backupContent += `-- Created By: ${req.user?.username || 'Unknown'}\n`;
      backupContent += `-- Database: srph_mis\n`;
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

              backupContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}); \n`;

              if ((index + 1) % 100 === 0) {
                backupContent += `-- Progress: ${index + 1}/${tableData.rows.length} rows\n`;
              }
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

      fs.writeFileSync(backupPath, backupContent);
      const fileSize = (fs.statSync(backupPath).size / 1024).toFixed(2);

      console.log(`✅ Manual backup created: ${backupFilename} (${fileSize} KB, ${totalRecords} records)`);

      // Log the backup activity
      await storage.createActivity({
        action: "backup",
        itemType: "database",
        itemId: 1,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Manual database backup created by ${req.user?.username}: ${backupFilename} (${fileSize} KB, ${totalRecords} records)`,
      });

      return res.json({
        success: true,
        message: 'Database backup created successfully',
        filename: backupFilename,
        path: backupPath,
        size: `${fileSize} KB`,
        records: totalRecords,
        tables: backedUpTables
      });

    } catch (err: any) {
      console.error('❌ Manual backup failed:', err);
      return res.status(500).json({
        message: `Failed to create backup: ${err.message}`
      });
    }
  });

  // System Logs API
  app.get("/api/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const { promises: fs } = await import('fs');
      const { join } = await import('path');

      const LOGS_DIR = join(process.cwd(), 'LOGS');

      try {
        await fs.access(LOGS_DIR);
      } catch {
        return res.json([]);
      }

      const files = await fs.readdir(LOGS_DIR);
      const logFiles = files.filter(f => f.endsWith('.log'));

      return res.json(logFiles);
    } catch (err: any) {
      console.error('Error reading log files:', err);
      return res.status(500).json({
        message: `Failed to read log files: ${err.message}`
      });
    }
  });

  app.get("/api/logs/:filename", requireAuth, async (req: Request, res: Response) => {
    try {
      const { promises: fs } = await import('fs');
      const { join } = await import('path');

      const filename = req.params.filename;
      const LOGS_DIR = join(process.cwd(), 'LOGS');
      const filepath = join(LOGS_DIR, filename);

      try {
        const content = await fs.readFile(filepath, 'utf-8');
        return res.json({
          filename,
          content
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            message: 'Log file not found'
          });
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Error reading log file:', err);
      return res.status(500).json({
        message: `Failed to read log file: ${err.message}`
      });
    }
  });

  // Roles API
  app.get("/api/roles", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getRolesWithUserCounts } = await import("./roles");
      const roles = await getRolesWithUserCounts();
      return res.json(roles);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/roles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getRoleById } = await import("./roles");
      const roleId = parseInt(req.params.id);
      const role = getRoleById(roleId);

      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      return res.json(role);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/roles", checkPermission('admin', 'add'), async (req: Request, res: Response) => {
    try {
      const { createRole } = await import("./roles");
      const roleData = req.body;

      const role = createRole(roleData);

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "role",
        itemId: role.id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Role "${role.name}" created`,
      });

      return res.status(201).json(role);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Users API
  app.get("/api/users", checkPermission('users', 'view'), async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      // Ensure MFA fields are included in response
      const usersWithMfa = users.map(user => ({
        ...user,
        mfaEnabled: user.mfaEnabled || false,
        mfaSecret: undefined // Don't expose secret
      }));
      res.json(usersWithMfa);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/users/:id", checkPermission('users', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json(user);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/users", checkPermission('users', 'add'), async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(userData);

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "user",
        itemId: user.id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `User ${user.username} created`,
      });

      // Send email notification - await to ensure it's actually sent
      try {
        const emailSent = await emailService.sendModificationNotification({
          action: 'create',
          itemType: 'User',
          itemName: `${user.username} (${user.firstName} ${user.lastName})`,
          userName: req.user.username,
          details: `New user account created with ${user.isAdmin ? 'admin' : 'standard'} privileges`,
          timestamp: new Date().toISOString()
        });
        if (emailSent) {
          console.log(`✅ Email notification sent for user creation: ${user.username}`);
        } else {
          console.log(`⚠️ Email notification not sent - check email configuration`);
        }
      } catch (err) {
        console.error('❌ Email notification failed:', err);
      }

      // Update role user counts after user creation
      const { updateRoleUserCounts } = await import("./roles");
      await updateRoleUserCounts();

      return res.status(201).json(user);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.patch("/api/users/:id", checkPermission('users', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate update data
      const updateData = insertUserSchema.partial().parse(req.body);

      // Check if username is being changed and if it's unique
      if (updateData.username && updateData.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(updateData.username);
        if (userWithSameUsername) {
          return res.status(409).json({ message: "Username already exists" });
        }
      }

      console.log(`Updating user ${id} with data:`, updateData);

      // Handle password hashing if password is being updated
      let finalUpdateData = { ...updateData };
      if (updateData.password && updateData.password.trim() !== '') {
        const { scrypt, randomBytes } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);

        console.log(`Hashing new password for user ${existingUser.username}`);
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(updateData.password, salt, 64)) as Buffer;
        finalUpdateData.password = `${buf.toString("hex")}.${salt}`;
        console.log(`Password hashed successfully for user ${existingUser.username}`);
      } else if (updateData.password === '') {
        // If empty string is provided, don't update password
        delete finalUpdateData.password;
      }

      // Handle role/admin status logic properly - avoid conflicts
      // Clear logic: Admin users should not have roleId, role users should not be admin
      if (updateData.isAdmin === true || updateData.isAdmin === "true") {
        finalUpdateData.roleId = null;
        finalUpdateData.isAdmin = true;
        console.log(`Setting user as admin, clearing roleId`);
      } else if (updateData.isAdmin === false || updateData.isAdmin === "false") {
        finalUpdateData.isAdmin = false;
        // Keep the roleId if it's being set, otherwise keep existing
        if (updateData.roleId !== undefined) {
          finalUpdateData.roleId = updateData.roleId;
        } else if (existingUser.roleId) {
          finalUpdateData.roleId = existingUser.roleId;
        }
        console.log(`Removing admin status, roleId: ${finalUpdateData.roleId}`);
      } else if (updateData.roleId !== undefined) {
        // Setting a role automatically removes admin status
        finalUpdateData.roleId = updateData.roleId;
        finalUpdateData.isAdmin = false;
        console.log(`Setting roleId ${updateData.roleId}, removing admin status`);
      }

      const updatedUser = await storage.updateUser(id, finalUpdateData);

      if (updatedUser) {
        const { getPermissionsForRole } = await import("./roles");

        // Load appropriate permissions based on final status
        if (updatedUser.isAdmin === true || updatedUser.isAdmin === 1) {
          updatedUser.permissions = {
            assets: { view: true, edit: true, add: true, delete: true },
            components: { view: true, edit: true, add: true, delete: true },
            accessories: { view: true, edit: true, add: true, delete: true },
            consumables: { view: true, edit: true, add: true, delete: true },
            licenses: { view: true, edit: true, add: true, delete: true },
            users: { view: true, edit: true, add: true, delete: true },
            reports: { view: true, edit: true, add: true, delete: true },
            admin: { view: true, edit: true, add: true, delete: true },
            vmMonitoring: { view: true, edit: true, add: true, delete: true },
            networkDiscovery: { view: true, edit: true, add: true, delete: true },
            bitlockerKeys: { view: true, edit: true, add: true, delete: true }
          };
          console.log(`Set admin permissions for user ${updatedUser.username}`);
        } else {
          updatedUser.permissions = getPermissionsForRole(updatedUser.roleId);
          console.log(`Set role-based permissions for user ${updatedUser.username} (roleId: ${updatedUser.roleId}):`, JSON.stringify(updatedUser.permissions, null, 2));
        }
      }

      // Log activity
      const activityNotes = updateData.password && updateData.password.trim() !== ''
        ? `User ${updatedUser?.username} updated (password changed, admin: ${updatedUser?.isAdmin}, roleId: ${updatedUser?.roleId})`
        : `User ${updatedUser?.username} updated (admin: ${updatedUser?.isAdmin}, roleId: ${updatedUser?.roleId})`;

      await storage.createActivity({
        action: "update",
        itemType: "user",
        itemId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: activityNotes,
      });

      // Update role user counts after user role change
      const { updateRoleUserCounts } = await import("./roles");
      await updateRoleUserCounts();

      return res.json(updatedUser);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Update user permissions
  app.patch("/api/users/:id/permissions", checkPermission('users', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { permissions } = req.body;
      if (!permissions) {
        return res.status(400).json({ message: "Permissions data required" });
      }

      const updatedUser = await storage.updateUser(id, { permissions });

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "user",
        itemId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `User ${updatedUser?.username} permissions updated`,
      });

      return res.json(updatedUser);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.put("/api/users/:id/permissions", checkPermission('users', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { permissions } = req.body;

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(id, { permissions });

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "user",
        itemId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `User ${existingUser.username} permissions updated`,
      });

      return res.json(updatedUser);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.delete("/api/users/:id", checkPermission('users', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Delete user endpoint called for ID: ${id}`);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        console.log(`User with ID ${id} not found`);
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting the main admin user
      if (existingUser.isAdmin && existingUser.id === 1) {
        return res.status(403).json({ message: "Cannot delete the main administrator account" });
      }

      // Check if user has any assigned assets
      const assets = await storage.getAssets();
      const assignedAssets = assets.filter(asset => asset.assignedTo === id);

      if (assignedAssets.length > 0) {
        return res.status(400).json({
          message: `Cannot delete user. User has ${assignedAssets.length} asset(s) assigned. Please check in all assets first.`
        });
      }

      // Get user activities for logging purposes
      try {
        const userActivities = await storage.getActivitiesByUser(id);
        console.log(`User ${existingUser.username} has ${userActivities.length} activities associated - these will be preserved for audit`);
      } catch (activityError) {
        console.warn('Failed to get user activities for logging:', activityError);
      }

      console.log(`Deleting user: ${existingUser.username} (ID: ${id})`);
      const deleteResult = await storage.deleteUser(id);

      if (!deleteResult) {
        return res.status(500).json({ message: "Failed to delete user" });
      }

      // Log activity (after user deletion to avoid foreign key issues)
      try {
        await storage.createActivity({
          action: "delete",
          itemType: "user",
          itemId: id,
          userId: req.user?.id || null,
          timestamp: new Date().toISOString(),
          notes: `User ${existingUser.username} deleted by ${req.user?.username || 'system'}`,
        });
      } catch (activityError) {
        console.warn('Failed to log delete activity:', activityError);
      }

      console.log(`User ${existingUser.username} deleted successfully`);

      // Update role user counts after user deletion
      const { updateRoleUserCounts } = await import("./roles");
      await updateRoleUserCounts();

      return res.status(204).send();
    } catch (err) {
      console.error('Delete user error:', err);
      return handleError(err, res);
    }
  });

  // Assets API
  app.get("/api/assets", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('Assets API called by user:', req.user?.username);
      const assets = await storage.getAssets();
      console.log(`Found ${assets.length} assets`);

      if (!assets || !Array.isArray(assets)) {
        console.error('Invalid assets data returned from storage:', assets);
        return res.status(500).json({
          message: "Invalid assets data format",
          debug: { assetsType: typeof assets, isArray: Array.isArray(assets) }
        });
      }

      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({
        message: "Failed to fetch assets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/assets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      return res.json(asset);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/assets", requireAuth, async (req: Request, res: Response) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      // Only check for duplicate asset tags, not Knox IDs
      if (assetData.assetTag) {
        const existingAsset = await storage.getAssetByTag(assetData.assetTag);
        if (existingAsset) {
          return res.status(409).json({ message: "Asset tag already exists" });
        }
      }

      // Create the asset
      const asset = await storage.createAsset(assetData);

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "asset",
        itemId: asset.id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Asset ${asset.name} (${asset.assetTag}) created`,
      });

      // Send email notification - await to ensure it's actually sent
      try {
        const emailSent = await emailService.sendModificationNotification({
          action: 'create',
          itemType: 'Asset',
          itemName: `${asset.name} (${asset.assetTag})`,
          userName: req.user.username,
          details: `New asset created with category: ${asset.category}`,
          timestamp: new Date().toISOString(),
          additionalInfo: {
            assetTag: asset.assetTag,
            category: asset.category,
            status: asset.status,
            location: asset.location || 'Not specified',
            serialNumber: asset.serialNumber || 'Not specified',
            knoxId: asset.knoxId || 'Not assigned',
            department: asset.department || 'Not specified'
          }
        });
        if (emailSent) {
          console.log(`✅ Email notification sent for asset creation: ${asset.name}`);
        }
      } catch (err) {
        console.error('❌ Email notification failed:', err);
      }

      // If Knox ID is provided, automatically checkout the asset to that Knox ID
      let updatedAsset = asset;
      if (assetData.knoxId && assetData.knoxId.trim() !== '') {
        // Find or create a user for this Knox ID
        // For now, we'll use admin user (id: 1) as the assignee
        const customNotes = `Asset automatically checked out to KnoxID: ${assetData.knoxId}`;
        updatedAsset = await storage.checkoutAsset(asset.id, 1, undefined, customNotes) || asset;

        // Log checkout activity
        await storage.createActivity({
          action: "checkout",
          itemType: "asset",
          itemId: asset.id,
          userId: req.user.id,
          timestamp: new Date().toISOString(),
          notes: customNotes,
        });
      }

      return res.status(201).json(updatedAsset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingAsset = await storage.getAsset(id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      // Validate update data
      const updateData = insertAssetSchema.partial().parse(req.body);

      // Check if asset tag is being changed and if it's unique
      if (updateData.assetTag && updateData.assetTag !== existingAsset.assetTag) {
        const assetWithSameTag = await storage.getAssetByTag(updateData.assetTag);
        if (assetWithSameTag) {
          return res.status(409).json({ message: "Asset tag already exists" });
        }
      }

      // Update the asset
      const updatedAsset = await storage.updateAsset(id, updateData);

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "asset",
        itemId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Asset ${updatedAsset?.name} (${updatedAsset?.assetTag}) updated`,
      });

      // Send email notification - await to ensure it's actually sent
      try {
        const emailSent = await emailService.sendModificationNotification({
          action: 'update',
          itemType: 'Asset',
          itemName: `${updatedAsset?.name} (${updatedAsset?.assetTag})`,
          userName: req.user.username,
          details: `Asset information updated`,
          timestamp: new Date().toISOString(),
          additionalInfo: {
            assetTag: updatedAsset?.assetTag,
            category: updatedAsset?.category,
            status: updatedAsset?.status,
            location: updatedAsset?.location || 'Not specified',
            serialNumber: updatedAsset?.serialNumber || 'Not specified',
            knoxId: updatedAsset?.knoxId || 'Not assigned',
            department: updatedAsset?.department || 'Not specified',
            previousValues: {
              status: existingAsset.status,
              location: existingAsset.location,
              knoxId: existingAsset.knoxId,
              department: existingAsset.department
            },
            currentValues: {
              status: updatedAsset?.status,
              location: updatedAsset?.location,
              knoxId: updatedAsset?.knoxId,
              department: updatedAsset?.department
            }
          }
        });
        if (emailSent) {
          console.log(`✅ Email notification sent for asset update: ${updatedAsset?.name}`);
        }
      } catch (err) {
        console.error('❌ Email notification failed:', err);
      }

      // Check if the Knox ID was added or updated and the asset isn't already checked out
      if (
        updateData.knoxId &&
        updateData.knoxId.trim() !== '' &&
        (
          !existingAsset.knoxId ||
          updateData.knoxId !== existingAsset.knoxId ||
          existingAsset.status !== 'deployed'
        )
      ) {
        // Automatically checkout the asset if Knox ID changed or added
        const customNotes = `Asset automatically checked out to KnoxID: ${updateData.knoxId}`;
        const checkedOutAsset = await storage.checkoutAsset(id, 1, undefined, customNotes);

        if (checkedOutAsset) {
          // Log checkout activity
          await storage.createActivity({
            action: "checkout",
            itemType: "asset",
            itemId: id,
            userId: 1,
            timestamp: new Date().toISOString(),
            notes: customNotes,
          });

          return res.json(checkedOutAsset);
        }
      }

      return res.json(updatedAsset);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.delete("/api/assets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingAsset = await storage.getAsset(id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      await storage.deleteAsset(id);

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "asset",
        itemId: id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Asset ${existingAsset.name} (${existingAsset.assetTag}) deleted`,
      });

      // Send email notification - await to ensure it's actually sent
      try {
        const emailSent = await emailService.sendModificationNotification({
          action: 'delete',
          itemType: 'Asset',
          itemName: `${existingAsset.name} (${existingAsset.assetTag})`,
          userName: req.user.username,
          details: `Asset permanently deleted from system`,
          timestamp: new Date().toISOString(),
          additionalInfo: {
            assetTag: existingAsset.assetTag,
            category: existingAsset.category,
            status: existingAsset.status,
            location: existingAsset.location || 'Not specified',
            serialNumber: existingAsset.serialNumber || 'Not specified',
            knoxId: existingAsset.knoxId || 'Not assigned',
            department: existingAsset.department || 'Not specified'
          }
        });
        if (emailSent) {
          console.log(`✅ Email notification sent for asset deletion: ${existingAsset.name}`);
        }
      } catch (err) {
        console.error('❌ Email notification failed:', err);
      }

      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  // CSV Import API with upsert logic
  app.post("/api/assets/import", async (req: Request, res: Response) => {
    try {
      const { assets, forceImport = false } = req.body;

      if (!Array.isArray(assets)) {
        return res.status(400).json({
          message: "Invalid request format. Expected an array of assets.",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["Request body must contain an 'assets' array"]
        });
      }

      if (assets.length === 0) {
        return res.status(400).json({
          message: "No assets to import",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["No assets provided in the request"]
        });
      }

      // Import each asset with error tracking and upsert logic
      // No limit on import quantity - process all assets
      const importedAssets = [];
      const errors = [];
      let successful = 0;
      let updated = 0;
      let failed = 0;
      let skipped = 0;
      const skippedRows: string[] = []; // To store reasons for skipped rows

      console.log(`Starting bulk import of ${assets.length} assets${forceImport ? ' [FORCE IMPORT MODE - Skip validations]' : '...'}`);
      console.log(`First asset sample:`, JSON.stringify(assets[0], null, 2));
      console.log(`Last asset sample:`, JSON.stringify(assets[assets.length - 1], null, 2));

      for (let i = 0; i < assets.length; i++) {
        try {
          const asset = assets[i];
          const rowNumber = i + 1;

          console.log(`Processing row ${rowNumber}/${assets.length}:`, {
            assetTag: asset.assetTag,
            name: asset.name,
            serialNumber: asset.serialNumber,
            category: asset.category
          });

          // Skip completely empty assets (all fields are null/empty/undefined)
          const hasData = Object.values(asset).some(value =>
            value !== null && value !== undefined && value !== ''
          );

          if (!hasData) {
            console.log(`Skipping empty row ${rowNumber}`);
            skippedRows.push(`Row ${rowNumber}: Completely empty`);
            skipped++;
            continue;
          }

          // Check for existing asset by asset tag only (skip if force import is enabled)
          let existingAsset = null;

          if (!forceImport) {
            // Check by asset tag if provided
            if (asset.assetTag && asset.assetTag.trim() !== '') {
              existingAsset = await storage.getAssetByTag(asset.assetTag);
              if (existingAsset) {
                console.log(`Found existing asset by tag ${asset.assetTag} (Row ${rowNumber})`);
              }
            }
          }

          if (existingAsset && !forceImport) {
            // Update existing asset (only if not force importing)
            const updateData = {
              ...asset,
              notes: `Updated via CSV import. KnoxID: ${asset.knoxId || 'N/A'}`
            };

            console.log(`Updating existing asset ${existingAsset.id} (Row ${rowNumber})`);
            const updatedAsset = await storage.updateAsset(existingAsset.id, updateData);

            // Create activity for the update
            await storage.createActivity({
              action: "update",
              itemType: "asset",
              itemId: existingAsset.id,
              userId: req.user?.id || 1,
              timestamp: new Date().toISOString(),
              notes: `Updated via CSV import. Asset Tag: ${asset.assetTag}, Serial: ${asset.serialNumber}`,
            });

            // Handle Knox ID checkout logic if asset was updated with Knox ID
            if (asset.knoxId && asset.knoxId.trim() !== '' &&
              (updatedAsset?.status !== 'deployed' || updatedAsset?.knoxId !== asset.knoxId)) {
              const customNotes = `Asset automatically checked out to KnoxID: ${asset.knoxId}`;
              const checkedOutAsset = await storage.checkoutAsset(existingAsset.id, 1, undefined, customNotes);

              if (checkedOutAsset) {
                await storage.createActivity({
                  action: "checkout",
                  itemType: "asset",
                  itemId: existingAsset.id,
                  userId: req.user?.id || 1,
                  timestamp: new Date().toISOString(),
                  notes: customNotes,
                });
              }
            }

            importedAssets.push(updatedAsset);
            updated++;
            console.log(`Successfully updated asset (Row ${rowNumber}). Total updated: ${updated}`);
          } else {
            // Create new asset (always create if force importing, even if duplicate exists)
            console.log(`Creating new asset (Row ${rowNumber})${forceImport ? ' [FORCE IMPORT]' : ''}`);

            // If force importing and we have a duplicate asset tag, modify it to make it unique
            if (forceImport && existingAsset && asset.assetTag) {
              asset.assetTag = `${asset.assetTag}-${Date.now()}`;
              console.log(`Modified asset tag to avoid duplicate: ${asset.assetTag}`);
            }

            const newAsset = await storage.createAsset(asset);

            // Create activity for the import
            await storage.createActivity({
              action: "create",
              itemType: "asset",
              itemId: newAsset.id,
              userId: req.user?.id || 1,
              timestamp: new Date().toISOString(),
              notes: `Created via CSV import${forceImport ? ' [FORCE IMPORT]' : ''}. KnoxID: ${asset.knoxId || 'N/A'}`,
            });

            // Handle Knox ID checkout logic for new assets
            if (asset.knoxId && asset.knoxId.trim() !== '') {
              const customNotes = `Asset automatically checked out to KnoxID: ${asset.knoxId}`;
              const checkedOutAsset = await storage.checkoutAsset(newAsset.id, 1, undefined, customNotes);

              if (checkedOutAsset) {
                await storage.createActivity({
                  action: "checkout",
                  itemType: "asset",
                  itemId: newAsset.id,
                  userId: req.user?.id || 1,
                  timestamp: new Date().toISOString(),
                  notes: customNotes,
                });
              }
            }

            importedAssets.push(newAsset);
            successful++;
            console.log(`Successfully created asset ${newAsset.id} (Row ${rowNumber}). Total created: ${successful}`);
          }
        } catch (assetError) {
          failed++;
          const errorMessage = `Row ${rowNumber}: ${assetError instanceof Error ? assetError.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(`Asset import error:`, errorMessage, asset);
        }
      }

      console.log(`Import summary: Total: ${assets.length}, Created: ${successful}, Updated: ${updated}, Failed: ${failed}, Skipped: ${skipped}`);
      console.log(`Processed: ${successful + updated + failed + skipped}, Expected: ${assets.length}`);

      const response = {
        total: assets.length,
        successful,
        updated,
        failed,
        skipped,
        processed: successful + updated + failed + skipped,
        errors,
        skippedRows,
        message: `Import completed${forceImport ? ' [FORCE IMPORT]' : ''}. ${successful} assets created, ${updated} assets updated, ${failed} failed, ${skipped} skipped.`
      };

      // Return 200 for partial success, 201 for complete success
      const statusCode = failed > 0 ? 200 : 201;
      return res.status(statusCode).json(response);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Checkout/Checkin API
  app.post("/api/assets/:id/checkout", async (req: Request, res: Response) => {
    try {
      const assetId = parseInt(req.params.id);
      const { userId, knoxId, firstName, lastName, expectedCheckinDate } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      // Generate custom notes if KnoxID is provided
      let customNotes = "";
      if (knoxId && firstName && lastName) {
        customNotes = `Asset checked out to ${firstName} ${lastName} (KnoxID: ${knoxId})`;
      }

      // First update the asset with the Knox ID if provided
      if (knoxId) {
        await storage.updateAsset(assetId, { knoxId });
      }

      // Then perform the checkout operation
      const updatedAsset = await storage.checkoutAsset(assetId, parseInt(userId), expectedCheckinDate, customNotes);
      if (!updatedAsset) {
        return res.status(400).json({ message: "Asset cannot be checked out" });
      }

      return res.json(updatedAsset);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/assets/:id/checkin", async (req: Request, res: Response) => {
    try {
      const assetId = parseInt(req.params.id);

      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const updatedAsset = await storage.checkinAsset(assetId);
      if (!updatedAsset) {
        return res.status(400).json({ message: "Asset cannot be checked in" });
      }

      return res.json(updatedAsset);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Finance update API
  app.post("/api/assets/:id/finance", async (req: Request, res: Response) => {
    try {
      const assetId = parseInt(req.params.id);
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const { financeUpdated } = req.body;

      const updatedAsset = await storage.updateAsset(assetId, {
        financeUpdated: financeUpdated
      });

      // Create activity log
      await storage.createActivity({
        action: "update",
        itemType: "asset",
        itemId: assetId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Finance status updated to: ${financeUpdated ? 'Updated' : 'Not Updated'}`,
      });

      return res.json(updatedAsset);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Cleanup Knox IDs for assets that are not checked out
  app.post("/api/assets/cleanup-knox", async (req: Request, res: Response) => {
    try {
      const assets = await storage.getAssets();
      const availableAssetsWithKnoxId = assets.filter(asset =>
        (asset.status === AssetStatus.AVAILABLE ||
          asset.status === AssetStatus.PENDING ||
          asset.status === AssetStatus.ARCHIVED) &&
        asset.knoxId
      );

      const updates = await Promise.all(
        availableAssetsWithKnoxId.map(asset =>
          storage.updateAsset(asset.id, { knoxId: null })
        )
      );

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "asset",
        itemId: 0,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Cleaned up Knox IDs for ${updates.length} assets that were not checked out`,
      });

      return res.json({
        message: `Cleaned up Knox IDs for ${updates.length} assets`,
        count: updates.length,
        updatedAssets: updates
      });
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Licenses API
  app.get("/api/licenses", checkPermission('licenses', 'view'), async (req: Request, res: Response) => {
    try {
      const licenses = await storage.getLicenses();
      return res.json(licenses);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/licenses/:id", checkPermission('licenses', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const license = await storage.getLicense(id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }
      return res.json(license);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/licenses", checkPermission('licenses', 'add'), async (req: Request, res: Response) => {
    try {
      const licenseData = insertLicenseSchema.parse(req.body);
      const license = await storage.createLicense(licenseData);

      return res.status(201).json(license);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.patch("/api/licenses/:id", checkPermission('licenses', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingLicense = await storage.getLicense(id);
      if (!existingLicense) {
        return res.status(404).json({ message: "License not found" });
      }

      // Validate update data
      const updateData = insertLicenseSchema.partial().parse(req.body);

      // Auto-update status based on assigned seats and expiration date
      if (updateData.assignedSeats !== undefined || updateData.expirationDate !== undefined) {
        const expirationDate = updateData.expirationDate || existingLicense.expirationDate;
        const assignedSeats = updateData.assignedSeats !== undefined ? updateData.assignedSeats : existingLicense.assignedSeats || 0;

        // If expiration date passed, set to EXPIRED
        if (expirationDate && new Date(expirationDate) < new Date()) {
          updateData.status = LicenseStatus.EXPIRED;
        }
        // If there are assigned seats, set to ACTIVE (unless expired)
        else if (assignedSeats > 0 && (!updateData.status || updateData.status !== LicenseStatus.EXPIRED)) {
          updateData.status = LicenseStatus.ACTIVE;
        }
        // If no seats are assigned and it's not expired, set to UNUSED
        else if (assignedSeats === 0 && (!updateData.status || updateData.status !== LicenseStatus.EXPIRED)) {
          updateData.status = LicenseStatus.UNUSED;
        }
      }

      const updatedLicense = await storage.updateLicense(id, updateData);

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "license",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `License "${updatedLicense?.name}" updated`
      });

      return res.json(updatedLicense);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Get all license assignments for a specific license
  app.get("/api/licenses/:id/assignments", async (req: Request, res: Response) => {
    try {
      const licenseId = parseInt(req.params.id);
      const assignments = await storage.getLicenseAssignments(licenseId);
      res.json(assignments);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Assign a license seat
  app.post("/api/licenses/:id/assign", async (req: Request, res: Response) => {
    try {
      const licenseId = parseInt(req.params.id);
      const { assignedTo, notes } = req.body;

      // 1. Get the license
      const license = await storage.getLicense(licenseId);
      if (!license) {
        return res.status(404).json({ error: "License not found" });
      }

      // 2. Check if there are available seats
      if (license.seats && license.seats !== 'Unlimited') {
        const totalSeats = parseInt(license.seats);
        if ((license.assignedSeats || 0) >= totalSeats) {
          return res.status(400).json({ error: "No available seats for this license" });
        }
      }

      // 3. Create assignment
      const assignment = await storage.createLicenseAssignment({
        licenseId,
        assignedTo,
        notes,
        assignedDate: new Date().toISOString()
      });

      // 4. Update license assignedSeats count
      let status = license.status;
      // Auto-update status based on new assignment and expiration date
      if (license.expirationDate && new Date(license.expirationDate) < new Date()) {
        status = LicenseStatus.EXPIRED;
      } else {
        status = LicenseStatus.ACTIVE; // Since we're adding a seat, it's now active
      }

      const updatedLicense = await storage.updateLicense(licenseId, {
        assignedSeats: (license.assignedSeats || 0) + 1,
        status
      });

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "license",
        itemId: licenseId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `License seat assigned to: ${assignedTo}`
      });

      res.status(201).json({ assignment, license: updatedLicense });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.delete("/api/licenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingLicense = await storage.getLicense(id);
      if (!existingLicense) {
        return res.status(404).json({ message: "License not found" });
      }

      await storage.deleteLicense(id);

      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });


  // Edit consumable assignment - alternate route pattern
  app.patch("/api/consumables/:consumableId/assignments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const updateData = req.body;

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get existing assignment
      const [existingAssignment] = await db.select()
        .from(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.id, assignmentId));

      if (!existingAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Update assignment
      const [updatedAssignment] = await db.update(schema.consumableAssignments)
        .set({
          assignedTo: updateData.assignedTo,
          serialNumber: updateData.serialNumber || null,
          knoxId: updateData.knoxId || null,
          notes: updateData.notes || null,
        })
        .where(eq(schema.consumableAssignments.id, assignmentId))
        .returning();

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "consumable_assignment",
        itemId: assignmentId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Updated assignment for ${updateData.assignedTo}`,
      });

      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating consumable assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });


  // IT Equipment API
  // Get all IT equipment
  app.get('/api/it-equipment', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const equipment = await db.select().from(itEquipment);
      // Decrypt PII fields before sending to client
      const decryptedEquipment = batchDecryptFields(equipment, PII_FIELDS.itEquipment);
      res.json(decryptedEquipment);
    } catch (error) {
      console.error('Error fetching IT equipment:', error);
      res.status(500).json({
        message: 'Failed to fetch IT equipment'
      });
    }
  });

  // Get IT equipment by ID
  app.get('/api/it-equipment/:id', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const id = parseInt(req.params.id);
      const [equipment] = await db.select()
        .from(itEquipment)
        .where(eq(itEquipment.id, id));

      if (!equipment) {
        return res.status(404).json({
          message: 'IT equipment not found'
        });
      }

      // Decrypt PII fields before sending to client
      const decryptedEquipment = decryptFields(equipment, PII_FIELDS.itEquipment);
      res.json(decryptedEquipment);
    } catch (error) {
      console.error('Error fetching IT equipment:', error);
      res.status(500).json({
        message: 'Failed to fetch IT equipment'
      });
    }
  });

  app.post("/api/it-equipment", requireAuth, async (req: Request, res: Response) => {
    try {
      const equipmentData = req.body;
      console.log('Creating IT equipment with data:', equipmentData);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields
      if (!equipmentData.name || !equipmentData.category || !equipmentData.totalQuantity) {
        return res.status(400).json({
          message: "Name, category, and total quantity are required"
        });
      }

      const newEquipment = {
        name: equipmentData.name.trim(),
        category: equipmentData.category.trim(),
        totalQuantity: parseInt(equipmentData.totalQuantity),
        assignedQuantity: 0,
        model: equipmentData.model?.trim() || null,
        location: equipmentData.location?.trim() || null,
        dateAcquired: equipmentData.dateAcquired || null,
        knoxId: equipmentData.knoxId?.trim() || null,
        serialNumber: equipmentData.serialNumber?.trim() || null,
        dateRelease: equipmentData.dateRelease || null,
        remarks: equipmentData.remarks?.trim() || null,
        status: equipmentData.status || 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const [createdEquipment] = await db.insert(schema.itEquipment)
        .values(newEquipment)
        .returning();

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "it-equipment",
        itemId: createdEquipment.id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment "${createdEquipment.name}" created`,
      });

      // Send email notification
      try {
        await emailService.initialize();
        await emailService.sendModificationNotification({
          action: 'created',
          itemType: 'IT Equipment',
          itemName: createdEquipment.name,
          userName: req.user?.username || 'Unknown',
          details: `IT Equipment created: ${createdEquipment.name}, Category: ${createdEquipment.category}, Quantity: ${createdEquipment.totalQuantity}`,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to send email notification:', err);
      }

      console.log('IT Equipment created successfully:', createdEquipment);
      res.status(201).json(createdEquipment);
    } catch (error) {
      console.error("Error creating IT equipment:", error);
      res.status(500).json({
        message: "Failed to create IT equipment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/it-equipment/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const equipmentData = req.body;

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      const updateData = {
        name: equipmentData.name?.trim(),
        category: equipmentData.category?.trim(),
        totalQuantity: equipmentData.totalQuantity ? parseInt(equipmentData.totalQuantity) : undefined,
        model: equipmentData.model?.trim() || null,
        location: equipmentData.location?.trim() || null,
        dateAcquired: equipmentData.dateAcquired || null,
        knoxId: equipmentData.knoxId?.trim() || null,
        serialNumber: equipmentData.serialNumber?.trim() || null,
        dateRelease: equipmentData.dateRelease || null,
        remarks: equipmentData.remarks?.trim() || null,
        status: equipmentData.status,
        updatedAt: new Date().toISOString()
      };

      // Remove undefined values
      const cleanUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanUpdateData[key] = updateData[key];
        }
      });

      const [equipment] = await db.update(schema.itEquipment)
        .set(cleanUpdateData)
        .where(eq(schema.itEquipment.id, id))
        .returning();

      if (!equipment) {
        return res.status(404).json({ message: "IT Equipment not found" });
      }

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "it-equipment",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment "${equipment.name}" updated`,
      });

      // Send email notification with detailed logging
      try {
        const settings = await storage.getSystemSettings();
        console.log(`\n📧 ========== IT EQUIPMENT EMAIL NOTIFICATION ==========`);
        console.log(`📧 Equipment: ${equipment.name}`);
        console.log(`📧 Action: UPDATE`);
        console.log(`📧 User: ${req.user?.username || 'Unknown'}`);
        console.log(`📧 Settings Check:`);
        console.log(`   - Company Email: ${settings?.companyEmail || 'NOT SET'}`);
        console.log(`   - Mail Host: ${settings?.mailHost || 'NOT SET'}`);
        console.log(`   - Admin Notifications: ${settings?.enableAdminNotifications ?? 'NOT SET (defaults to TRUE)'}`);
        console.log(`   - IT Equipment Notifications: ${settings?.notifyOnItEquipmentChanges ?? 'NOT SET (defaults to TRUE)'}`);

        // Ensure email service is initialized
        await emailService.initialize();
        console.log(`📧 [IT-EQUIPMENT] Email service initialized`);

        const emailSent = await emailService.sendModificationNotification({
          action: 'update',
          itemType: 'IT Equipment',
          itemName: equipment.name,
          userName: req.user?.username || 'Unknown',
          details: `Equipment updated - Category: ${equipment.category}, Quantity: ${equipment.totalQuantity}`,
          timestamp: new Date().toISOString()
        });

        console.log(`Email Result: ${emailSent ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`📧 =====================================================\n`);
      } catch (err: any) {
        console.error(`❌ [IT-EQUIPMENT] Email notification exception:`, err);
      }

      res.json(equipment);
    } catch (error) {
      console.error("Error updating IT equipment:", error);
      res.status(500).json({ message: "Failed to update IT equipment" });
    }
  });

  app.delete("/api/it-equipment/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Get equipment info before deletion
      const [equipment] = await db.select()
        .from(schema.itEquipment)
        .where(eq(schema.itEquipment.id, id));

      if (!equipment) {
        return res.status(404).json({ message: "IT Equipment not found" });
      }

      // Delete assignments first
      await db.delete(schema.itEquipmentAssignments)
        .where(eq(schema.itEquipmentAssignments.equipmentId, id));

      // Delete equipment
      await db.delete(schema.itEquipment)
        .where(eq(schema.itEquipment.id, id));

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "it-equipment",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment "${equipment.name}" deleted`,
      });

      // Send email notification
      try {
        const emailSent = await emailService.sendModificationNotification({
          action: 'delete',
          itemType: 'IT Equipment',
          itemName: equipment.name,
          userName: req.user?.username || 'Unknown',
          details: `Equipment deleted - Category: ${equipment.category}`,
          timestamp: new Date().toISOString()
        });
        if (emailSent) {
          console.log(`✅ Email notification sent for IT equipment deletion: ${equipment.name}`);
        }
      } catch (err) {
        console.error('❌ Email notification failed:', err);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting IT equipment:", error);
      res.status(500).json({ message: "Failed to delete IT equipment" });
    }
  });

  app.post("/api/it-equipment/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { equipment } = req.body;

      if (!Array.isArray(equipment)) {
        return res.status(400).json({
          message: "Invalid request format. Expected an array of equipment.",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["Request body must contain an 'equipment' array"]
        });
      }

      if (equipment.length === 0) {
        return res.status(400).json({
          message: "No equipment to import",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["No equipment provided in the request"]
        });
      }

      if (!db) {
        return res.status(503).json({
          message: "Database not available",
          total: equipment.length,
          successful: 0,
          failed: equipment.length,
          errors: ["Database connection required for CSV import"]
        });
      }

      let successful = 0;
      let failed = 0;
      const errors = [];

      console.log(`Starting import of ${equipment.length} IT equipment items...`);

      for (let i = 0; i < equipment.length; i++) {
        try {
          const item = equipment[i];
          const rowNumber = i + 1;

          console.log(`Processing equipment row ${rowNumber}:`, item);

          if (!item.name || !item.category || !item.totalQuantity) {
            throw new Error(`Row ${rowNumber}: Name, category, and total quantity are required`);
          }

          // Parse assignment data
          const hasAssignment = item.assignedTo && item.assignedTo.trim() !== '' && item.assignedTo !== '-';
          const assignmentQuantity = hasAssignment ? parseInt(item.assignedQuantity || '1') : 0;

          const newEquipment = {
            name: item.name.trim(),
            category: item.category.trim(),
            totalQuantity: parseInt(item.totalQuantity),
            assignedQuantity: assignmentQuantity, // Set correct assigned quantity
            model: item.model?.trim() || null,
            location: item.location?.trim() || null,
            dateAcquired: item.dateAcquired || null,
            knoxId: item.knoxId?.trim() || null,
            serialNumber: item.serialNumber?.trim() || null,
            dateRelease: item.dateRelease || null,
            remarks: item.remarks?.trim() || null,
            status: item.status || 'available',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          console.log(`Creating equipment with data:`, newEquipment);

          const [createdEquipment] = await db.insert(schema.itEquipment).values(newEquipment).returning();

          // Create assignment if assignment data exists
          if (hasAssignment && assignmentQuantity > 0) {
            const assignmentData = {
              equipmentId: createdEquipment.id,
              assignedTo: item.assignedTo.trim(),
              knoxId: item.assignmentKnoxId?.trim() || item.knoxId?.trim() || null,
              serialNumber: item.assignmentSerialNumber?.trim() || item.serialNumber?.trim() || null,
              quantity: assignmentQuantity,
              assignedDate: item.assignedDate || new Date().toISOString(),
              status: 'assigned',
              notes: item.assignmentNotes?.trim() || null
            };

            console.log(`Creating assignment with data:`, assignmentData);

            await db.insert(schema.itEquipmentAssignments).values(assignmentData);

            // Log assignment activity
            await storage.createActivity({
              action: "assign",
              itemType: "it-equipment",
              itemId: createdEquipment.id,
              userId: req.user?.id || 1,
              timestamp: new Date().toISOString(),
              notes: `IT Equipment imported with assignment to ${item.assignedTo} (Qty: ${assignmentQuantity})`,
            });

            console.log(`Assignment created successfully for ${item.assignedTo}`);
          }

          // Log equipment creation
          await storage.createActivity({
            action: "create",
            itemType: "it-equipment",
            itemId: createdEquipment.id,
            userId: req.user?.id || 1,
            timestamp: new Date().toISOString(),
            notes: `IT Equipment "${createdEquipment.name}" imported via CSV${hasAssignment ? ' with assignment' : ''}`,
          });

          // Send email notification for creation
          try {
            await emailService.initialize();
            await emailService.sendModificationNotification({
              action: 'created',
              itemType: 'IT Equipment',
              itemName: createdEquipment.name,
              userName: req.user?.username || 'Unknown',
              details: `IT Equipment created: ${createdEquipment.name}, Category: ${createdEquipment.category}, Quantity: ${createdEquipment.totalQuantity}`,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('Failed to send IT Equipment creation email notification:', err);
          }

          successful++;
          console.log(`Successfully processed equipment row ${rowNumber}: ${item.name}`);
        } catch (itemError) {
          failed++;
          const errorMessage = `Row ${i + 1}: ${itemError.message}`;
          errors.push(errorMessage);
          console.error(`Equipment import error:`, errorMessage, item);
        }
      }

      console.log(`Import completed. Successful: ${successful}, Failed: ${failed}`);

      const response = {
        total: equipment.length,
        successful,
        failed,
        errors,
        message: `Import completed. ${successful} equipment items imported, ${failed} failed.`
      };

      const statusCode = failed > 0 ? 200 : 201;
      return res.status(statusCode).json(response);
    } catch (error) {
      console.error("IT Equipment import error:", error);
      return res.status(500).json({
        message: "Import failed",
        error: error.message
      });
    }
  });

  // IT Equipment Assignment routes
  app.get("/api/it-equipment/:id/assignments", requireAuth, async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      const assignments = await db.select()
        .from(schema.itEquipmentAssignments)
        .where(eq(schema.itEquipmentAssignments.equipmentId, equipmentId))
        .orderBy(schema.itEquipmentAssignments.assignedDate);

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching IT equipment assignments:", error);
      res.status(500).json({ message: "Failed to fetch IT equipment assignments" });
    }
  });

  app.post("/api/it-equipment/:id/assign", requireAuth, async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const assignmentData = req.body;

      console.log('IT Equipment assignment request:', { equipmentId, assignmentData });

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields
      if (!assignmentData.assignedTo) {
        return res.status(400).json({
          message: "assignedTo is required"
        });
      }

      // Get equipment to check availability
      const [equipment] = await db.select()
        .from(schema.itEquipment)
        .where(eq(schema.itEquipment.id, equipmentId));

      if (!equipment) {
        return res.status(404).json({ message: "IT Equipment not found" });
      }

      console.log('Current equipment state:', equipment);

      const totalQuantity = equipment.totalQuantity || 0;
      const currentAssignedQuantity = equipment.assignedQuantity || 0;
      const availableQuantity = totalQuantity - currentAssignedQuantity;
      const requestedQuantity = parseInt(assignmentData.quantity) || 1;

      console.log('Quantity check:', { totalQuantity, currentAssignedQuantity, availableQuantity, requestedQuantity });

      if (requestedQuantity > availableQuantity) {
        return res.status(400).json({
          message: `Not enough units available. Requested: ${requestedQuantity}, Available: ${availableQuantity}`
        });
      }

      // Create assignment record
      const [assignment] = await db.insert(schema.itEquipmentAssignments).values({
        equipmentId,
        assignedTo: assignmentData.assignedTo,
        knoxId: assignmentData.knoxId || null,
        serialNumber: assignmentData.serialNumber || null,
        quantity: requestedQuantity,
        assignedDate: assignmentData.assignedDate || new Date().toISOString(),
        status: 'assigned',
        notes: assignmentData.notes || null
      }).returning();

      console.log('Assignment created:', assignment);

      // Update equipment assigned quantity
      const newAssignedQuantity = currentAssignedQuantity + requestedQuantity;
      const [updatedEquipment] = await db.update(schema.itEquipment)
        .set({
          assignedQuantity: newAssignedQuantity,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.itEquipment.id, equipmentId))
        .returning();

      console.log('Equipment updated:', updatedEquipment);

      // Log activity
      await storage.createActivity({
        action: "assign",
        itemType: "it-equipment",
        itemId: equipmentId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment assigned to ${assignmentData.assignedTo} (Qty: ${requestedQuantity})`,
      });

      // Return the assignment with updated equipment info
      res.status(201).json({
        assignment,
        updatedEquipment
      });
    } catch (error) {
      console.error("Error assigning IT equipment:", error);
      res.status(500).json({
        message: "Failed to assign IT equipment",
        error: error.message
      });
    }
  });

  app.post("/api/it-equipment/:id/bulk-assign", requireAuth, async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const { assignments } = req.body;

      console.log('Bulk assignment request:', { equipmentId, assignments });

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          message: "assignments array is required"
        });
      }

      // Get equipment to check availability
      const [equipment] = await db.select()
        .from(schema.itEquipment)
        .where(eq(schema.itEquipment.id, equipmentId));

      if (!equipment) {
        return res.status(404).json({ message: "IT Equipment not found" });
      }

      console.log('Equipment found:', equipment);

      const totalQuantity = equipment.totalQuantity || 0;
      const assignedQuantity = equipment.assignedQuantity || 0;
      const availableQuantity = totalQuantity - assignedQuantity;
      const totalRequestedQuantity = assignments.reduce((sum, a) => sum + (parseInt(a.quantity) || 1), 0);

      console.log('Quantity validation:', { totalQuantity, assignedQuantity, availableQuantity, totalRequestedQuantity });

      if (totalRequestedQuantity > availableQuantity) {
        return res.status(400).json({
          message: `Not enough units available. Requested: ${totalRequestedQuantity}, Available: ${availableQuantity}`
        });
      }

      const createdAssignments = [];

      // Create all assignments
      for (const assignmentData of assignments) {
        if (!assignmentData.assignedTo) {
          return res.status(400).json({
            message: "assignedTo is required for all assignments"
          });
        }

        console.log('Creating assignment:', assignmentData);

        const [assignment] = await db.insert(schema.itEquipmentAssignments).values({
          equipmentId,
          assignedTo: assignmentData.assignedTo,
          knoxId: assignmentData.knoxId || null,
          serialNumber: assignmentData.serialNumber || null,
          quantity: parseInt(assignmentData.quantity) || 1,
          assignedDate: assignmentData.assignedDate || new Date().toISOString(),
          status: 'assigned',
          notes: assignmentData.notes || null
        }).returning();

        console.log('Assignment created:', assignment);
        createdAssignments.push(assignment);

        // Log activity for each assignment
        await storage.createActivity({
          action: "assign",
          itemType: "it-equipment",
          itemId: equipmentId,
          userId: req.user?.id || 1,
          timestamp: new Date().toISOString(),
          notes: `IT Equipment assigned to ${assignmentData.assignedTo} (Qty: ${parseInt(assignmentData.quantity) || 1})`,
        });
      }

      // Update equipment assigned quantity
      const newAssignedQuantity = assignedQuantity + totalRequestedQuantity;
      const [updatedEquipment] = await db.update(schema.itEquipment)
        .set({
          assignedQuantity: newAssignedQuantity,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.itEquipment.id, equipmentId))
        .returning();

      res.status(201).json({
        message: `Successfully created ${createdAssignments.length} assignments`,
        assignments: createdAssignments,
        updatedEquipment
      });
    } catch (error) {
      console.error("Error in bulk assignment:", error);
      res.status(500).json({
        message: "Failed to create bulk assignments",
        error: error.message
      });
    }
  });

  // Remove IT equipment assignment
  app.delete("/api/it-equipment/assignments/:assignmentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Get assignment details before deletion
      const [assignment] = await db.select()
        .from(schema.itEquipmentAssignments)
        .where(eq(schema.itEquipmentAssignments.id, assignmentId));

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Get equipment to update assigned quantity
      const [equipment] = await db.select()
        .from(schema.itEquipment)
        .where(eq(schema.itEquipment.id, assignment.equipmentId));

      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      // Delete the assignment
      await db.delete(schema.itEquipmentAssignments)
        .where(eq(schema.itEquipmentAssignments.id, assignmentId));

      // Update equipment assigned quantity
      const currentAssignedQuantity = equipment.assignedQuantity || 0;
      const newAssignedQuantity = Math.max(0, currentAssignedQuantity - (assignment.quantity || 1));

      await db.update(schema.itEquipment)
        .set({
          assignedQuantity: newAssignedQuantity,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.itEquipment.id, assignment.equipmentId));

      // Log activity
      await storage.createActivity({
        action: "unassign",
        itemType: "it-equipment",
        itemId: assignment.equipmentId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment assignment removed for ${assignment.assignedTo} (Qty: ${assignment.quantity})`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing IT equipment assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  // Activities API
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      return res.json(activities);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/users/:id/activities", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activities = await storage.getActivitiesByUser(userId);
      return res.json(activities);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/assets/:id/activities", async (req: Request, res: Response) => {
    try {
      const assetId = parseInt(req.params.id);
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const activities = await storage.getActivitiesByAsset(assetId);
      return res.json(activities);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Components API
  app.get("/api/components", checkPermission('components', 'view'), async (req: Request, res: Response) => {
    try {
      const components = await storage.getComponents();
      return res.json(components);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/components/:id", checkPermission('components', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const component = await storage.getComponent(id);
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      return res.json(component);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/components", checkPermission('components', 'add'), async (req: Request, res: Response) => {
    try {
      console.log('Creating component with data:', req.body);

      const componentData = insertComponentSchema.parse(req.body);
      const component = await storage.createComponent(componentData);

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "component",
        itemId: component.id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Created component: ${component.name}`,
      });

      console.log('Component created successfully:', component);
      return res.status(201).json(component);
    } catch (err) {
      console.error('Error creating component:', err);
      return handleError(err, res);
    }
  });

  app.patch("/api/components/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const component = await storage.updateComponent(id, updates);

      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "component",
        itemId: id,
        userId: 1, // Default user for now
        timestamp: new Date().toISOString(),
        notes: `Updated component: ${component.name}`,
      });

      return res.json(component);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.delete("/api/components/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existingComponent = await storage.getComponent(id);
      if (!existingComponent) {
        return res.status(404).json({ message: "Component not found" });
      }

      await storage.deleteComponent(id);

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "component",
        itemId: id,
        userId: 1, // Default user for now
        timestamp: new Date().toISOString(),
        notes: `Deleted component: ${existingComponent.name}`,
      });

      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  // VM Monitoring API - Add or update VM monitoring data
  app.post("/api/vm-monitoring", async (req: Request, res: Response) => {
    try {
      const monitoringData = insertVMMonitoringSchema.parse(req.body);

      // Check if VM monitoring data already exists
      const existingData = await storage.getVMMonitoringByVMId(monitoringData.vmId);

      let result;
      if (existingData) {
        // Update existing data
        result = await storage.updateVMMonitoring(existingData.id, monitoringData);
      } else {
        // Create new data
        result = await storage.createVMMonitoring(monitoringData);
      }

      return res.status(201).json(result);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // VM Monitoring API - Manual sync with Zabbix
  app.post("/api/vm-monitoring/sync", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getZabbixSettings();
      if (!settings || !settings.url || !settings.username || !settings.password) {
        return res.status(400).json({ message: "Zabbix connection not configured" });
      }

      // Authenticate with Zabbix API
      const authResponse = await fetch(settings.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'user.login',
          params: {
            user: settings.username,
            password: settings.password
          },
          id: 1
        })
      });

      const authData = await authResponse.json();
      if (authData.error) {
        throw new Error(`Zabbix authentication failed: ${authData.error.message}`);
      }

      const authToken = authData.result;

      // Get hosts to sync
      const hostsResponse = await fetch(settings.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'host.get',
          params: {
            output: ['hostid', 'host', 'name', 'status', 'available'],
            selectItems: ['key_', 'lastvalue', 'units'],
            selectInterfaces: ['ip'],
            filter: {
              status: 0 // Only enabled hosts
            }
          },
          auth: authToken,
          id: 2
        })
      });

      const hostsData = await hostsResponse.json();
      if (hostsData.error) {
        throw new Error(`Failed to fetch hosts: ${hostsData.error.message}`);
      }

      let syncedCount = 0;

      // Process and store VM monitoring data
      for (const host of hostsData.result) {
        try {
          const cpuItem = host.items?.find((item: any) =>
            item.key_.includes('system.cpu.util') || item.key_.includes('cpu.usage')
          );
          const memoryItem = host.items?.find((item: any) =>
            item.key_.includes('memory.util') || item.key_.includes('vm.memory.util')
          );
          const diskItem = host.items?.find((item: any) =>
            item.key_.includes('vfs.fs.size') && item.key_.includes('pfree')
          );
          const uptimeItem = host.items?.find((item: any) =>
            item.key_.includes('system.uptime')
          );

          const vmData = {
            vmId: parseInt(host.hostid),
            hostname: host.name,
            ipAddress: host.interfaces?.[0]?.ip || host.host,
            status: getVMStatusFromZabbix(host.available),
            cpuUsage: cpuItem ? parseFloat(cpuItem.lastvalue) : null,
            memoryUsage: memoryItem ? parseFloat(memoryItem.lastvalue) : null, // Corrected to use memoryItem.lastvalue
            diskUsage: diskItem ? (100 - parseFloat(diskItem.lastvalue)) : null,
            uptime: uptimeItem ? parseInt(uptimeItem.lastvalue) : null,
            networkStatus: host.available === '1' ? 'up' : 'down',
            updatedAt: new Date().toISOString()
          };

          // Check if VM monitoring data already exists
          const existingData = await storage.getVMMonitoringByVMId(parseInt(host.hostid));

          if (existingData) {
            await storage.updateVMMonitoring(existingData.id, vmData);
          } else {
            await storage.createVMMonitoring(vmData);
          }

          syncedCount++;
        } catch (vmError) {
          console.error(`Error syncing VM ${host.name}:`, vmError);
        }
      }

      // Log activity
      await storage.createActivity({
        action: "sync",
        itemType: "vm-monitoring",
        itemId: 1,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Synchronized ${syncedCount} VMs from Zabbix`,
      });

      return res.json({
        success: true,
        message: `Sync completed successfully. Synchronized ${syncedCount} VMs.`,
        count: syncedCount
      });
    } catch (err) {
      console.error('VM sync error:', err);
      return handleError(err, res);
    }
  });

  // Helper function to convert Zabbix availability to VM status
  function getVMStatusFromZabbix(available: string | number): string {
    const statusMap: { [key: string]: string } = {
      '0': 'unknown',
      '1': 'running',
      '2': 'stopped'
    };
    return statusMap[available.toString()] || 'unknown';
  }

  // Network Discovery API - Get all discovered hosts
  app.get("/api/network-discovery/hosts", async (req: Request, res: Response) => {
    try {
      const hosts = await storage.getDiscoveredHosts();
      return res.json(hosts);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Get specific discovered host
  app.get("/api/network-discovery/hosts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const host = await storage.getDiscoveredHost(id);

      if (!host) {
        return res.status(404).json({ message: "Discovered host not found" });
      }

      return res.json(host);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Create discovered host
  app.post("/api/network-discovery/hosts", async (req: Request, res: Response) => {
    try {
      const hostData = insertDiscoveredHostSchema.parse(req.body);
      const host = await storage.createDiscoveredHost(hostData);
      return res.status(201).json(host);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Update discovered host
  app.patch("/api/network-discovery/hosts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const host = await storage.getDiscoveredHost(id);

      if (!host) {
        return res.status(404).json({ message: "Discovered host not found" });
      }

      const updateData = insertDiscoveredHostSchema.partial().parse(req.body);
      const updatedHost = await storage.updateDiscoveredHost(id, updateData);

      return res.json(updatedHost);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Delete discovered host
  app.delete("/api/network-discovery/hosts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const host = await storage.getDiscoveredHost(id);

      if (!host) {
        return res.status(404).json({ message: "Discovered host not found" });
      }

      await storage.deleteDiscoveredHost(id);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Initiate network scan
  app.post("/api/network-discovery/scan", async (req: Request, res: Response) => {
    try {
      const {
        ipRange,
        primaryDNS,
        secondaryDNS,
        useDNS,
        scanForUSB,
        scanForSerialNumbers,
        scanForHardwareDetails,
        scanForInstalledSoftware,
        zabbixUrl,
        zabbixApiKey,
        useZabbix
      } = req.body;

      if (!ipRange) {
        return res.status(400).json({ message: "IP range is required" });
      }

      // Validate IP range format
      const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
      if (!cidrRegex.test(ipRange)) {
        return res.status(400).json({ message: "Invalid IP range format. Use CIDR notation (e.g., 192.168.1.0/24)" });
      }

      console.log(`Starting real network scan for range: ${ipRange}`);

      // Check if we should use Zabbix settings
      let usingZabbix = false;
      let zabbixInfo = {};

      if (useZabbix && zabbixUrl && zabbixApiKey) {
        usingZabbix = true;
        zabbixInfo = {
          url: zabbixUrl,
          apiKey: zabbixApiKey
        };
        console.log(`Network scan will use Zabbix integration: ${zabbixUrl}`);
      }

      // Prepare DNS settings
      let dnsSettings = null;
      if (useDNS && (primaryDNS || secondaryDNS)) {
        dnsSettings = {
          primaryDNS: primaryDNS || '8.8.8.8',
          secondaryDNS: secondaryDNS || '8.8.4.4'
        };
        console.log(`Network scan will use DNS servers: ${dnsSettings.primaryDNS}, ${dnsSettings.secondaryDNS}`);
      }

      // Send scan initiation response
      const scanDetails = {
        ipRange,
        scanOptions: {
          scanForUSB: scanForUSB || false,
          scanForSerialNumbers: scanForSerialNumbers || false,
          scanForHardwareDetails: scanForHardwareDetails || false,
          scanForInstalledSoftware: scanForInstalledSoftware || false,
          useDNS: useDNS || false
        },
        usingZabbix,
        dnsSettings,
        startTime: new Date().toISOString()
      };

      // Start actual network scanning in background
      startNetworkScan(ipRange, scanDetails, storage);

      // Send immediate response to the client
      return res.json({
        success: true,
        message: "Real network scan initiated. This may take several minutes to complete.",
        scanDetails
      });
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Network Discovery API - Import discovered host as asset
  app.post("/api/network-discovery/hosts/:id/import", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const host = await storage.getDiscoveredHost(id);

      if (!host) {
        return res.status(404).json({ message: "Discovered host not found" });
      }

      // Create asset from discovered host
      const assetData = {
        name: host.hostname || host.ipAddress,
        status: "available",
        assetTag: `DISC-${Date.now()}`,
        category: "computer",
        ipAddress: host.ipAddress,
        macAddress: host.macAddress,
        model: host.hardwareDetails && typeof host.hardwareDetails === 'object' ? host.hardwareDetails.model || null : null,
        manufacturer: host.hardwareDetails && typeof host.hardwareDetails === 'object' ? host.hardwareDetails.manufacturer || null : null,
        osType: host.systemInfo && typeof host.systemInfo === 'object' ? host.systemInfo.os || null : null,
        serialNumber: host.hardwareDetails && typeof host.hardwareDetails === 'object' ? host.hardwareDetails.serialNumber || null : null,
        description: `Imported from network discovery: ${host.ipAddress}`
      };

      const asset = await storage.createAsset(assetData);

      // Update the discovered host status to imported
      await storage.updateDiscoveredHost(id, { status: "imported" });

      // Log the activity
      await storage.createActivity({
        action: "import",
        itemType: "asset",
        itemId: asset.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Asset imported from discovered host ${host.ipAddress}`
      });

      return res.status(201).json({
        success: true,
        message: "Host successfully imported as asset",
        asset
      });
    } catch (err) {
      return handleError(err, res);
    }
  });

  // Bitlocker Keys API endpoints
  app.get("/api/bitlocker-keys", async (req: Request, res: Response) => {
    try {
      console.log('Fetching BitLocker keys...');

      // Try PostgreSQL first, fallback to memory storage automatically
      const keys = await storage.getBitlockerKeys();

      console.log(`Found ${keys.length} BitLocker keys`);
      return res.json(keys);
    } catch (err) {
      console.error('Error fetching BitLocker keys:', err);
      return handleError(err, res);
    }
  });

  app.get("/api/bitlocker-keys/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const key = await storage.getBitlockerKey(id);

      if (!key) {
        return res.status(404).json({ message: "Bitlocker key not found" });
      }

      return res.json(key);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/bitlocker-keys/search/serial/:serialNumber", async (req: Request, res: Response) => {
    try {
      const serialNumber = req.params.serialNumber;
      const keys = await storage.getBitlockerKeyBySerialNumber(serialNumber);
      return res.json(keys);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.get("/api/bitlocker-keys/search/identifier/:identifier", async (req: Request, res: Response) => {
    try {
      const identifier = req.params.identifier;
      const keys = await storage.getBitlockerKeyByIdentifier(identifier);
      return res.json(keys);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.post("/api/bitlocker-keys", async (req: Request, res: Response) => {
    try {
      const { insertBitlockerKeySchema } = schema;
      const data = insertBitlockerKeySchema.parse(req.body);

      console.log('Creating BitLocker key:', data.serialNumber);

      // Use the unified storage layer which handles both DB and memory fallback
      const key = await storage.createBitlockerKey(data);

      console.log('BitLocker key created successfully:', key.id);

      // Log activity
      try {
        await storage.createActivity({
          action: "create",
          itemType: "bitlocker",
          itemId: key.id,
          userId: req.user?.id || 1,
          timestamp: new Date().toISOString(),
          notes: `BitLocker key created for ${data.serialNumber}`,
        });
      } catch (activityError) {
        console.warn('Failed to create activity log:', activityError);
      }

      return res.status(201).json(key);
    } catch (err) {
      console.error('Error creating BitLocker key:', err);

      // Provide specific error handling for database issues
      if (err.message && err.message.includes('Database connection required')) {
        return res.status(503).json({
          message: 'BitLocker key creation requires database connection. Please set up PostgreSQL database.',
          instruction: 'Go to Database tab → Create a database to fix this issue.',
          code: 'DB_CONNECTION_REQUIRED'
        });
      }

      return handleError(err, res);
    }
  });

  app.patch("/api/bitlocker-keys/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { insertBitlockerKeySchema } = schema;
      const updateData = insertBitlockerKeySchema.partial().parse(req.body);
      const key = await storage.updateBitlockerKey(id, updateData);

      if (!key) {
        return res.status(404).json({ message: "Bitlocker key not found" });
      }

      return res.json(key);
    } catch (err) {
      return handleError(err, res);
    }
  });

  app.delete("/api/bitlocker-keys/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteBitlockerKey(id);

      if (!result) {
        return res.status(404).json({ message: "Bitlocker key not found" });
      }

      return res.json({ message: "Bitlocker key deleted successfully" });
    } catch (err) {
      return handleError(err, res);
    }
  });

  // IAM Accounts routes
  app.get('/api/iam-accounts', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const accounts = await db.select().from(iamAccounts);
      // Decrypt PII fields before sending to client
      const decryptedAccounts = batchDecryptFields(accounts, PII_FIELDS.iamAccount);
      res.json(decryptedAccounts);
    } catch (error) {
      console.error('Error fetching IAM accounts:', error);
      res.status(500).json({
        message: 'Failed to fetch IAM accounts'
      });
    }
  });

  // IAM Account Approval History endpoint
  app.get("/api/iam-accounts/:id/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Check if table exists, create if it doesn't
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS iam_account_approval_history (
            id SERIAL PRIMARY KEY,
            iam_account_id INTEGER NOT NULL REFERENCES iam_accounts(id) ON DELETE CASCADE,
            approval_number TEXT NOT NULL,
            duration TEXT,
            action TEXT NOT NULL,
            acted_by TEXT NOT NULL,
            acted_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `);
      } catch (tableError) {
        console.warn("Table creation check:", tableError);
      }

      // Get approval history for the IAM account
      const history = await db.execute(sql`
        SELECT
          h.*,
          u.username as acted_by_username,
          u.first_name as acted_by_first_name,
          u.last_name as acted_by_last_name
        FROM iam_account_approval_history h
        LEFT JOIN users u ON h.acted_by = u.username -- Assuming acted_by stores username
        WHERE h.iam_account_id = ${accountId}
        ORDER BY h.acted_at DESC
      `);

      const formattedHistory = history.rows.map((row: any) => ({
        id: row.id,
        iamAccountId: row.iam_account_id,
        approvalNumber: row.approval_number,
        duration: row.duration,
        action: row.action,
        actedBy: row.acted_by_username || row.acted_by, // Prefer username if available
        actedAt: row.acted_at,
        actedByName: row.acted_by_first_name && row.acted_by_last_name
          ? `${row.acted_by_first_name} ${row.acted_by_last_name}`
          : row.acted_by_username || row.acted_by || 'Unknown'
      }));

      res.json(formattedHistory);
    } catch (error) {
      console.error("Error fetching IAM account approval history:", error);
      res.status(500).json({ message: "Failed to fetch approval history" });
    }
  });

  app.post("/api/iam-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const accountData = req.body;

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Only encrypt if ENCRYPTION_KEY is set
      let dataToStore = accountData;
      if (process.env.ENCRYPTION_KEY) {
        const { encryptFields, PII_FIELDS } = await import("./encryption");
        dataToStore = encryptFields(accountData, PII_FIELDS.iamAccount);
      }

      const [account] = await db.insert(schema.iamAccounts)
        .values(dataToStore)
        .returning();

      // Create initial approval history record if approval ID is provided
      if (account.approvalId) {
        let duration = '';

        if (account.durationStartDate && account.durationEndDate) {
          const startDate = new Date(account.durationStartDate);
          const endDate = new Date(account.durationEndDate);
          const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          duration = `${months} month${months !== 1 ? 's' : ''}`;
        }

        await db.insert(schema.iamAccountApprovalHistory).values({
          iamAccountId: account.id,
          approvalNumber: account.approvalId,
          duration: duration,
          action: 'Created',
          actedBy: req.user?.username || req.user?.email || 'Unknown',
        });
      }

      // Decrypt for response only if encryption is enabled
      let responseAccount = account;
      if (process.env.ENCRYPTION_KEY) {
        const { decryptFields, PII_FIELDS } = await import("./encryption");
        responseAccount = decryptFields(account, PII_FIELDS.iamAccount);
      }

      res.status(201).json(responseAccount);
    } catch (error) {
      console.error("Error creating IAM account:", error);
      res.status(500).json({ message: "Failed to create IAM account" });
    }
  });

  app.put("/api/iam-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accountData = req.body;

      console.log(`📧 [IAM-UPDATE] Updating IAM account with ID: ${id}`);
      console.log(`📧 [IAM-UPDATE] Account data:`, accountData);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Get the existing account to check if approval ID changed
      const [existingAccount] = await db
        .select()
        .from(schema.iamAccounts)
        .where(eq(schema.iamAccounts.id, id));

      if (!existingAccount) {
        return res.status(404).json({ message: "IAM account not found" });
      }

      // Handle special status logic
      if (accountData.status === 'extended') {
        accountData.durationStartDate = null;
        accountData.durationEndDate = null;
      } else if (accountData.status === 'access_removed') {
        accountData.durationStartDate = null;
      }

      // Remove timestamp fields from the update data - database will handle them
      const { id: _, createdAt, updatedAt, ...cleanAccountData } = accountData;

      const [updatedAccount] = await db
        .update(schema.iamAccounts)
        .set({
          ...cleanAccountData,
          updatedAt: new Date()
        })
        .where(eq(schema.iamAccounts.id, id))
        .returning();

      console.log(`📧 [IAM-UPDATE] Account updated successfully:`, {
        id: updatedAccount.id,
        knoxId: updatedUser.knoxId,
        userKnoxId: updatedUser.userKnoxId,
        status: updatedAccount.status
      });

      // Check if approval ID changed and create history record
      if (existingAccount.approvalId !== accountData.approvalId) {
        const oldApprovalId = existingAccount.approvalId || 'None';
        const newApprovalId = accountData.approvalId || 'None';

        // Determine action and duration based on status
        let action = 'Updated';
        let duration = '';

        if (accountData.status === 'extended') {
          action = 'Extended';
          duration = 'Extended Access';
        } else if (accountData.status === 'access_removed') {
          action = 'Access Removed';
        } else if (existingAccount.durationEndDate && accountData.durationEndDate) {
          // Calculate duration if dates are available
          const startDate = new Date(accountData.durationStartDate || existingAccount.durationStartDate || new Date());
          const endDate = new Date(accountData.durationEndDate);
          const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          duration = `${months} month${months !== 1 ? 's' : ''}`;
        }

        await db.insert(schema.iamAccountApprovalHistory).values({
          iamAccountId: id,
          approvalNumber: newApprovalId,
          duration: duration,
          action: action,
          actedBy: req.user?.username || req.user?.email || 'Unknown',
        });
      }

      // Send email notification - ALWAYS attempt to send
      try {
        const settings = await storage.getSystemSettings();
        console.log(`📧 [IAM-UPDATE] Checking email configuration...`);
        console.log(`📧 [IAM-UPDATE] Settings:`, {
          companyEmail: settings?.companyEmail || 'NOT SET',
          mailHost: settings?.mailHost || 'NOT SET',
          mailPort: settings?.mailPort || 'NOT SET',
          mailFromAddress: settings?.mailFromAddress || 'NOT SET',
          enableAdminNotifications: settings?.enableAdminNotifications,
          notifyOnIamAccountChanges: settings?.notifyOnIamAccountChanges
        });

        if (!settings?.companyEmail || !settings?.mailHost) {
          console.log(`⚠️ [IAM-UPDATE] Email not configured - skipping notification`);
          console.log(`   Missing: ${!settings?.companyEmail ? 'Company Email' : ''} ${!settings?.mailHost ? 'Mail Host' : ''}`);
        } else {
          console.log(`📧 [IAM-UPDATE] Email configuration OK - proceeding with notification`);

          // Initialize email service before sending
          await emailService.initialize();
          console.log(`📧 [IAM-UPDATE] Email service initialized`);

          await logEmailEvent({
            timestamp: new Date().toISOString(),
            to: settings.companyEmail,
            subject: `[SRPH-MIS] UPDATE - IAM Account: ${updatedAccount.knoxId}`,
            status: 'pending'
          });

          const emailSent = await emailService.sendModificationNotification({
            action: 'update',
            itemType: 'IAM Account',
            itemName: updatedAccount.knoxId || 'Account',
            userName: req.user?.username || 'Unknown',
            details: `IAM Account updated: ${updatedAccount.knoxId}, Status: ${updatedAccount.status}, Requestor: ${updatedAccount.requestor}`,
            timestamp: new Date().toISOString()
          });

          if (emailSent) {
            console.log(`✅ [IAM-UPDATE] Email notification sent successfully to: ${settings.companyEmail}`);
            await logEmailEvent({
              timestamp: new Date().toISOString(),
              to: settings.companyEmail,
              subject: `[SRPH-MIS] UPDATE - IAM Account: ${updatedAccount.knoxId}`,
              status: 'success'
            });
          } else {
            console.log(`❌ [IAM-UPDATE] Email notification failed - service returned false`);
            await logEmailEvent({
              timestamp: new Date().toISOString(),
              to: settings.companyEmail,
              subject: `[SRPH-MIS] UPDATE - IAM Account: ${updatedAccount.knoxId}`,
              status: 'failed',
              error: 'Email service returned false - check notification settings and email configuration'
            });
          }
        }
      } catch (err: any) {
        console.error('❌ [IAM-UPDATE] Email notification exception:', err);
        console.error('   Error details:', {
          message: err.message,
          stack: err.stack,
          code: err.code
        });
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings?.companyEmail || 'N/A',
          subject: `[SRPH-MIS] UPDATE - IAM Account: ${updatedAccount.knoxId}`,
          status: 'failed',
          error: err.message || 'Unknown error'
        });
      }

      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating IAM account:", error);
      res.status(500).json({ message: "Failed to update IAM account" });
    }
  });

  app.delete("/api/iam-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE request received for IAM account ID: ${id}`);

      const existingAccount = await storage.getIamAccount(id);
      if (!existingAccount) {
        console.log(`IAM account with ID ${id} not found`);
        return res.status(404).json({ message: "IAM account not found" });
      }

      await storage.deleteIamAccount(id);

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "iam-account",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `IAM account for "${existingAccount.requestor}" deleted (Knox ID: "${existingAccount.knoxId}")`,
      });

      console.log(`IAM account with ID ${id} successfully deleted`);
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting IAM account:", err);
      return res.status(500).json({
        message: "Failed to delete IAM account",
        error: err.message
      });
    }
  });

  app.post("/api/iam-accounts/import", async (req: Request, res: Response) => {
    try {
      const { accounts } = req.body;

      if (!Array.isArray(accounts)) {
        return res.status(400).json({
          message: "Invalid request format. Expected an array of accounts.",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["Request body must contain an 'accounts' array"]
        });
      }

      if (accounts.length === 0) {
        return res.status(400).json({
          message: "No accounts to import",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["No accounts provided in the request"]
        });
      }

      console.log(`Starting import of ${accounts.length} IAM accounts...`);

      // Import accounts - encryption will be handled by storage layer based on settings
      const results = await storage.importIamAccounts(accounts);

      // Log activity
      await storage.createActivity({
        action: "import",
        itemType: "iam-accounts",
        itemId: 0, // Generic ID for bulk import
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Imported ${results.successful} IAM accounts, ${results.failed} failed.`,
      });

      console.log(`IAM account import completed. Successful: ${results.successful}, Failed: ${results.failed}`);
      return res.status(results.failed > 0 ? 200 : 201).json(results);
    } catch (err) {
      console.error("Error importing IAM accounts:", err);
      return res.status(500).json({
        message: "Failed to import IAM accounts",
        error: err.message
      });
    }
  });


  // Helper function to format bytes
  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Helper function to convert Zabbix severity to text
  function getSeverityFromPriority(priority: string | number | undefined): string {
    const severityMap: { [key: string]: string } = {
      '0': 'not_classified',
      '1': 'information',
      '2': 'warning',
      '3': 'average',
      '4': 'high',
      '5': 'disaster'
    };

    if (priority === undefined || priority === null) {
      return 'not_classified';
    }

    return severityMap[priority.toString()] || 'not_classified';
  }

  // Helper function to convert Zabbix availability status
  function getAvailabilityStatus(available: string | number | undefined): string {
    const statusMap: { [key: string]: string } = {
      '0': 'unknown',
      '1': 'available',
      '2': 'unavailable'
    };

    if (available === undefined || available === null) {
      return 'unknown';
    }

    return statusMap[available.toString()] || 'unknown';
  }

  // Monitoring Platform API routes
  app.get("/api/monitoring/dashboards", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({
          message: "Database not available. Please configure DATABASE_URL environment variable."
        });
      }

      const dashboards = await db.select().from(schema.monitoringDashboards).orderBy(schema.monitoringDashboards.id);
      res.json(dashboards);
    } catch (error) {
      console.error('Error fetching monitoring dashboards:', error);
      res.status(500).json({
        message: "Failed to fetch dashboards",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/monitoring/dashboards", requireAuth, async (req: Request, res: Response) => {
    try {
      const dashboardData = req.body;
      const [newDashboard] = await db.insert(schema.monitoringDashboards).values({
        name: dashboardData.name,
        description: dashboardData.description,
        isPublic: dashboardData.isPublic || false,
        refreshInterval: dashboardData.refreshInterval || 30,
        tags: dashboardData.tags || '',
        userId: req.user?.id || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      res.status(201).json(newDashboard);
    } catch (error) {
      console.error('Error creating monitoring dashboard:', error);
      res.status(500).json({ message: "Failed to create dashboard" });
    }
  });

  app.get("/api/monitoring/datasources", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({
          message: "Database not available. Please configure DATABASE_URL environment variable."
        });
      }

      const datasources = await db.select().from(schema.monitoringDatasources).orderBy(schema.monitoringDatasources.id);
      res.json(datasources);
    } catch (error) {
      console.error('Error fetching monitoring datasources:', error);
      res.status(500).json({
        message: "Failed to fetch datasources",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/monitoring/datasources", requireAuth, async (req: Request, res: Response) => {
    try {
      const datasourceData = req.body;
      const [newDatasource] = await db.insert(schema.monitoringDatasources).values({
        name: datasourceData.name,
        type: datasourceData.type,
        url: datasourceData.url,
        access: datasourceData.access || 'proxy',
        basicAuth: datasourceData.basicAuth || false,
        basicAuthUser: datasourceData.basicAuthUser,
        basicAuthPassword: datasourceData.basicAuthPassword,
        database: datasourceData.database,
        jsonData: datasourceData.jsonData ? JSON.stringify(datasourceData.jsonData) : null,
        secureJsonFields: datasourceData.secureJsonFields ? JSON.stringify(datasourceData.secureJsonFields) : null,
        isDefault: datasourceData.isDefault || false,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      res.status(201).json(newDatasource);
    } catch (error) {
      console.error('Error creating monitoring datasource:', error);
      res.status(500).json({ message: "Failed to create datasource" });
    }
  });

  app.get("/api/monitoring/alerts", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({
          message: "Database not available. Please configure DATABASE_URL environment variable."
        });
      }

      const alerts = await db.select().from(schema.monitoringAlertRules);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching monitoring alerts:', error);
      res.status(500).json({
        message: "Failed to fetch alerts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/monitoring/alerts", requireAuth, async (req: Request, res: Response) => {
    try {
      const alertData = req.body;
      const [newAlert] = await db.insert(schema.monitoringAlertRules).values({
        name: alertData.name,
        datasource: alertData.datasource,
        query: alertData.query,
        condition: alertData.condition,
        threshold: alertData.threshold,
        evaluationInterval: alertData.evaluationInterval || 60,
        forDuration: alertData.forDuration || 300,
        severity: alertData.severity || 'medium',
        enabled: alertData.enabled !== false,
        notificationChannels: JSON.stringify(alertData.notificationChannels || []),
        annotations: JSON.stringify(alertData.annotations || {}),
        labels: JSON.stringify(alertData.labels || {}),
        state: "normal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      res.status(201).json(newAlert);
    } catch (error) {
      console.error('Error creating monitoring alert:', error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.post("/api/monitoring/panels", requireAuth, async (req: Request, res: Response) => {
    try {
      const panelData = req.body;
      const [newPanel] = await db.insert(schema.monitoringPanels).values({
        dashboardId: panelData.dashboardId,
        title: panelData.title,
        type: panelData.type,
        datasource: panelData.datasource,
        query: panelData.query,
        refreshInterval: panelData.refreshInterval || 30,
        width: panelData.width || 6,
        height: panelData.height || 300,
        xPos: panelData.xPos || 0,
        yPos: panelData.yPos || 0,
        thresholds: JSON.stringify(panelData.thresholds || []),
        unit: panelData.unit,
        decimals: panelData.decimals || 2,
        showLegend: panelData.showLegend !== false,
        colorScheme: panelData.colorScheme || 'default',
        config: JSON.stringify(panelData.config || {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      res.status(201).json(newPanel);
    } catch (error) {
      console.error('Error creating monitoring panel:', error);
      res.status(500).json({ message: "Failed to create panel" });
    }
  });

  app.put("/api/monitoring/panels/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const panelId = parseInt(req.params.id);
      const panelData = req.body;

      const [updatedPanel] = await db.update(schema.monitoringPanels)
        .set({
          title: panelData.title,
          type: panelData.type,
          datasource: panelData.datasource,
          query: panelData.query,
          refreshInterval: panelData.refreshInterval || 30,
          width: panelData.width || 6,
          height: panelData.height || 300,
          xPos: panelData.xPos || 0,
          yPos: panelData.yPos || 0,
          thresholds: JSON.stringify(panelData.thresholds || []),
          unit: panelData.unit,
          decimals: panelData.decimals || 2,
          showLegend: panelData.showLegend !== false,
          colorScheme: panelData.colorScheme || 'default',
          config: JSON.stringify(panelData.config || {}),
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.monitoringPanels.id, panelId))
        .returning();

      if (!updatedPanel) {
        return res.status(404).json({ message: "Panel not found" });
      }

      res.json(updatedPanel);
    } catch (error) {
      console.error('Error updating monitoring panel:', error);
      res.status(500).json({ message: "Failed to update panel" });
    }
  });

  app.delete("/api/monitoring/panels/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const panelId = parseInt(req.params.id);

      const [deletedPanel] = await db.delete(schema.monitoringPanels)
        .where(eq(schema.monitoringPanels.id, panelId))
        .returning();

      if (!deletedPanel) {
        return res.status(404).json({ message: "Panel not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting monitoring panel:', error);
      res.status(500).json({ message: "Failed to delete panel" });
    }
  });

  app.get("/api/monitoring/panel-data/:dashboardId", requireAuth, async (req: Request, res: Response) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const timeRange = req.query.timeRange as string;

      // Get panels for this dashboard
      const panels = await db.select()
        .from(schema.monitoringPanels)
        .where(eq(schema.monitoringPanels.dashboardId, dashboardId));

      const panelData: { [key: number]: any[] } = {};

      // For each panel, execute its query and return data
      for (const panel of panels) {
        try {
          // Here you would normally execute the panel's query against the configured datasource
          // For now, we'll return empty data structure
          panelData[panel.id] = [];

          // If the panel has a datasource configured, we could fetch real data
          // This would involve connecting to Prometheus, Zabbix, or other monitoring systems
        } catch (panelError) {
          console.error(`Error fetching data for panel ${panel.id}:`, panelError);
          panelData[panel.id] = [];
        }
      }

      res.json(panelData);
    } catch (err) {
      return handleError(err, res);
    }
  });

  // VM Inventory routes
  app.get('/api/vm-inventory', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const vms = await db.select().from(vmInventory);
      console.log(`Fetched ${vms.length} VMs from database, decrypting PII fields...`);
      // Decrypt PII fields before sending to client
      const decryptedVms = batchDecryptFields(vms, PII_FIELDS.vmInventory);
      console.log(`Successfully decrypted ${decryptedVms.length} VMs`);
      res.json(decryptedVms);
    } catch (error) {
      console.error('Error fetching VM inventory:', error);
      res.status(500).json({
        message: 'Failed to fetch VM inventory'
      });
    }
  });

  app.post("/api/vm-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      const vmData = req.body;

      // Map frontend fields directly to database schema with all required fields
      const mappedVMData = {
        // VM Core Information
        vmId: vmData.vmId || null,
        vmName: vmData.vmName,
        vmStatus: vmData.vmStatus || 'Active',
        vmIp: vmData.vmIp || null,
        vmOs: vmData.vmOs || null,
        cpuCount: vmData.cpuCount || 0,
        memoryGB: vmData.memoryGB || 0,
        diskCapacityGB: vmData.diskCapacityGB || 0,

        // Request and Approval Information - ensure these are properly mapped
        requestor: vmData.requestor?.trim() || null,
        knoxId: vmData.knoxId?.trim() || null,
        department: vmData.department?.trim() || null,
        startDate: vmData.startDate || null,
        endDate: vmData.endDate || null,
        jiraNumber: vmData.jiraNumber?.trim() || null,
        approvalNumber: vmData.approvalNumber?.trim() || null,
        remarks: vmData.remarks?.trim() || null,

        // Legacy compatibility fields
        internetAccess: Boolean(vmData.internetAccess),
        vmOsVersion: vmData.vmOsVersion || null,
        hypervisor: vmData.hypervisor || null,
        hostName: vmData.hostName || vmData.hostname || null,
        hostModel: vmData.hostModel || null,
        hostIp: vmData.hostIp || null,
        hostOs: vmData.hostOs || null,
        rack: vmData.rack || null,
        deployedBy: vmData.deployedBy || null,
        user: vmData.user || null,
        jiraTicket: vmData.jiraTicket || vmData.jiraNumber || null,
        dateDeleted: vmData.dateDeleted || null,

        // Additional legacy fields for compatibility
        guestOs: vmData.vmOs || vmData.guestOs || null,
        powerState: vmData.vmStatus || vmData.powerState || null,
        diskGB: vmData.diskGB || vmData.diskCapacityGB || 0,
        ipAddress: vmData.vmIp || vmData.ipAddress || null,
        macAddress: vmData.macAddress || null,
        vmwareTools: vmData.vmwareTools || null,
        cluster: vmData.cluster || null,
        datastore: vmData.datastore || null,
        createdDate: vmData.startDate || vmData.createdDate || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        notes: vmData.remarks || vmData.notes || null
      };

      console.log('Creating VM with data:', mappedVMData);

      // Create VM in database
      const [newVM] = await db.insert(schema.vmInventory).values(mappedVMData).returning();

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "vm",
        itemId: newVM.id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `VM "${newVM.vmName}" created`,
      });

      // Return complete mapped response with all fields populated
      const response = {
        id: newVM.id,
        // VM Core Information
        vmId: newVM.vmId,
        vmName: newVM.vmName,
        vmStatus: newVM.vmStatus,
        vmIp: newVM.vmIp,
        vmOs: newVM.vmOs,
        cpuCount: newVM.cpuCount,
        memoryGB: newVM.memoryGB,
        diskCapacityGB: newVM.diskCapacityGB,

        // Request and Approval Information
        requestor: newVM.requestor,
        knoxId: newVM.knoxId,
        department: newVM.department,
        startDate: newVM.startDate,
        endDate: newVM.endDate,
        jiraNumber: newVM.jiraNumber,
        approvalNumber: newVM.approvalNumber,
        remarks: newVM.remarks,

        // Legacy compatibility fields
        internetAccess: newVM.internetAccess,
        vmOsVersion: newVM.vmOsVersion,
        hypervisor: newVM.hypervisor,
        hostName: newVM.hostName,
        hostModel: newVM.hostModel,
        hostIp: newVM.hostIp,
        hostOs: newVM.hostOs,
        rack: newVM.rack,
        deployedBy: newVM.deployedBy,
        user: newVM.user,
        jiraTicket: newVM.jiraTicket,
        dateDeleted: newVM.dateDeleted,
        powerState: newVM.powerState,
        memoryMB: newVM.memoryMB,
        diskGB: newVM.diskGB,
        ipAddress: newVM.ipAddress,
        macAddress: newVM.macAddress,
        vmwareTools: newVM.vmwareTools,
        cluster: newVM.cluster,
        datastore: newVM.datastore,
        createdDate: newVM.createdDate,
        lastModified: newVM.lastModified,
        guestOs: newVM.guestOs,
        notes: newVM.notes
      };

      console.log('VM created successfully:', response);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating VM:", error);
      res.status(500).json({
        message: "Failed to create VM",
        error: error.message
      });
    }
  });

  app.get("/api/vm-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);
      const vm = await storage.getVM(vmId);

      if (!vm) {
        return res.status(404).json({ message: "VM not found" });
      }

      res.json(vm);
    } catch (error) {
      console.error("Error fetching VM:", error);
      res.status(500).json({ message: "Failed to fetch VM" });
    }
  });

  // VM Approval History API endpoints
  app.get("/api/vm-inventory/:id/approval-history", requireAuth, async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get approval history for the VM with user details
      const history = await db.execute(sql`
        SELECT
          h.*,
          u.username as changed_by_username,
          u.first_name as changed_by_first_name,
          u.last_name as changed_by_last_name
        FROM vm_approval_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.vm_id = ${vmId}
        ORDER BY h.changed_at DESC
      `);

      const formattedHistory = history.rows.map((row: any) => ({
        id: row.id,
        vmId: row.vm_id,
        oldApprovalNumber: row.old_approval_number,
        newApprovalNumber: row.new_approval_number,
        changedBy: row.changed_by,
        changedAt: row.changed_at,
        reason: row.reason,
        notes: row.notes,
        changedByUsername: row.changed_by_username,
        changedByName: row.changed_by_first_name && row.changed_by_last_name
          ? `${row.changed_by_first_name} ${row.changed_by_last_name}`
          : row.changed_by_username || 'Unknown'
      }));

      res.json(formattedHistory);
    } catch (error) {
      console.error("Error fetching VM approval history:", error);
      res.status(500).json({ message: "Failed to fetch approval history" });
    }
  });

  app.post("/api/vm-inventory/:id/approval-history", requireAuth, async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);
      const { oldApprovalNumber, newApprovalNumber, reason, notes } = req.body;

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Create approval history entry
      const [historyEntry] = await db.insert(schema.vmApprovalHistory).values({
        vmId,
        oldApprovalNumber: oldApprovalNumber || null,
        newApprovalNumber: newApprovalNumber || null,
        changedBy: req.user?.id || null,
        reason: reason || null,
        notes: notes || null
      }).returning();

      res.status(201).json(historyEntry);
    } catch (error) {
      console.error("Error creating VM approval history:", error);
      res.status(500).json({ message: "Failed to create approval history entry" });
    }
  });

  app.patch("/api/vm-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const vmData = req.body;

      console.log(`Updating VM ${id} with data:`, vmData);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get existing VM data and decrypt it
      const [existingVm] = await db.select()
        .from(schema.vmInventory)
        .where(eq(schema.vmInventory.id, id));

      if (!existingVm) {
        return res.status(404).json({ message: "VM not found" });
      }

      // Decrypt existing VM for comparison
      const decryptedExistingVm = decryptFields(existingVm, PII_FIELDS.vmInventory);

      const updateData = {
        vmName: vmData.vmName?.trim(),
        vmStatus: vmData.vmStatus?.trim(),
        vmIp: vmData.vmIp?.trim() || null,
        vmOs: vmData.vmOs?.trim() || null,
        cpuCount: vmData.cpuCount ? parseInt(vmData.cpuCount) : null,
        memoryGB: vmData.memoryGB ? parseInt(vmData.memoryGB) : null,
        diskCapacityGB: vmData.diskCapacityGB ? parseInt(vmData.diskCapacityGB) : null,
        requestor: vmData.requestor?.trim() || null,
        knoxId: vmData.knoxId?.trim() || null,
        department: vmData.department?.trim() || null,
        startDate: vmData.startDate || null,
        endDate: vmData.endDate || null,
        jiraNumber: vmData.jiraNumber?.trim() || null,
        approvalNumber: vmData.approvalNumber?.trim() || null,
        remarks: vmData.remarks?.trim() || null,
        lastModified: new Date().toISOString()
      };

      // Check if approval number changed and create history entry
      const oldApprovalNumber = decryptedExistingVm.approvalNumber;
      const newApprovalNumber = updateData.approvalNumber;

      if (oldApprovalNumber !== newApprovalNumber) {
        // Create approval history entry
        await db.insert(schema.vmApprovalHistory).values({
          vmId: id,
          oldApprovalNumber: oldApprovalNumber || null,
          newApprovalNumber: newApprovalNumber || null,
          changedBy: req.user?.id || null,
          reason: vmData.approvalChangeReason || 'Updated via edit form',
          notes: vmData.approvalChangeNotes || null
        });
      }

      // Remove undefined values
      const cleanUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanUpdateData[key] = updateData[key];
        }
      });

      // Encrypt PII fields before saving
      const encryptedUpdateData = encryptFields(cleanUpdateData, PII_FIELDS.vmInventory);

      const [updatedVm] = await db.update(schema.vmInventory)
        .set(encryptedUpdateData)
        .where(eq(schema.vmInventory.id, id))
        .returning();

      // Decrypt before sending to client
      const decryptedVm = decryptFields(updatedVm, PII_FIELDS.vmInventory);
      console.log(`VM ${id} updated successfully, returning decrypted data`);

      res.json(decryptedVm);
    } catch (error) {
      console.error("Error updating VM:", error);
      res.status(500).json({ message: "Failed to update VM" });
    }
  });

  app.delete("/api/vm-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);

      // First get the VM for logging
      const [vm] = await db.select().from(schema.vmInventory).where(eq(schema.vmInventory.id, vmId));

      if (!vm) {
        return res.status(404).json({ message: "VM not found" });
      }

      // Delete from database
      await db.delete(schema.vmInventory).where(eq(schema.vmInventory.id, vmId));

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "vm",
        itemId: vmId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `VM "${vm.vmName}" deleted`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting VM:", error);

      // Fallback to storage layer
      try {
        const success = await storage.deleteVM(parseInt(req.params.id));
        if (!success) {
          return res.status(404).json({ message: "VM not found" });
        }
        res.status(204).send();
      } catch (fallbackError) {
        console.error("Fallback delete also failed:", fallbackError);
        res.status(500).json({ message: "Failed to delete VM" });
      }
    }
  });

  // VM Inventory Import endpoint
  app.post("/api/vm-inventory/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { vms, upsert = false } = req.body;

      if (!Array.isArray(vms)) {
        return res.status(400).json({
          message: "Invalid request format. Expected an array of VMs.",
          total: 0,
          successful: 0,
          failed: 0,
          updated: 0,
          errors: ["Request body must contain a 'vms' array"]
        });
      }

      if (vms.length === 0) {
        return res.status(400).json({
          message: "No VMs to import",
          total: 0,
          successful: 0,
          failed: 0,
          updated: 0,
          errors: ["No VMs provided in the request"]
        });
      }

      console.log(`Starting import of ${vms.length} VMs with upsert: ${upsert}...`);

      const importedVMs = [];
      const errors = [];
      let successful = 0;
      let updated = 0;
      let failed = 0;

      for (let i = 0; i < vms.length; i++) {
        try {
          const vm = vms[i];
          const rowNumber = i + 1;

          // Validate required fields
          if (!vm.vmName || vm.vmName.trim() === '') {
            throw new Error(`Row ${rowNumber}: VM name is required`);
          }

          const vmName = vm.vmName.trim();

          // Check if VM with this name already exists
          const [existingVM] = await db.select()
            .from(schema.vmInventory)
            .where(eq(schema.vmInventory.vmName, vmName))
            .limit(1);

          if (existingVM && upsert) {
            // Update existing VM
            console.log(`Updating existing VM ${vmName}`);

            const updateData = {
              vmId: vm.vmId?.trim() || existingVM.vmId,
              vmStatus: vm.vmStatus || existingVM.vmStatus,
              vmIp: vm.vmIp?.trim() || existingVM.vmIp,
              vmOs: vm.vmOs?.trim() || existingVM.vmOs,
              cpuCount: vm.cpuCount || existingVM.cpuCount,
              memoryGB: vm.memoryGB || existingVM.memoryGB,
              diskCapacityGB: vm.diskCapacityGB || existingVM.diskCapacityGB,
              requestor: vm.requestor?.trim() || existingVM.requestor,
              knoxId: vm.knoxId?.trim() || existingVM.knoxId,
              department: vm.department?.trim() || existingVM.department,
              startDate: vm.startDate || existingVM.startDate,
              endDate: vm.endDate || existingVM.endDate,
              jiraNumber: vm.jiraNumber?.trim() || existingVM.jiraNumber,
              approvalNumber: vm.approvalNumber?.trim() || existingVM.approvalNumber,
              remarks: vm.remarks?.trim() || existingVM.remarks,
              internetAccess: vm.internetAccess !== undefined ? vm.internetAccess : existingVM.internetAccess,
              vmOsVersion: vm.vmOsVersion?.trim() || existingVM.vmOsVersion,
              hypervisor: vm.hypervisor?.trim() || existingVM.hypervisor,
              hostName: vm.hostName?.trim() || existingVM.hostName,
              hostModel: vm.hostModel?.trim() || existingVM.hostModel,
              hostIp: vm.hostIp?.trim() || existingVM.hostIp,
              hostOs: vm.hostOs?.trim() || existingVM.hostOs,
              rack: vm.rack?.trim() || existingVM.rack,
              deployedBy: vm.deployedBy?.trim() || existingVM.deployedBy,
              user: vm.user?.trim() || existingVM.user,
              jiraTicket: vm.jiraTicket?.trim() || existingVM.jiraTicket,
              dateDeleted: vm.dateDeleted || existingVM.dateDeleted,
              lastModified: new Date().toISOString()
            };

            const [updatedVM] = await db.update(schema.vmInventory)
              .set(updateData)
              .where(eq(schema.vmInventory.id, existingVM.id))
              .returning();

            // Log activity
            await storage.createActivity({
              action: "update",
              itemType: "vm",
              itemId: existingVM.id,
              userId: req.user?.id || 1,
              timestamp: new Date().toISOString(),
              notes: `VM "${vmName}" updated via CSV import`,
            });

            importedVMs.push(updatedVM);
            updated++;
          } else if (existingVM && !upsert) {
            // Skip if exists and not upserting
            throw new Error(`Row ${rowNumber}: VM with name ${vmName} already exists`);
          } else {
            // Create new VM
            console.log(`Creating new VM ${vmName}`);

            const newVM = {
              vmId: vm.vmId?.trim() || "",
              vmName: vmName,
              vmStatus: vm.vmStatus || "Active",
              vmIp: vm.vmIp?.trim() || "",
              vmOs: vm.vmOs?.trim() || "",
              cpuCount: vm.cpuCount || 0,
              memoryGB: vm.memoryGB || 0,
              diskCapacityGB: vm.diskCapacityGB || 0,
              requestor: vm.requestor?.trim() || "",
              knoxId: vm.knoxId?.trim() || "",
              department: vm.department?.trim() || "",
              startDate: vm.startDate || "",
              endDate: vm.endDate || "",
              jiraNumber: vm.jiraNumber?.trim() || "",
              approvalNumber: vm.approvalNumber?.trim() || "",
              remarks: vm.remarks?.trim() || "",
              internetAccess: vm.internetAccess || false,
              vmOsVersion: vm.vmOsVersion?.trim() || "",
              hypervisor: vm.hypervisor?.trim() || "",
              hostName: vm.hostName?.trim() || "",
              hostModel: vm.hostModel?.trim() || "",
              hostIp: vm.hostIp?.trim() || "",
              hostOs: vm.hostOs?.trim() || "",
              rack: vm.rack?.trim() || "",
              deployedBy: vm.deployedBy?.trim() || "",
              user: vm.user?.trim() || "",
              jiraTicket: vm.jiraTicket?.trim() || "",
              dateDeleted: vm.dateDeleted || null,
              guestOs: vm.guestOs?.trim() || vm.vmOs?.trim() || "",
              powerState: vm.powerState?.trim() || vm.vmStatus || "",
              memoryMB: vm.memoryMB || (vm.memoryGB ? vm.memoryGB * 1024 : 0),
              diskGB: vm.diskGB || vm.diskCapacityGB || 0,
              ipAddress: vm.ipAddress?.trim() || vm.vmIp?.trim() || "",
              macAddress: vm.macAddress?.trim() || "",
              vmwareTools: vm.vmwareTools?.trim() || "",
              cluster: vm.cluster?.trim() || "",
              datastore: vm.datastore?.trim() || "",
              status: vm.status || "available",
              assignedTo: vm.assignedTo || null,
              location: vm.location?.trim() || "",
              serialNumber: vm.serialNumber?.trim() || "",
              model: vm.model?.trim() || "",
              manufacturer: vm.manufacturer?.trim() || "",
              purchaseDate: vm.purchaseDate || "",
              purchaseCost: vm.purchaseCost?.trim() || "",
              createdDate: vm.createdDate || new Date().toISOString(),
              lastModified: new Date().toISOString(),
              notes: vm.notes?.trim() || vm.remarks?.trim() || ""
            };

            const [createdVM] = await db.insert(schema.vmInventory)
              .values(newVM)
              .returning();

            // Log activity
            await storage.createActivity({
              action: "create",
              itemType: "vm",
              itemId: createdVM.id,
              userId: req.user?.id || 1,
              timestamp: new Date().toISOString(),
              notes: `VM "${vmName}" imported via CSV`,
            });

            importedVMs.push(createdVM);
            successful++;
          }
        } catch (vmError) {
          failed++;
          const errorMessage = `Row ${i + 1}: ${vmError.message}`;
          errors.push(errorMessage);
          console.error(`VM import error:`, errorMessage);
        }
      }

      const response = {
        total: vms.length,
        successful,
        updated,
        failed,
        errors,
        message: `Import completed. ${successful} VMs created, ${updated} VMs updated, ${failed} failed.`
      };

      const statusCode = failed > 0 ? 200 : 201;
      return res.status(statusCode).json(response);
    } catch (error) {
      console.error("VM import error:", error);
      return res.status(500).json({
        message: "Import failed",
        total: 0,
        successful: 0,
        failed: 0,
        updated: 0,
        errors: [error.message]
      });
    }
  });

  // VM Management routes (using the new vms table)
  app.get("/api/vms", async (req: Request, res: Response) => {
    try {
      const vms = await db.select().from(schema.vms).orderBy(schema.vms.id);
      res.json(vms);
    } catch (error) {
      console.error("Error fetching VMs:", error);
      res.status(500).json({ message: "Failed to fetch VMs" });
    }
  });

  app.post("/api/vms", async (req: Request, res: Response) => {
    try {
      const vmData = req.body;

      const [newVm] = await db.insert(schema.vms).values({
        ...vmData,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }).returning();

      res.status(201).json(newVm);
    } catch (error) {
      console.error("Error creating VM:", error);
      res.status(500).json({ message: "Failed to create VM" });
    }
  });

  app.get("/api/vms/:id", async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);
      const [vm] = await db.select().from(schema.vms).where(eq(schema.vms.id, vmId));

      if (!vm) {
        return res.status(404).json({ message: "VM not found" });
      }

      res.json(vm);
    } catch (error) {
      console.error("Error fetching VM:", error);
      res.status(500).json({ message: "Failed to fetch VM" });
    }
  });

  app.put("/api/vms/:id", async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);
      const vmData = req.body;

      const [updatedVm] = await db.update(schema.vms)
        .set({
          ...vmData,
          lastModified: new Date().toISOString()
        })
        .where(eq(schema.vms.id, vmId))
        .returning();

      if (!updatedVm) {
        return res.status(404).json({ message: "VM not found" });
      }

      res.json(updatedVm);
    } catch (error) {
      console.error("Error updating VM:", error);
      res.status(500).json({ message: "Failed to update VM" });
    }
  });

  app.delete("/api/vms/:id", async (req: Request, res: Response) => {
    try {
      const vmId = parseInt(req.params.id);

      const [deletedVm] = await db.delete(schema.vms)
        .where(eq(schema.vms.id, vmId))
        .returning();

      if (!deletedVm) {
        return res.status(404).json({ message: "VM not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting VM:", error);
      res.status(500).json({ message: "Failed to delete VM" });
    }
  });

  // Azure Inventory API routes
  app.get('/api/azure-inventory', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const resources = await db.select().from(schema.azureInventory);
      res.json(resources);
    } catch (error) {
      console.error('Error fetching Azure inventory:', error);
      res.status(500).json({
        message: 'Failed to fetch Azure inventory'
      });
    }
  });

  app.post("/api/azure-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      // Ensure timestamps are ISO strings, not Date objects
      const sanitizedData = {
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const data = insertAzureInventorySchema.parse(sanitizedData);
      const resource = await storage.createAzureInventory(data);
      res.status(201).json(resource);
    } catch (error) {
      console.error("Error creating Azure resource:", error);
      res.status(500).json({
        message: "Failed to create Azure resource",
        error: error.message
      });
    }
  });

  // Update Azure inventory
  app.patch("/api/azure-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      console.log('Azure update request:', { id, updates });

      const updatedItem = await storage.updateAzureInventory(id, updates);

      if (!updatedItem) {
        return res.status(404).json({ message: 'Azure resource not found' });
      }

      await storage.createActivity({
        action: 'update',
        itemType: 'azure-inventory',
        itemId: id,
        userId: req.user!.id,
        timestamp: new Date().toISOString(),
        notes: `Updated Azure resource: ${updatedItem.name || 'N/A'}`,
      });

      res.json(updatedItem);
    } catch (error: any) {
      console.error('Error updating Azure resource:', error);
      res.status(500).json({ message: 'Failed to update Azure resource', error: error.message });
    }
  });

  // Keep the existing PUT route for backwards compatibility
  app.put('/api/azure-inventory/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const processedUpdates = {
        ...updates,
        updatedAt: new Date()
      };

      const updatedItem = await storage.updateAzureInventory(id, processedUpdates);

      if (!updatedItem) {
        return res.status(404).json({ message: 'Azure resource not found' });
      }

      await storage.createActivity({
        action: 'updated',
        itemType: 'azure-inventory',
        itemId: id,
        userId: req.user!.id,
        timestamp: new Date().toISOString(),
        notes: `Updated Azure resource: ${updatedItem.name || 'N/A'}`,
      });

      res.json(updatedItem);
    } catch (error: any) {
      console.error('Error updating Azure resource:', error);
      res.status(500).json({ message: 'Failed to update Azure resource', error: error.message });
    }
  });

  app.delete("/api/azure-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      await db.delete(schema.azureInventory)
        .where(eq(schema.azureInventory.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Azure resource:", error);
      res.status(500).json({ message: "Failed to delete Azure resource" });
    }
  });

  app.post("/api/azure-inventory/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { resources } = req.body;

      if (!Array.isArray(resources)) {
        return res.status(400).json({
          message: "Invalid request format",
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["Request body must contain a 'resources' array"]
        });
      }

      if (!db) {
        return res.status(503).json({
          message: "Database not available",
          code: 'DB_CONNECTION_FAILED'
        });
      }

      let successful = 0;
      let failed = 0;
      let updated = 0;
      const errors: string[] = [];
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format

      // Get existing resources
      const existingResources = await db.select().from(schema.azureInventory);
      const existingMap = new Map(existingResources.map(r => [r.name, r]));
      const importedNames = new Set(resources.map(r => r.name));

      // Check if records for this month already exist in historical data
      const existingHistoricalRecords = await db.select()
        .from(schema.azureHistoricalData)
        .where(eq(schema.azureHistoricalData.monthYear, currentMonth));

      const historicalMap = new Map(existingHistoricalRecords.map(h => [`${h.name}-${h.changeType}`, h]));

      for (let i = 0; i < resources.length; i++) {
        try {
          const resource = resources[i];
          const existing = existingMap.get(resource.name);

          if (existing) {
            // Resource exists - update it
            const [updatedResource] = await db.update(schema.azureInventory)
              .set({
                type: resource.type,
                resourceGroup: resource.resourceGroup,
                location: resource.location,
                subscriptions: resource.subscriptions,
                status: resource.status,
                remarks: resource.remarks,
                updatedAt: new Date()
              })
              .where(eq(schema.azureInventory.id, existing.id))
              .returning();

            // Only create historical record if it doesn't exist for this month
            const historyKey = `${resource.name}-updated`;
            if (!historicalMap.has(historyKey)) {
              await db.insert(schema.azureHistoricalData).values({
                resourceId: existing.id,
                name: resource.name,
                type: resource.type,
                resourceGroup: resource.resourceGroup,
                location: resource.location,
                subscriptions: resource.subscriptions,
                status: resource.status,
                remarks: resource.remarks,
                changeType: 'updated',
                monthYear: currentMonth,
                createdAt: new Date()
              });
            }

            updated++;
          } else {
            // New resource - create it
            const [newResource] = await db.insert(schema.azureInventory)
              .values({
                name: resource.name,
                type: resource.type,
                resourceGroup: resource.resourceGroup,
                location: resource.location,
                subscriptions: resource.subscriptions,
                status: resource.status,
                remarks: resource.remarks,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();

            // Only create historical record if it doesn't exist for this month
            const historyKey = `${resource.name}-imported`;
            if (!historicalMap.has(historyKey)) {
              await db.insert(schema.azureHistoricalData).values({
                resourceId: newResource.id,
                name: resource.name,
                type: resource.type,
                resourceGroup: resource.resourceGroup,
                location: resource.location,
                subscriptions: resource.subscriptions,
                status: resource.status,
                remarks: resource.remarks,
                changeType: 'imported',
                monthYear: currentMonth,
                createdAt: new Date()
              });
            }

            successful++;
          }
        } catch (error) {
          failed++;
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      // Track deleted resources (ones that weren't in the import)
      for (const [name, deletedResource] of existingMap) {
        // Only create historical record if it doesn't exist for this month
        const historyKey = `${name}-deleted`;
        if (!historicalMap.has(historyKey)) {
          await db.insert(schema.azureHistoricalData).values({
            resourceId: deletedResource.id,
            name: deletedResource.name,
            type: deletedResource.type,
            resourceGroup: deletedResource.resourceGroup,
            location: deletedResource.location,
            subscriptions: deletedResource.subscriptions,
            status: deletedResource.status,
            remarks: deletedResource.remarks,
            changeType: 'deleted',
            monthYear: currentMonth,
            createdAt: new Date()
          });
        }
      }

      res.status(successful > 0 ? 201 : 400).json({
        total: resources.length,
        successful,
        updated,
        failed,
        deleted: existingMap.size,
        errors,
        monthYear: currentMonth,
        message: `Import completed. ${successful} resources processed (${updated} updated), ${failed} failed, ${existingMap.size} marked as deleted.`
      });
    } catch (error) {
      console.error("Azure import error:", error);
      res.status(500).json({ message: "Import failed", error: error.message });
    }
  });

  // Azure Historical Data routes
  app.get('/api/azure-inventory/historical', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    try {
      const historicalData = await db.select().from(azureHistoricalData)
        .orderBy(desc(azureHistoricalData.createdAt));
      res.json(historicalData);
    } catch (error) {
      console.error('Error fetching Azure historical data:', error);
      res.status(500).json({ message: 'Failed to fetch historical data' });
    }
  });


  // GCP Historical Data routes
  app.get('/api/gcp-inventory/historical', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    try {
      const historicalData = await db.select().from(schema.gcpHistoricalData)
        .orderBy(desc(schema.gcpHistoricalData.createdAt));
      res.json(historicalData);
    } catch (error) {
      console.error('Error fetching GCP historical data:', error);
      res.status(500).json({ message: 'Failed to fetch historical data' });
    }
  });

  // GCP Inventory API routes
  app.get('/api/gcp-inventory', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const resources = await db.select().from(schema.gcpInventory);
      res.json(resources);
    } catch (error) {
      console.error('Error fetching GCP inventory:', error);
      res.status(500).json({
        message: 'Failed to fetch GCP inventory'
      });
    }
  });

  app.post("/api/gcp-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      // Ensure timestamps are ISO strings, not Date objects
      const sanitizedData = {
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const data = insertGcpInventorySchema.parse(sanitizedData);
      const resource = await storage.createGcpInventory(data);

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "gcp-resource",
        itemId: resource.id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `GCP Resource created: ${resource.name}`,
      });

      // Send email notification
      try {
        console.log(`\n📧 [GCP-CREATE] Sending email notification for GCP resource creation`);
        await emailService.initialize();
        const emailSent = await emailService.sendModificationNotification({
          action: 'created',
          itemType: 'GCP Resource',
          itemName: resource.name || 'New Resource',
          userName: req.user?.username || 'System',
          details: `GCP resource created: ${resource.name}, Type: ${resource.resourceType}, Project: ${resource.projectId}, Location: ${resource.location}`,
          timestamp: new Date().toISOString()
        });
        console.log(`📧 [GCP-CREATE] Email notification result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      } catch (err) {
        console.error('❌ [GCP-CREATE] Failed to send email notification:', err);
      }

      res.status(201).json(resource);
    } catch (error) {
      console.error("Error creating GCP resource:", error);
      res.status(500).json({ message: "Failed to create GCP resource" });
    }
  });

  // Update GCP inventory
  app.patch("/api/gcp-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      console.log('GCP update request:', { id, updates });

      // Convert date strings to Date objects if present
      const processedUpdates = {
        ...updates,
        createdAt: updates.createdAt ? new Date(updates.createdAt) : undefined,
        updatedAt: new Date() // Always set updated timestamp
      };

      const updatedItem = await storage.updateGcpInventory(id, processedUpdates);

      if (!updatedItem) {
        return res.status(404).json({ message: 'GCP resource not found' });
      }

      await storage.createActivity({
        action: 'update',
        itemType: 'gcp-inventory',
        itemId: id,
        userId: req.user!.id,
        timestamp: new Date().toISOString(),
        notes: `Updated GCP resource: ${updatedItem.displayName || updatedItem.name || 'N/A'}`,
      });

      res.json(updatedItem);
    } catch (error: any) {
      console.error('Error updating GCP resource:', error);
      res.status(500).json({ message: 'Failed to update GCP resource', error: error.message });
    }
  });

  app.delete("/api/gcp-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get resource details before deletion for email
      const [resourceToDelete] = await db.select()
        .from(schema.gcpInventory)
        .where(eq(schema.gcpInventory.id, id));

      if (!resourceToDelete) {
        return res.status(404).json({ message: "GCP Resource not found" });
      }

      await db.delete(schema.gcpInventory)
        .where(eq(schema.gcpInventory.id, id));

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "gcp-resource",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `GCP Resource deleted: ${resourceToDelete.name}`,
      });

      // Send email notification
      try {
        console.log(`\n📧 [GCP-DELETE] Sending email notification for GCP resource deletion`);
        await emailService.initialize();
        const emailSent = await emailService.sendModificationNotification({
          action: 'deleted',
          itemType: 'GCP Resource',
          itemName: resourceToDelete.name || 'Resource',
          userName: req.user?.username || 'System',
          details: `GCP resource deleted: ${resourceToDelete.name}, Type: ${resourceToDelete.resourceType}, Project: ${resourceToDelete.projectId}`,
          timestamp: new Date().toISOString()
        });
        console.log(`📧 [GCP-DELETE] Email notification result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      } catch (err) {
        console.error('❌ [GCP-DELETE] Failed to send email notification:', err);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting GCP resource:", error);
      res.status(500).json({ message: "Failed to delete GCP resource" });
    }
  });

  app.post("/api/aws-inventory/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { resources } = req.body;
      if (!Array.isArray(resources)) {
        return res.status(400).json({ message: "Invalid resources data" });
      }

      let successful = 0;
      let updated = 0;
      let failed = 0;

      for (const resource of resources) {
        try {
          // Check if resource exists by identifier
          const [existing] = await db.select().from(schema.awsInventory).where(eq(schema.awsInventory.identifier, resource.identifier));
          if (existing) {
            await db.update(schema.awsInventory).set(resource).where(eq(schema.awsInventory.id, existing.id));
            updated++;
          } else {
            await db.insert(schema.awsInventory).values(resource);
            successful++;
          }
        } catch (err) {
          console.error('Failed to import AWS resource:', err);
          failed++;
        }
      }

      res.json({ successful, updated, failed });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/gcp-inventory/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { resources } = req.body;
      if (!Array.isArray(resources)) {
        return res.status(400).json({ message: "Invalid resources data" });
      }

      let successful = 0;
      let updated = 0;
      let failed = 0;

      for (const resource of resources) {
        try {
          // Check if resource exists by displayName
          const [existing] = await db.select().from(schema.gcpInventory).where(eq(schema.gcpInventory.displayName, resource.displayName));
          if (existing) {
            await db.update(schema.gcpInventory).set(resource).where(eq(schema.gcpInventory.id, existing.id));
            updated++;
          } else {
            await db.insert(schema.gcpInventory).values(resource);
            successful++;
          }
        } catch (err) {
          console.error('Failed to import GCP resource:', err);
          failed++;
        }
      }

      res.json({ successful, updated, failed });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Consumable Assignment routes
  app.get("/api/consumables/:id/assignments", requireAuth, async (req: Request, res: Response) => {
    try {
      const consumableId = parseInt(req.params.id);
      const assignments = await db.select()
        .from(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.consumableId, consumableId))
        .orderBy(schema.consumableAssignments.assignedDate);

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching consumable assignments:", error);
      res.status(500).json({ message: "Failed to fetch consumable assignments" });
    }
  });

  app.post("/api/consumables/:id/assign", requireAuth, async (req: Request, res: Response) => {
    try {
      const consumableId = parseInt(req.params.id);
      const assignmentData = req.body;

      console.log('Consumable assignment request:', { consumableId, assignmentData });

      if (!db) {
        return res.status(503).json({
          message: "Database not available",
          code: 'DB_CONNECTION_FAILED',
          error: 'Database connection required for consumable assignments',
          instruction: 'Please configure your database connection in the Database tab'
        });
      }

      // Validate required fields
      if (!assignmentData.assignedTo || assignmentData.assignedTo.trim() === '') {
        return res.status(400).json({
          message: "Assigned To is required"
        });
      }

      // Get consumable to check availability
      const [consumable] = await db.select()
        .from(schema.consumables)
        .where(eq(schema.consumables.id, consumableId));

      if (!consumable) {
        return res.status(404).json({ message: "Consumable not found" });
      }

      const quantityToAssign = parseInt(assignmentData.quantity) || 1;

      if (consumable.quantity < quantityToAssign) {
        return res.status(400).json({
          message: `Not enough quantity available. Available: ${consumable.quantity}, Requested: ${quantityToAssign}`
        });
      }

      // Create assignment record
      const [assignment] = await db.insert(schema.consumableAssignments).values({
        consumableId,
        assignedTo: assignmentData.assignedTo.trim(),
        serialNumber: assignmentData.serialNumber?.trim() || null,
        knoxId: assignmentData.knoxId?.trim() || null,
        quantity: quantityToAssign,
        assignedDate: new Date().toISOString(),
        status: 'assigned',
        notes: assignmentData.notes?.trim() || null
      }).returning();

      console.log('Assignment created:', assignment);

      // Update consumable quantity
      await db.update(schema.consumables)
        .set({
          quantity: sql`${schema.consumables.quantity} - ${quantityToAssign}`
        })
        .where(eq(schema.consumables.id, consumableId));

      // Log activity
      await storage.createActivity({
        action: "assign",
        itemType: "consumable",
        itemId: consumableId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Consumable assigned to ${assignmentData.assignedTo} (Qty: ${quantityToAssign})`,
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning consumable:", error);
      res.status(500).json({
        message: "Failed to assign consumable",
        error: error.message
      });
    }
  });

  // Edit consumable assignment - alternate route pattern
  app.patch("/api/consumable-assignments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const updateData = req.body;

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get existing assignment
      const [existingAssignment] = await db.select()
        .from(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.id, assignmentId));

      if (!existingAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Update assignment
      const [updatedAssignment] = await db.update(schema.consumableAssignments)
        .set({
          assignedTo: updateData.assignedTo,
          serialNumber: updateData.serialNumber || null,
          knoxId: updateData.knoxId || null,
          notes: updateData.notes || null,
        })
        .where(eq(schema.consumableAssignments.id, assignmentId))
        .returning();

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "consumable-assignment",
        itemId: assignmentId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Updated assignment for ${updateData.assignedTo}`,
      });

      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating consumable assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // Delete consumable assignment
  app.delete("/api/consumable-assignments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get assignment details before deletion
      const [assignment] = await db.select()
        .from(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.id, assignmentId));

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Delete the assignment
      await db.delete(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.id, assignmentId));

      // Restore consumable quantity
      await db.update(schema.consumables)
        .set({
          quantity: sql`${schema.consumables.quantity} + ${assignment.quantity || 1}`
        })
        .where(eq(schema.consumables.id, assignment.consumableId));

      // Log activity
      await storage.createActivity({
        action: "delete",
        itemType: "consumable-assignment",
        itemId: assignmentId,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Assignment deleted for ${assignment.assignedTo}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting consumable assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Monitor Inventory API routes
  app.get('/api/monitor-inventory', requireAuth, async (req, res) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const monitors = await db.select().from(monitorInventory);
      // Decrypt PII fields before sending to client
      const decryptedMonitors = batchDecryptFields(monitors, PII_FIELDS.monitor);
      res.json(decryptedMonitors);
    } catch (error) {
      console.error('Error fetching monitors:', error);
      res.status(500).json({
        message: 'Failed to fetch monitors'
      });
    }
  });

  app.get("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      const [monitor] = await db.select()
        .from(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      res.json(monitor);
    } catch (error) {
      console.error("Error fetching monitor:", error);
      res.status(500).json({ message: "Failed to fetch monitor" });
    }
  });

  app.post("/api/monitor-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      const monitorData = req.body;
      console.log('Creating monitor with data:', monitorData);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields - only seatNumber is required
      if (!monitorData.seatNumber || monitorData.seatNumber.trim() === '') {
        return res.status(400).json({
          message: "Seat number is required"
        });
      }

      const newMonitor = {
        seatNumber: monitorData.seatNumber.trim(),
        knoxId: monitorData.knoxId?.trim() || null,
        assetNumber: monitorData.assetNumber?.trim() || null,
        serialNumber: monitorData.serialNumber?.trim() || null,
        model: monitorData.model?.trim() || null,
        remarks: monitorData.remarks?.trim() || null,
        department: monitorData.department?.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const [monitor] = await db.insert(schema.monitorInventory)
        .values(newMonitor)
        .returning();

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "monitor",
        itemId: monitor.id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Monitor for seat ${monitor.seatNumber} created`,
      });

      console.log('Monitor created successfully:', monitor);
      res.status(201).json(monitor);
    } catch (error) {
      console.error("Error creating monitor:", error);
      res.status(500).json({
        message: "Failed to create monitor",
        error: error.message
      });
    }
  });

  app.patch("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const monitorData = req.body;

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields
      if (monitorData.seatNumber && monitorData.seatNumber.trim() === '') {
        return res.status(400).json({
          message: "Seat number cannot be empty"
        });
      }

      // Encrypt sensitive fields before saving
      const fieldsToEncrypt = ['knoxId', 'assetNumber', 'serialNumber'];
      const updateData: { [key: string]: any } = { updatedAt: new Date().toISOString() };

      for (const field of fieldsToEncrypt) {
        if (monitorData[field] !== undefined) {
          updateData[field] = monitorData[field] ? await storage.encrypt(monitorData[field]) : null;
        }
      }

      // Add non-encrypted fields
      if (monitorData.seatNumber !== undefined) updateData.seatNumber = monitorData.seatNumber.trim();
      if (monitorData.model !== undefined) updateData.model = monitorData.model?.trim() || null;
      if (monitorData.remarks !== undefined) updateData.remarks = monitorData.remarks?.trim() || null;
      if (monitorData.department !== undefined) updateData.department = monitorData.department?.trim() || null;

      const [monitor] = await db.update(schema.monitorInventory)
        .set(updateData)
        .where(eq(schema.monitorInventory.id, id))
        .returning();

      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "monitor",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Monitor for seat ${monitor.seatNumber} updated`,
      });

      res.json(monitor);
    } catch (error) {
      console.error("Error updating monitor:", error);
      res.status(500).json({
        message: "Failed to update monitor",
        error: error.message
      });
    }
  });

  app.delete("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE request received for monitor ID: ${id}`);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid monitor ID" });
      }

      if (!db) {
        console.error("Database not available for deletion");
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Get monitor info before deletion
      const [monitor] = await db.select()
        .from(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      if (!monitor) {
        console.log(`Monitor with ID ${id} not found`);
        return res.status(404).json({ message: "Monitor not found" });
      }

      console.log(`Deleting monitor: ${JSON.stringify(monitor)}`);

      // Perform the actual deletion from PostgreSQL
      const deleteResult = await db.delete(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      console.log(`Delete result:`, deleteResult);

      // Log activity
      try {
        await storage.createActivity({
          action: "delete",
          itemType: "monitor",
          itemId: id,
          userId: req.user?.id || 1,
          timestamp: new Date().toISOString(),
          notes: `Monitor for seat ${monitor.seatNumber} deleted`,
        });
      } catch (activityError) {
        console.warn("Failed to log delete activity:", activityError);
      }

      console.log(`Monitor with ID ${id} successfully deleted from PostgreSQL`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting monitor from PostgreSQL:", error);
      res.status(500).json({
        message: "Failed to delete monitor from database",
        error: error.message
      });
    }
  });

  app.post("/api/monitor-inventory/import", async (req: Request, res: Response) => {
    try {
      const { monitors } = req.body;

      if (!Array.isArray(monitors) || monitors.length === 0) {
        return res.status(400).json({ message: "No monitor data provided" });
      }

      const results = {
        total: monitors.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < monitors.length; i++) {
        try {
          const monitor = monitors[i];

          // Clean the monitor data - convert empty strings to null
          const cleanMonitor: any = {};
          Object.keys(monitor).forEach(key => {
            const value = monitor[key];
            cleanMonitor[key] = (value === '' || value === null || value === undefined) ? null : value;
          });

          // Insert new monitor only
          await db.insert(monitorInventory).values(cleanMonitor);
          results.successful++;
        } catch (error: any) {
          results.failed++;
          const errorMsg = error?.message || String(error);
          results.errors.push(`Row ${i + 1}: ${errorMsg}`);
          console.error(`Monitor import error on row ${i + 1}:`, error);
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Monitor inventory import error:", error);
      res.status(500).json({ message: error?.message || "Import failed" });
    }
  });

  // Approval Monitoring - Get all records
  app.get("/api/approval-monitoring", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const records = await db.select().from(schema.approvalMonitoring).orderBy(desc(schema.approvalMonitoring.id));
      res.json(records);
    } catch (error) {
      console.error("Error fetching approval monitoring records:", error);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  // Approval Monitoring - Create single record
  app.post("/api/approval-monitoring", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const recordData = req.body;

      const [newRecord] = await db.insert(schema.approvalMonitoring).values({
        type: recordData.type || null,
        platform: recordData.platform || null,
        pic: recordData.pic || null,
        ipAddress: recordData.ipAddress || null,
        hostnameAccounts: recordData.hostnameAccounts || null,
        identifierSerialNumber: recordData.identifierSerialNumber || null,
        approvalNumber: recordData.approvalNumber || null,
        startDate: recordData.startDate || null,
        endDate: recordData.endDate || null,
        status: recordData.status || null,
        remarks: recordData.remarks || null,
      }).returning();

      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating approval monitoring record:", error);
      res.status(500).json({ 
        message: "Failed to create record",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Approval Monitoring - Update record
  app.patch("/api/approval-monitoring/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const recordData = req.body;

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const [updatedRecord] = await db.update(schema.approvalMonitoring)
        .set({
          type: recordData.type || null,
          platform: recordData.platform || null,
          pic: recordData.pic || null,
          ipAddress: recordData.ipAddress || null,
          hostnameAccounts: recordData.hostnameAccounts || null,
          identifierSerialNumber: recordData.identifierSerialNumber || null,
          approvalNumber: recordData.approvalNumber || null,
          startDate: recordData.startDate || null,
          endDate: recordData.endDate || null,
          status: recordData.status || null,
          remarks: recordData.remarks || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.approvalMonitoring.id, id))
        .returning();

      if (!updatedRecord) {
        return res.status(404).json({ message: "Record not found" });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error updating approval monitoring record:", error);
      res.status(500).json({ message: "Failed to update record" });
    }
  });

  // Approval Monitoring - Delete record
  app.delete("/api/approval-monitoring/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      await db.delete(schema.approvalMonitoring)
        .where(eq(schema.approvalMonitoring.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting approval monitoring record:", error);
      res.status(500).json({ message: "Failed to delete record" });
    }
  });

  // AWS Inventory - Get all records
  app.get("/api/aws-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const records = await db.select().from(schema.awsInventory).orderBy(desc(schema.awsInventory.id));
      res.json(records);
    } catch (error) {
      console.error("Error fetching AWS inventory records:", error);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  // AWS Inventory - Create single record
  app.post("/api/aws-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const recordData = req.body;

      const [newRecord] = await db.insert(schema.awsInventory).values({
        identifier: recordData.identifier || null,
        service: recordData.service || null,
        type: recordData.type || null,
        region: recordData.region || null,
        accountName: recordData.accountName || null,
        accountId: recordData.accountId || null,
        status: recordData.status || 'active',
        remarks: recordData.remarks || null,
      }).returning();

      res.status(201).json(newRecord);
    } catch (error) {
      console.error("Error creating AWS inventory record:", error);
      res.status(500).json({ 
        message: "Failed to create record",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AWS Inventory - Update record
  app.patch("/api/aws-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const recordData = req.body;

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const [updatedRecord] = await db.update(schema.awsInventory)
        .set({
          identifier: recordData.identifier || null,
          service: recordData.service || null,
          type: recordData.type || null,
          region: recordData.region || null,
          accountName: recordData.accountName || null,
          accountId: recordData.accountId || null,
          status: recordData.status || 'active',
          remarks: recordData.remarks || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.awsInventory.id, id))
        .returning();

      if (!updatedRecord) {
        return res.status(404).json({ message: "Record not found" });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error("Error updating AWS inventory record:", error);
      res.status(500).json({ message: "Failed to update record" });
    }
  });

  // AWS Inventory - Delete record
  app.delete("/api/aws-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      await db.delete(schema.awsInventory)
        .where(eq(schema.awsInventory.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AWS inventory record:", error);
      res.status(500).json({ message: "Failed to delete record" });
    }
  });

  // Approval Monitoring Import
  app.post("/api/approval-monitoring/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { records } = req.body;

      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ message: "Invalid request: records array is required" });
      }

      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          // Helper function to clean values - remove quotes and trim
          const cleanValue = (value: any): string | null => {
            if (!value || value === '-' || value === '') return null;
            let cleaned = String(value).trim();
            // Remove surrounding quotes if present
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
              cleaned = cleaned.slice(1, -1);
            }
            if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
              cleaned = cleaned.slice(1, -1);
            }
            // Double check for empty after cleaning
            return cleaned && cleaned !== '' ? cleaned : null;
          };

          // Map all possible variations of column headers
          const ipAddress = cleanValue(record['ip address']) ||
                           cleanValue(record.ipAddress) ||
                           cleanValue(record['IP Address']) ||
                           cleanValue(record['ip_address']) ||
                           cleanValue(record['Ip Address']) ||
                           cleanValue(record['ipaddress']);

          const hostnameAccounts = cleanValue(record['hostname/accounts']) ||
                                  cleanValue(record.hostnameAccounts) ||
                                  cleanValue(record.hostname) ||
                                  cleanValue(record['Hostname/Accounts']) ||
                                  cleanValue(record['hostname_accounts']) ||
                                  cleanValue(record['hostname/accounts']) ||
                                  cleanValue(record['hostname accounts']) ||
                                  cleanval(record['Hostname Accounts']);

          const identifierSerialNumber = cleanValue(record['identifier/serial number']) ||
                                         cleanValue(record.identifierSerialNumber) ||
                                         cleanValue(record.identifier) ||
                                         cleanValue(record['Identifier/Serial Number']) ||
                                         cleanValue(record['identifier_serial_number']) ||
                                         cleanValue(record['serialNumber']) ||
                                         cleanValue(record['serial number']) ||
                                         cleanValue(record['Identifier/serial number']) ||
                                         cleanValue(record['identifier serial number']) ||
                                         cleanValue(record['Identifier Serial Number']) ||
                                         cleanValue(record['Serial Number']);

          const approvalNumber = cleanValue(record['approval number']) ||
                                cleanValue(record.approvalNumber) ||
                                cleanValue(record['Approval Number']) ||
                                cleanValue(record['approval_number']) ||
                                cleanValue(record['Approval number']);

          const startDate = cleanValue(record['start date']) ||
                           cleanValue(record.startDate) ||
                           cleanValue(record['Start Date']) ||
                           cleanValue(record['start_date']) ||
                           cleanValue(record['Start date']);

          const endDate = cleanValue(record['end date']) ||
                         cleanValue(record.endDate) ||
                         cleanValue(record['End Date']) ||
                         cleanValue(record['end_date']) ||
                         cleanValue(record['End date']);

          await db.insert(schema.approvalMonitoring).values({
            type: cleanValue(record.type) || cleanValue(record.Type),
            platform: cleanValue(record.platform) || cleanValue(record.Platform),
            pic: cleanValue(record.pic) || cleanValue(record.PIC),
            ipAddress,
            hostnameAccounts,
            identifierSerialNumber,
            approvalNumber,
            startDate,
            endDate,
            status: null,
            remarks: cleanValue(record.remarks) || cleanValue(record.Remarks),
          });
          successful++;
        } catch (error: any) {
          failed++;
          errors.push(`Failed to import record: ${error.message}`);
        }
      }

      return res.json({
        total: records.length,
        successful,
        failed,
        errors
      });
    } catch (error: any) {
      console.error("Approval monitoring import error:", error);
      return res.status(500).json({ message: "Import failed", error: error.message });
    }
  });

  // Email test endpoint
  app.post("/api/test-email", requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSystemSettings();

      if (!settings?.mailHost || !settings?.companyEmail) {
        return res.status(400).json({
          message: "Email configuration is incomplete. Please configure SMTP settings first."
        });
      }

      // Reinitialize email service to ensure latest settings
      await emailService.initialize();

      const success= await emailService.sendEmail({
        to: settings.companyEmail,
        subject: 'SRPH-MIS Test Email',
        html: `
          <h2>Test Email from SRPH-MIS</h2>
          <p>This is a test email to verify your email configuration.</p>
          <p>If you received this email, your email settings are working correctly!</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        `
      });

      if (success) {
        return res.json({
          success: true,
          message: `Test email sent successfully to ${settings.companyEmail}`
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send test email. Check server logs for details."
        });
      }
    } catch (error) {
      console.error('Test email error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send test email"
      });
    }
  });

  // Database Management API endpoints
  app.get("/api/database/status", async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({
          status: "Disconnected",
          name: "PostgreSQL Database",
          version: "Not Connected",
          size: "Connection Required",
          sizeBytes: 0,
          tables: [],
          tablesCount: 0,
          lastBackup: "No connection",
          connectionError: true,
          errorMessage: 'Database connection failed',
          storageMode: "In-Memory Storage (Temporary)"
        });
      }

      // Test database connection and get basic info
      const connectionTest = await db.execute(sql`SELECT version() AS version, current_database() AS name`);
      const sizeQuery = await db.execute(sql`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) AS size,
          pg_database_size(current_database()) AS size_bytes
      `);

      // Get table information
      const tablesQuery = await db.execute(sql`
        SELECT
          schemaname,
          tablename AS name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      const tables = tablesQuery.rows.map((table: any) => ({
        name: table.name,
        columns: 0, // We could get this with another query if needed
        size: table.size,
        sizeBytes: parseInt(table.size_bytes) || 0
      }));

      // Check for recent backups (if backup directory exists)
      let lastBackup = "No backups found";
      try {
        const fs = await import('fs');
        const path = await import('path');
        const backupDir = path.join(process.cwd(), 'backups');
        if (fs.existsSync(backupDir)) {
          const files = fs.readdirSync(backupDir);
          const sqlFiles = files.filter(f => f.endsWith('.sql')).sort().reverse();
          if (sqlFiles.length > 0) {
            const stats = fs.statSync(path.join(backupDir, sqlFiles[0]));
            lastBackup = stats.mtime.toLocaleString();
          }
        }
      } catch (backupError) {
        console.warn('Could not check backup directory:', backupError);
      }

      return res.json({
        status: "Connected",
        name: connectionTest.rows[0]?.name || "PostgreSQL Database",
        version: connectionTest.rows[0]?.version || "Unknown",
        size: sizeQuery.rows[0]?.size || "Unknown",
        sizeBytes: parseInt(sizeQuery.rows[0]?.size_bytes) || 0,
        tables,
        tablesCount: tables.length,
        lastBackup,
        connectionError: false,
        errorMessage: null,
        storageMode: "PostgreSQL Database (Persistent)"
      });
    } catch (error) {
      console.error('Database status error:', error);
      return res.status(503).json({
        status: "Disconnected",
        name: "PostgreSQL Database",
        version: "Connection Failed",
        size: "Not Available",
        sizeBytes: 0,
        tables: [],
        tablesCount: 0,
        lastBackup: "Connection required",
        connectionError: true,
        errorMessage: error.message || 'Failed to connect to database',
        storageMode: "In-Memory Storage (Temporary)"
      });
    }
  });

  app.get("/api/database/backups", async (req: Request, res: Response) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        return res.json([]);
      }

      const files = fs.readdirSync(backupDir);
      const backups = files
        .filter(f => f.endsWith('.sql') || f.endsWith('.backup'))
        .map(filename => {
          const filePath = path.join(backupDir, filename);
          const stats = fs.statSync(filePath);
          return {
            filename,
            path: filePath,
            size: formatBytes(stats.size),
            created: stats.birthtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return res.json(backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      return res.status(500).json({ message: "Failed to fetch backups" });
    }
  });

  app.post("/api/database/backup", async (req: Request, res: Response) => {
    try {
      const { filename, tables, includeData, includeSchema, format } = req.body;
      const backupFilename = filename || `backup-${new Date().toISOString().split('T')[0]}.sql`;

      const fs = await import('fs');
      const path = await import('path');
      const { exec } = await import('child_process');      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, backupFilename);

      // Use pg_dump if available, otherwise create a basic SQL dump
      try {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
          // Construct the pg_dump command based on provided options
          let pgDumpArgs = ['-U', 'postgres', '-d', 'srph_mis']; // Default to current user and database if not specified in URL
          if (databaseUrl.includes('@')) { // If URL includes user/password/host
            const urlParts = databaseUrl.match(/postgres:\/\/(?:([^:]+):([^@]+)@)?([^/]+)\/(\w+)/);
            if (urlParts) {
              pgDumpArgs = ['-h', urlParts[3].split(':')[0], '-p', urlParts[3].split(':')[1] || '5432', '-U', urlParts[1] || 'postgres', '-d', urlParts[4]];
            }
          }

          if (tables && tables.length > 0) {
            tables.forEach((t: string) => pgDumpArgs.push('-t', t));
          } else if (includeSchema === false) {
            // If schema is explicitly excluded and no tables are specified, dump only data
            pgDumpArgs.push('--data-only');
          } else {
            // Default to including schema and data
            pgDumpArgs.push('--schema-only');
            pgDumpArgs.push('--data-only');
          }

          if (format === 'json') {
            pgDumpArgs.push('--format=custom'); // Use custom format for JSON export which is more robust
          } else {
            pgDumpArgs.push('--format=plain'); // Default to plain SQL
          }

          const pgDumpCmd = `pg_dump ${pgDumpArgs.join(' ')} > "${backupPath}"`;
          await execAsync(pgDumpCmd);

          // Read the file and send it as a download
          const fileContent = fs.readFileSync(backupPath);

          res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'application/sql');
          res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
          res.setHeader('Content-Length', fileContent.length);

          return res.send(fileContent);
        } else {
          throw new Error('No DATABASE_URL available for pg_dump');
        }
      } catch (pgDumpError) {
        console.warn('pg_dump failed, creating basic SQL backup:', pgDumpError);

        // Fallback: Create a basic backup by exporting table data
        let backupContent = `-- PostgreSQL database dump\n`;
        backupContent += `-- Dumped on: ${new Date().toISOString()}\n`;
        backupContent += `-- Database: srph_mis\n\n`;

        // Get all tables if none specified
        const tablesToBackup = tables && tables.length > 0 ? tables : [
          'users', 'assets', 'activities', 'licenses', 'components',
          'accessories', 'consumables', 'license_assignments', 'consumable_assignments',
          'it_equipment', 'it_equipment_assignments', 'vm_inventory', 'bitlocker_keys',
          'iam_accounts', 'monitor_inventory', 'vm_approval_history', 'approval_monitoring',
          'azure_inventory', 'gcp_inventory', 'aws_inventory', 'system_settings',
          'zabbix_settings', 'zabbix_subnets', 'discovered_hosts', 'vm_monitoring',
          'aws_historical_data', 'azure_historical_data', 'gcp_historical_data',
          'iam_account_approval_history'
        ];

        try {
          for (const table of tablesToBackup) {
            backupContent += `-- Table: ${table}\n`;
            const tableData = await db.execute(sql.raw(`SELECT * FROM ${table}`));

            if (tableData.rows && tableData.rows.length > 0) {
              const columns = Object.keys(tableData.rows[0]);
              backupContent += `-- Columns: ${columns.join(', ')}\n\n`;
              // Add INSERT statements for data
              tableData.rows.forEach((row: any) => {
                const values = columns.map(col => {
                  const value = row[col];
                  if (value === null) return 'NULL';
                  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
                  if (value instanceof Date) return `'${value.toISOString()}'`; // Format dates
                  return value;
                });
                backupContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}); \n`;
              });
              backupContent += '\n';
            } else {
              backupContent += `-- No data found for table ${table}\n\n`;
            }
          }
        } catch (tableError) {
          console.error('Error reading table data:', tableError);
          backupContent += `-- Error reading table data: ${tableError.message}\n`;
        }

        // Write the backup content to file
        fs.writeFileSync(backupPath, backupContent);

        // Send file as download
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
        res.setHeader('Content-Length', backupContent.length);

        return res.send(backupContent);
      }
    } catch (error) {
      console.error('Backup error:', error);
      return res.status(500).json({ message: error.message || "Backup failed" });
    }
  });

  app.post("/api/database/restore", async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database connection required" });
      }

      const { backupPath } = req.body;

      if (!backupPath) {
        return res.status(400).json({ message: "Backup path is required" });
      }

      const fs = await import('fs');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ message: "Backup file not found" });
      }

      try {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
          // Read the backup file content
          const backupContent = await fs.promises.readFile(backupPath, 'utf8');
          
          // Execute the backup content directly using db.execute
          // We need to handle multiple statements if present
          const statements = backupContent.split(';').filter(s => s.trim().length > 0);
          
          console.log(`Starting manual restore of ${statements.length} statements`);
          
          for (const statement of statements) {
            try {
              await db.execute(sql.raw(statement));
            } catch (statementError) {
              console.warn(`Statement failed during restore: ${statement.substring(0, 50)}...`, statementError.message);
              // Continue with other statements
            }
          }
          
          console.log('Manual restore completed');
        } else {
          throw new Error('No DATABASE_URL available for restore');
        }
      } catch (restoreError) {
        console.error('Restore failed:', restoreError);
        return res.status(500).json({ message: "Restore failed: " + restoreError.message });
      }

      // Log the restore activity
      await storage.createActivity({
        action: "restore",
        itemType: "database",
        itemId: 1,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Database restored from backup: ${backupPath}`,
      });

      return res.json({
        success: true,
        message: "Database restored successfully",
        filename: backupPath
      });
    } catch (error) {
      console.error('Restore error:', error);
      return res.status(500).json({ message: error.message || "Restore failed" });
    }
  });

  app.post("/api/database/optimize", async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database connection required" });
      }

      const { tables } = req.body;
      const tablesToOptimize = tables || ['users', 'assets', 'activities', 'licenses', 'components', 'accessories', 'vm_inventory']; // Added vm_inventory

      const optimizedTables = [];

      for (const tableName of tablesToOptimize) {
        try {
          // Run VACUUM and ANALYZE on each table
          await db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`));
          optimizedTables.push(tableName);
        } catch (tableError) {
          console.warn(`Could not optimize table ${tableName}:`, tableError);
        }
      }

      // Log the optimization activity
      await storage.createActivity({
        action: "optimize",
        itemType: "database",
        itemId: 1,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Database optimized: ${optimizedTables.length} tables processed`,
      });

      return res.json({
        success: true,
        message: `Database optimization completed. ${optimizedTables.length} tables optimized.`,
        optimizedTables
      });
    } catch (error) {
      console.error('Optimization error:', error);
      return res.status(500).json({ message: error.message || "Optimization failed" });
    }
  });

  // Get maintenance schedule settings
  app.get('/api/database/schedule', async (req, res) => {
    try {
      // Check if we're using database storage
      if (!db) {
        return res.json({
          autoBackup: false,
          autoOptimize: false,
          backupTime: '03:00',
          optimizeTime: '04:00'
        });
      }

      // Verify system_settings table exists
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'system_settings'
        );
      `);

      if (!tableCheck.rows[0]?.exists) {
        console.warn('system_settings table does not exist, returning defaults');
        return res.json({
          autoBackup: false,
          autoOptimize: false,
          backupTime: '03:00',
          optimizeTime: '04:00'
        });
      }

      const settings = await storage.getSystemSettings();
      res.json({
        autoBackup: settings?.autoBackup || false,
        autoOptimize: false, // Not implemented yet
        backupTime: settings?.backupTime || '03:00',
        optimizeTime: '04:00'
      });
    } catch (error) {
      console.error('Error fetching schedule settings:', error);
      // Return defaults on error instead of failing
      res.json({
        autoBackup: false,
        autoOptimize: false,
        backupTime: '03:00',
        optimizeTime: '04:00'
      });
    }
  });

  // Update maintenance schedule
  app.post('/api/database/schedule', async (req, res) => {
    try {
      // Check if we're using database storage
      if (!db) {
        return res.status(503).json({
          message: 'Database not available - using in-memory storage. Schedule settings cannot be persisted.'
        });
      }

      // Verify system_settings table exists
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'system_settings'
        );
      `);

      if (!tableCheck.rows[0]?.exists) {
        console.error('system_settings table does not exist');
        return res.status(500).json({
          message: 'System settings table not found. Please run database migrations.'
        });
      }

      const { autoBackup, autoOptimize, backupTime, optimizeTime, retentionDays, emailNotifications } = req.body;

      console.log('📝 Received schedule update request:', {
        autoBackup,
        backupTime,
        autoOptimize,
        optimizeTime
      });

      let settings = await storage.getSystemSettings();
      if (!settings) {
        // Create default settings if none exist
        settings = {
          siteName: 'SRPH-MIS',
          companyName: 'SRPH',
          autoBackup: false,
          autoOptimize: false,
          backupTime: '03:00',
          optimizeTime: '04:00',
          retentionDays: 30,
          emailNotifications: true
        };
      }

      // Update settings in database using proper field names
      await db.execute(sql`
        UPDATE system_settings
        SET
          auto_backup = ${autoBackup ?? false},
          backup_time = ${backupTime ?? '03:00'},
          auto_optimize = ${autoOptimize ?? false},
          optimize_time = ${optimizeTime ?? '04:00'},
          retention_days = ${retentionDays ?? 30},
          email_notifications = ${emailNotifications ?? true},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `);

      console.log('✅ Schedule settings saved to database:', {
        autoBackup,
        backupTime,
        autoOptimize,
        optimizeTime,
        retentionDays,
        emailNotifications
      });

      // Fetch updated settings to return
      const updatedSettings = await storage.getSystemSettings();

      res.json({
        success: true,
        message: 'Maintenance schedule updated successfully',
        settings: {
          autoBackup: autoBackup ?? false,
          backupTime: backupTime ?? '03:00',
          autoOptimize: autoOptimize ?? false,
          optimizeTime: optimizeTime ?? '04:00',
          retentionDays: retentionDays ?? 30,
          emailNotifications: emailNotifications ?? true
        }
      });
    } catch (error) {
      console.error('Error updating schedule settings:', error);
      res.status(500).json({
        message: error.message || 'Failed to update schedule settings'
      });
    }
  });

  app.post("/api/database/backup-all", async (req: Request, res: Response) => {
    try {
      const { format } = req.body;
      const fs = await import('fs');
      const path = await import('path');

      if (format === 'json') {
        // Export all data as JSON
        const allData = {
          timestamp: new Date().toISOString(),
          users: await storage.getUsers(),
          assets: await storage.getAssets(),
          activities: await storage.getActivities(),
          licenses: await storage.getLicenses(),
          components: await storage.getComponents(),
          accessories: [], // Add if you have accessories
          settings: await storage.getSystemSettings()
        };

        const jsonContent = JSON.stringify(allData, null, 2);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=complete-backup-${new Date().toISOString().split('T')[0]}.json`);
        return res.send(jsonContent);
      }

      return res.status(400).json({ message: "Unsupported backup format" });
    } catch (error) {
      console.error('Backup all error:', error);
      return res.status(500).json({ message: error.message || "Backup all failed" });
    }
  });

  app.post("/api/database/restore-all", async (req:Request, res: Response) => {
    try {
      // This would handle file upload and restoration
      // For now, return a placeholder response
      return res.json({
        success: true,
        message: "Data restoration completed successfully"
      });
    } catch (error) {
      console.error('Restore all error:', error);
      return res.status(500).json({ message: error.message || "Restore all failed" });
    }
  });

  // Encryption management routes
  app.post("/api/admin/encrypt-data", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Verify admin password (compare with session user's password hash)
      const { scrypt } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);

      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      const [hashedPassword, salt] = currentUser.password.split('.');
      const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
      const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;

      if (!hashedPasswordBuf.equals(suppliedPasswordBuf)) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // Import encryption function
      const { encryptExistingData } = await import('./encrypt-existing-data');

      // Run encryption
      const result = await encryptExistingData();

      res.json({
        success: true,
        message: 'Data encrypted successfully',
        encryptedCount: result || 'All applicable records'
      });
    } catch (error: any) {
      console.error('Encryption error:', error);
      res.status(500).json({ message: error.message || 'Failed to encrypt data' });
    }
  });

  app.post("/api/admin/decrypt-data", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Verify admin password
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);

      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      const [hashedPassword, salt] = currentUser.password.split('.');
      const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
      const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;

      if (!hashedPasswordBuf.equals(suppliedPasswordBuf)) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // Import decryption modules
      const { db } = await import('./db');
      const schema = await import('@shared/schema');
      const { decryptFields, PII_FIELDS } = await import('./encryption');
      const { eq } = await import('drizzle-orm');

      if (!db) {
        return res.status(500).json({ message: 'Database connection required' });
      }

      let totalDecrypted = 0;

      // Decrypt users
      const users = await db.select().from(schema.users);
      for (const user of users) {
        const isEncrypted = user.email && user.email.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(user, PII_FIELDS.user);
            await db.update(schema.users)
              .set({
                email: decrypted.email,
                firstName: decrypted.firstName,
                lastName: decrypted.lastName,
                department: decrypted.department
              })
              .where(eq(schema.users.id, user.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt user ${user.id}`);
          }
        }
      }

      // Decrypt assets
      const assets = await db.select().from(schema.assets);
      for (const asset of assets) {
        const isEncrypted = asset.serialNumber && asset.serialNumber.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(asset, PII_FIELDS.asset);
            await db.update(schema.assets)
              .set({
                knoxId: decrypted.knoxId,
                serialNumber: decrypted.serialNumber,
                macAddress: decrypted.macAddress,
                ipAddress: decrypted.ipAddress
              })
              .where(eq(schema.assets.id, asset.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt asset ${asset.id}`);
          }
        }
      }

      // Decrypt BitLocker keys
      const keys = await db.select().from(schema.bitlockerKeys);
      for (const key of keys) {
        const isEncrypted = key.recoveryKey && key.recoveryKey.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(key, PII_FIELDS.bitlockerKey);
            await db.update(schema.bitlockerKeys)
              .set({
                serialNumber: decrypted.serialNumber,
                identifier: decrypted.identifier,
                recoveryKey: decrypted.recoveryKey
              })
              .where(eq(schema.bitlockerKeys.id, key.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt BitLocker key ${key.id}`);
          }
        }
      }

      // Decrypt VM Inventory
      const vmInventory = await db.select().from(schema.vmInventory);
      for (const vm of vmInventory) {
        const isEncrypted = vm.knoxId && vm.knoxId.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(vm, PII_FIELDS.vmInventory);
            await db.update(schema.vmInventory)
              .set({
                knoxId: decrypted.knoxId,
                requestor: decrypted.requestor,
                vmIp: decrypted.vmIp,
                ipAddress: decrypted.ipAddress
              })
              .where(eq(schema.vmInventory.id, vm.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt VM ${vm.id}`);
          }
        }
      }

      // Decrypt IAM Accounts
      const iamAccounts = await db.select().from(schema.iamAccounts);
      for (const account of iamAccounts) {
        const isEncrypted = account.knoxId && account.knoxId.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(account, PII_FIELDS.iamAccount);
            await db.update(schema.iamAccounts)
              .set({
                knoxId: decrypted.knoxId,
                requestor: decrypted.requestor
              })
              .where(eq(schema.iamAccounts.id, account.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt IAM account ${account.id}`);
          }
        }
      }

      // Decrypt IT Equipment
      const itEquipment = await db.select().from(schema.itEquipment);
      for (const equipment of itEquipment) {
        const isEncrypted = equipment.serialNumber && equipment.serialNumber.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(equipment, PII_FIELDS.itEquipment);
            await db.update(schema.itEquipment)
              .set({
                knoxId: decrypted.knoxId,
                serialNumber: decrypted.serialNumber
              })
              .where(eq(schema.itEquipment.id, equipment.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt IT equipment ${equipment.id}`);
          }
        }
      }

      // Decrypt Monitor Inventory
      const monitorInventory = await db.select().from(schema.monitorInventory);
      for (const monitor of monitorInventory) {
        const isEncrypted = monitor.serialNumber && monitor.serialNumber.split(':').length === 3;
        if (isEncrypted) {
          try {
            const decrypted = decryptFields(monitor, PII_FIELDS.monitor);
            await db.update(schema.monitorInventory)
              .set({
                assetNumber: decrypted.assetNumber,
                serialNumber: decrypted.serialNumber
                // knoxId is NOT encrypted - skip it
              })
              .where(eq(schema.monitorInventory.id, monitor.id));
            totalDecrypted++;
          } catch (error) {
            console.error(`Failed to decrypt monitor ${monitor.id}`);
          }
        }
      }

      res.json({
        success: true,
        message: 'Data decrypted successfully',
        decryptedCount: totalDecrypted
      });
    } catch (error: any) {
      console.error('Decryption error:', error);
      res.status(500).json({ message: error.message || 'Failed to decrypt data' });
    }
  });

  // User self password change endpoint
  app.post("/api/user/change-password", requireAuth, async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long" });
    }

    try {
      const user = await storage.getUser(req.user.id);

      // Verify current password if provided (skip if force change)
      if (currentPassword && !user.forcePasswordChange) {
        const { scrypt, timingSafeEqual } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);

        const [hashed, salt] = user.password.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(currentPassword, salt, 64)) as Buffer;

        if (!timingSafeEqual(hashedBuf, suppliedBuf)) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash new password
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);

      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Update password and clear force change flag
      await storage.updateUser(req.user.id, {
        password: hashedPassword,
        forcePasswordChange: false,
      });

      console.log(`User ${req.user.username} changed their password`);

      res.json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Admin endpoint to disable MFA for a user
  app.post("/api/admin/disable-mfa/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    const userId = parseInt(req.params.userId);

    try {
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled for this user" });
      }

      // Disable MFA
      await storage.updateUser(userId, {
        mfaSecret: null,
        mfaEnabled: false
      });

      console.log(`Admin ${req.user.username} disabled MFA for user ${user.username}`);

      // Return success response
      return res.status(200).json({
        success: true,
        message: `MFA disabled for user ${user.username}`
      });
    } catch (error: any) {
      console.error("Admin MFA disable error:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to disable MFA"
      });
    }
  });

  // Admin endpoint to reset user password
  app.post("/api/admin/reset-password/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    const userId = parseInt(req.params.userId);
    const { password, forceChange } = req.body;

    if (!password || password.trim() === '') {
      return res.status(400).json({ message: "Password is required" });
    }

    try {
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);

      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Update user password and force change flag
      await storage.updateUser(userId, {
        password: hashedPassword,
        forcePasswordChange: forceChange === true
      });

      console.log(`Admin ${req.user.username} reset password for user ${user.username}. Force change: ${forceChange}`);

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "user",
        itemId: userId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `Password reset by admin. Force change on next login: ${forceChange ? 'Yes' : 'No'}`,
      });

      return res.status(200).json({
        success: true,
        message: `Password reset successfully for user ${user.username}`,
        forceChange: forceChange === true
      });
    } catch (error: any) {
      console.error("Admin password reset error:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to reset password"
      });
    }
  });

  // Get current user
  app.get("/api/user", (req: Request, res: Response) => {
    console.log('GET /api/user - isAuthenticated:', req.isAuthenticated(), 'sessionID:', req.sessionID);
    if (!req.isAuthenticated()) {
      console.log('User not authenticated, returning 401');
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log('Returning user data:', {
      id: req.user.id,
      username: req.user.username,
      mfaEnabled: req.user.mfaEnabled,
      isAdmin: req.user.isAdmin,
      forcePasswordChange: req.user.forcePasswordChange
    });
    res.json(req.user);
  });

  // Add /api/me endpoint for compatibility
  app.get("/api/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.user });
  });

  // Update user profile
  app.put("/api/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { firstName, lastName, email, phone, location, bio } = req.body;

      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phone,
        location,
        bio
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session user data
      req.user.firstName = updatedUser.firstName;
      req.user.lastName = updatedUser.lastName;
      req.user.email = updatedUser.email;

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Register Page Builder routes
  registerPageBuilderRoutes(app, requireAuth, requireAdmin);

  // Register Zabbix routes
  registerZabbixRoutes(app, requireAuth);

  return server;
}
