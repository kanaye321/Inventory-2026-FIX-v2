
import nodemailer from 'nodemailer';
import { storage } from './storage';
import { promises as fs } from 'fs';
import { join } from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailLog {
  timestamp: string;
  to: string;
  subject: string;
  status: 'success' | 'failed';
  error?: string;
  messageId?: string;
}

const EMAIL_LOGS_DIR = join(process.cwd(), 'LOGS');
const EMAIL_LOG_FILE = 'email_notifications.log';

async function ensureEmailLogsDirectory() {
  try {
    await fs.access(EMAIL_LOGS_DIR);
  } catch {
    await fs.mkdir(EMAIL_LOGS_DIR, { recursive: true });
  }
}

async function logEmailEvent(log: EmailLog) {
  await ensureEmailLogsDirectory();
  const filepath = join(EMAIL_LOGS_DIR, EMAIL_LOG_FILE);
  const logEntry = `[${log.timestamp}] To: ${log.to} | Subject: ${log.subject} | Status: [${log.status.toUpperCase()}]${log.messageId ? ` | MessageID: ${log.messageId}` : ''}${log.error ? ` | Error: ${log.error}` : ''}\n`;
  await fs.appendFile(filepath, logEntry);
  
  // Clear console output with status indicators
  const statusEmoji = log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
  console.log(`📝 ${statusEmoji} Email event logged to email_notifications.log:`);
  console.log(`   Status: ${log.status.toUpperCase()}`);
  console.log(`   To: ${log.to}`);
  console.log(`   Subject: ${log.subject}`);
  if (log.error) console.log(`   Error: ${log.error}`);
  console.log(`   Log file: ${filepath}`);
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  async initialize() {
    try {
      const settings = await storage.getSystemSettings();
      
      if (!settings?.mailHost || !settings?.mailFromAddress) {
        console.log('Email not configured - skipping email service initialization');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: settings.mailHost,
        port: parseInt(settings.mailPort || '587'),
        secure: settings.mailPort === '465',
        auth: {
          user: settings.mailUsername || settings.mailFromAddress,
          pass: settings.mailPassword || ''
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not initialized - attempting to initialize...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.log('❌ Cannot send email - service not configured. Please configure email settings in System Setup.');
        console.log('💡 To enable emails: Go to System Setup → Email Settings → Configure SMTP details');
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: options.to,
          subject: options.subject,
          status: 'failed',
          error: 'Email service not configured'
        });
        return false;
      }
    }

    try {
      const settings = await storage.getSystemSettings();
      
      console.log(`📧 Sending email...`);
      console.log(`   From: ${settings?.mailFromAddress}`);
      console.log(`   To: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      
      const info = await this.transporter!.sendMail({
        from: `"${settings?.siteName || 'SRPH-MIS'}" <${settings?.mailFromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '')
      });

      console.log(`✅ Email sent successfully to ${options.to}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response}`);
      
      await logEmailEvent({
        timestamp: new Date().toISOString(),
        to: options.to,
        subject: options.subject,
        status: 'success',
        messageId: info.messageId
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.command) {
        console.error(`   Failed command: ${error.command}`);
      }
      
      await logEmailEvent({
        timestamp: new Date().toISOString(),
        to: options.to,
        subject: options.subject,
        status: 'failed',
        error: error.message
      });
      
      return false;
    }
  }

  async sendIamExpirationNotification(data: {
    accounts: Array<{
      requestor: string;
      knoxId: string;
      name?: string;
      permission: string;
      cloudPlatform: string;
      endDate: string;
      approvalId: string;
    }>;
  }) {
    try {
      const settings = await storage.getSystemSettings();
      
      if (!settings?.notifyOnIamExpiration) {
        console.log('📧 IAM expiration notifications are disabled');
        return false;
      }
      
      if (!settings?.companyEmail) {
        console.log('❌ No admin email configured for notifications');
        return false;
      }

      console.log(`📧 Preparing to send IAM expiration notifications`);
      console.log(`📧 ${data.accounts.length} expired IAM account(s)`);

      // Send individual notifications to each account owner
      let ownerNotificationsSent = 0;
      let nameNotificationsSent = 0;
      let adminNotificationsSent = 0;

      for (const account of data.accounts) {
        try {
          const ownerEmail = `${account.knoxId}@samsung.com`;
          
          // Check if userKnoxId field exists and has a valid value
          // Get userKnoxId with extensive debugging
          let userKnoxIdValue = account.userKnoxId;
          
          // Debug: Check all account fields
          console.log(`📧 ========== ACCOUNT FIELDS DEBUG ==========`);
          console.log(`📧 All account fields:`, Object.keys(account));
          console.log(`📧 Full account object:`, JSON.stringify(account, null, 2));
          console.log(`📧 userKnoxId raw:`, account.userKnoxId);
          console.log(`📧 userKnoxId type:`, typeof account.userKnoxId);
          console.log(`📧 userKnoxId === null:`, account.userKnoxId === null);
          console.log(`📧 userKnoxId === undefined:`, account.userKnoxId === undefined);
          console.log(`📧 =========================================`);
          
          // Convert null object to actual null
          if (userKnoxIdValue === null || userKnoxIdValue === undefined) {
            userKnoxIdValue = null;
          }
          
          // Check for valid string value
          const hasValidUserKnoxId = userKnoxIdValue !== null && 
                              userKnoxIdValue !== undefined &&
                              typeof userKnoxIdValue === 'string' && 
                              userKnoxIdValue.trim() !== '' && 
                              userKnoxIdValue.trim().toLowerCase() !== 'null' && 
                              userKnoxIdValue.trim() !== '-' &&
                              userKnoxIdValue.trim().toLowerCase() !== 'n/a';
          
          const userKnoxIdEmail = hasValidUserKnoxId ? `${userKnoxIdValue.trim()}@samsung.com` : null;
          
          console.log(`📧 Processing notifications for ${account.knoxId}...`);
          console.log(`📧 User Knox ID processed value:`, JSON.stringify(userKnoxIdValue));
          console.log(`📧 Has valid User Knox ID:`, hasValidUserKnoxId);
          console.log(`📧 User Knox ID email:`, userKnoxIdEmail);
          
          // Send to account owner (Knox ID)
          const ownerResult = await this.sendIamExpirationOwnerNotification(account);
          if (ownerResult) {
            ownerNotificationsSent++;
            console.log(`✅ Knox ID notification sent to ${ownerEmail}`);
          } else {
            console.log(`⚠️ Failed to send Knox ID notification to ${ownerEmail}`);
          }

          // Send to User Knox ID email if provided - using the same notification function
          if (hasValidUserKnoxId && userKnoxIdEmail) {
            console.log(`📧 ========== SENDING USER KNOX ID NOTIFICATION ==========`);
            console.log(`📧 Knox ID: ${account.knoxId}`);
            console.log(`📧 User Knox ID: ${account.userKnoxId}`);
            console.log(`📧 User Knox ID Email: ${userKnoxIdEmail}`);
            
            const userKnoxIdResult = await this.sendIamExpirationOwnerNotification({
              ...account,
              knoxId: account.userKnoxId.trim() // Use userKnoxId for email address
            });
            if (userKnoxIdResult) {
              nameNotificationsSent++;
              console.log(`✅ User Knox ID notification SUCCESSFULLY sent to ${userKnoxIdEmail}`);
            } else {
              console.log(`❌ FAILED to send User Knox ID notification to ${userKnoxIdEmail}`);
            }
            console.log(`📧 =======================================================`);
          } else {
            const debugInfo = {
              knoxId: account.knoxId,
              rawUserKnoxId: account.userKnoxId,
              userKnoxIdType: typeof account.userKnoxId,
              userKnoxIdLength: account.userKnoxId ? account.userKnoxId.length : 0,
              trimmedUserKnoxId: account.userKnoxId ? account.userKnoxId.trim() : 'null',
              isString: typeof account.userKnoxId === 'string',
              isEmpty: !account.userKnoxId || account.userKnoxId.trim() === '',
              isNull: account.userKnoxId === null || account.userKnoxId === undefined,
              hasValidUserKnoxId,
              userKnoxIdEmail
            };
            console.log(`ℹ️ SKIPPING User Knox ID notification for ${account.knoxId}:`, JSON.stringify(debugInfo, null, 2));
          }

          // Send to admin for each account
          const adminSubject = `[SRPH-MIS] IAM Account Expiration Alert - ${account.knoxId}`;
          
          const adminHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background-color: #f3f4f6; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
                td { padding: 10px; border: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>⚠️ IAM Account Expiration Alert</h2>
                </div>
                <div class="content">
                  <p><strong>The following IAM account has expired and requires attention:</strong></p>
                  <table>
                    <thead>
                      <tr>
                        <th>Requestor</th>
                        <th>Knox ID</th>
                        ${account.name ? '<th>Name</th>' : ''}
                        <th>Role</th>
                        <th>Platform</th>
                        <th>End Date</th>
                        <th>Approval ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${account.requestor}</td>
                        <td>${account.knoxId}</td>
                        ${account.name ? `<td>${account.name}</td>` : ''}
                        <td>${account.permission}</td>
                        <td>${account.cloudPlatform}</td>
                        <td>${account.endDate}</td>
                        <td style="font-weight: bold; color: #ef4444;">${account.approvalId}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p><strong>Action Required:</strong></p>
                  <ul>
                    <li>Review and update expired account</li>
                    <li>Contact requestor for extension if needed</li>
                    <li>Remove access if no longer required</li>
                    <li>Update status to "Expired - Notified" after notification</li>
                  </ul>
                  <p><strong>Note:</strong> Notifications sent to ${ownerEmail}${userKnoxIdEmail ? ` and ${userKnoxIdEmail}` : ''}</p>
                  <p>This is an automated notification from SRPH-MIS.</p>
                </div>
                <div class="footer">
                  <p>SRPH Management Information System</p>
                  <p>This email was sent automatically. Please do not reply.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const adminResult = await this.sendEmail({
            to: settings.companyEmail,
            subject: adminSubject,
            html: adminHtml
          });

          if (adminResult) {
            adminNotificationsSent++;
            console.log(`✅ Admin notification sent to ${settings.companyEmail} for ${account.knoxId}`);
            
            // Log admin email to email_notifications.log
            await logEmailEvent({
              timestamp: new Date().toISOString(),
              to: settings.companyEmail,
              subject: adminSubject,
              status: 'success',
              messageId: `iam-admin-${account.knoxId}-${Date.now()}`
            });
          } else {
            console.log(`⚠️ Failed to send admin notification to ${settings.companyEmail} for ${account.knoxId}`);
            
            // Log failure to email_notifications.log
            await logEmailEvent({
              timestamp: new Date().toISOString(),
              to: settings.companyEmail,
              subject: adminSubject,
              status: 'failed',
              error: 'Email service returned false'
            });
          }
        } catch (accountError) {
          console.error(`❌ Failed to send notifications for ${account.knoxId}:`, accountError);
          
          // Log error to email_notifications.log
          await logEmailEvent({
            timestamp: new Date().toISOString(),
            to: settings?.companyEmail || 'N/A',
            subject: `[SRPH-MIS] IAM Account Expiration Alert - ${account.knoxId}`,
            status: 'failed',
            error: accountError.message || 'Unknown error'
          });
        }
      }

      console.log(`📧 NOTIFICATION SUMMARY:`);
      console.log(`   ✉️  Knox ID notifications: ${ownerNotificationsSent}`);
      console.log(`   ✉️  User Knox ID notifications: ${nameNotificationsSent}`);
      console.log(`   ✉️  Admin notifications: ${adminNotificationsSent}`);
      console.log(`   📊 Total: ${ownerNotificationsSent + nameNotificationsSent + adminNotificationsSent} emails sent`);

      return ownerNotificationsSent > 0 || nameNotificationsSent > 0 || adminNotificationsSent > 0;
    } catch (error) {
      console.error('❌ Error sending IAM expiration notification:', error);
      return false;
    }
  }

  async sendIamExpirationOwnerNotification(account: {
    requestor: string;
    knoxId: string;
    permission: string;
    cloudPlatform: string;
    endDate: string;
    approvalId: string;
  }) {
    try {
      const settings = await storage.getSystemSettings();
      
      if (!this.transporter) {
        console.log('📧 Email service not initialized - skipping owner notification');
        return false;
      }

      const ownerEmail = `${account.knoxId}@samsung.com`;
      
      // Calculate removal date (7 days from now)
      const removalDate = new Date();
      removalDate.setDate(removalDate.getDate() + 7);
      const removalDateStr = removalDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Use custom template from settings or default
      const subject = settings?.iamExpirationEmailSubject || 'IAM Account Access Expiration Notice';
      
      // Default template if none is configured
      const defaultTemplate = `Hi,

Please be advised that your requested access is now expired and will be removed on {removalDate}.

Kindly let us know if you still require access or if we can now proceed with the removal.

https://confluence.sec.samsung.net/pages/viewpage.action?pageId=454565479&spaceKey=SRPHCOMMONC&title=AWS%2BApproval%2BGuide

Account Details:
- Requestor: {requestor}
- Knox ID: {knoxId}
- Permission/IAM/SCOP: {permission}
- Cloud Platform: {cloudPlatform}
- Expiration Date: {endDate}
- Approval ID: {approvalId}

If you need to extend your access, please submit a new request through the proper channels.`;

      // Use the custom template from settings, or fall back to default
      let emailBody = settings?.iamExpirationEmailBody && settings.iamExpirationEmailBody.trim() !== '' 
        ? settings.iamExpirationEmailBody 
        : defaultTemplate;

      console.log('📧 Using email template:', emailBody.substring(0, 100) + '...');

      // Replace placeholders with actual values
      emailBody = emailBody
        .replace(/{removalDate}/g, removalDateStr)
        .replace(/{requestor}/g, account.requestor)
        .replace(/{knoxId}/g, account.knoxId)
        .replace(/{permission}/g, account.permission)
        .replace(/{cloudPlatform}/g, account.cloudPlatform)
        .replace(/{endDate}/g, account.endDate)
        .replace(/{approvalId}/g, account.approvalId);

      // Convert plain text to HTML with proper formatting
      const emailBodyHtml = emailBody
        .split('\n')
        .map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
            return `<p><a href="${trimmedLine}" style="color: #2563eb; text-decoration: none;">${trimmedLine}</a></p>`;
          }
          return trimmedLine ? `<p>${line}</p>` : '<br>';
        })
        .join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            a { color: #2563eb; text-decoration: none; }
            code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
            p { margin: 0.5em 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ ${subject}</h2>
            </div>
            <div class="content">
              ${emailBodyHtml}
              <p style="margin-top: 20px; font-style: italic; color: #6b7280;">This is an automated notification from SRPH-MIS.</p>
            </div>
            <div class="footer">
              <p>SRPH Management Information System</p>
              <p>This email was sent automatically. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`📧 Sending IAM expiration email to ${ownerEmail} with subject: ${subject}`);

      const result = await this.sendEmail({
        to: ownerEmail,
        subject,
        html
      });

      // Log to email_notifications.log
      if (result) {
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: ownerEmail,
          subject: subject,
          status: 'success',
          messageId: `iam-owner-${account.knoxId}-${Date.now()}`
        });
      } else {
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: ownerEmail,
          subject: subject,
          status: 'failed',
          error: 'Email service returned false'
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending IAM owner notification:', error);
      return false;
    }
  }

  async sendApprovalExpirationNotification(data: {
    records: Array<{
      type: string;
      platform: string;
      pic: string;
      ipAddress: string;
      hostnameAccounts: string;
      identifierSerialNumber: string;
      approvalNumber: string;
      endDate: string;
      remarks: string;
    }>;
  }) {
    try {
      const settings = await storage.getSystemSettings();
      
      // Always send notifications (removed disabled check)
      console.log('📧 Approval expiration notifications are ALWAYS ON');
      
      if (!this.transporter) {
        console.log('📧 Email service not initialized - attempting to initialize...');
        await this.initialize();
        if (!this.transporter) {
          console.log('📧 Email service still not initialized');
          await logEmailEvent({
            timestamp: new Date().toISOString(),
            to: settings?.companyEmail || 'N/A',
            subject: `[SRPH-MIS] Approval Expiration Alert`,
            status: 'failed',
            error: 'Email service not initialized'
          });
          return false;
        }
      }

      if (!settings?.companyEmail) {
        console.log('📧 No company email configured');
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: 'N/A',
          subject: `[SRPH-MIS] Approval Expiration Alert`,
          status: 'failed',
          error: 'No company email configured'
        });
        return false;
      }

      console.log(`📧 Preparing to send approval expiration notifications`);
      console.log(`📧 ${data.records.length} approval(s) expiring within 1 week`);

      const recordsTable = data.records.map((record, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">${index + 1}</td>
          <td style="padding: 12px; text-align: left;">${record.type}</td>
          <td style="padding: 12px; text-align: left;">${record.platform}</td>
          <td style="padding: 12px; text-align: left;">${record.pic}</td>
          <td style="padding: 12px; text-align: left;">${record.ipAddress}</td>
          <td style="padding: 12px; text-align: left;">${record.hostnameAccounts}</td>
          <td style="padding: 12px; text-align: left;">${record.identifierSerialNumber}</td>
          <td style="padding: 12px; text-align: left;"><strong>${record.approvalNumber}</strong></td>
          <td style="padding: 12px; text-align: left; color: #dc2626;"><strong>${record.endDate}</strong></td>
        </tr>
      `).join('');

      const subject = `[SRPH-MIS] ⚠️ Approval Monitoring - ${data.records.length} Approval(s) Expiring Within 1 Week`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 900px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px; }
            .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; background-color: white; margin-top: 15px; }
            th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⚠️ Approval Monitoring Expiration Alert</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Approvals Expiring Within 1 Week</p>
            </div>
            
            <div class="content">
              <p><strong>Alert Summary:</strong></p>
              <p>The following <strong>${data.records.length}</strong> approval(s) will expire within the next 7 days and require immediate attention:</p>
              
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Platform</th>
                    <th>PIC</th>
                    <th>IP Address</th>
                    <th>Hostname/Accounts</th>
                    <th>Identifier/SN</th>
                    <th>Approval Number</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${recordsTable}
                </tbody>
              </table>
              
              <p style="margin-top: 20px;"><strong>Action Required:</strong></p>
              <ul>
                <li>Review each approval and determine if renewal is needed</li>
                <li>Contact the respective PICs for confirmation</li>
                <li>Prepare necessary documentation for approval extensions if required</li>
                <li>Update the approval monitoring system accordingly</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from SRPH-MIS Approval Monitoring System.</p>
              <p>Please do not reply to this email. For questions, contact your system administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`📧 Sending approval expiration email to ${settings.companyEmail}`);
      
      const result = await this.sendEmail({
        to: settings.companyEmail,
        subject: subject,
        html: html
      });

      if (result) {
        console.log(`✅ Approval expiration notification sent to ${settings.companyEmail}`);
        
        // Log successful email to email_notifications.log
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings.companyEmail,
          subject: subject,
          status: 'success',
          messageId: `approval-expiration-${Date.now()}`
        });
      } else {
        console.log(`⚠️ Failed to send approval expiration notification`);
        
        // Log failed email to email_notifications.log
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings.companyEmail,
          subject: subject,
          status: 'failed',
          error: 'Email service returned false'
        });
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error sending approval expiration notification:', error);
      
      // Log error to email_notifications.log
      await logEmailEvent({
        timestamp: new Date().toISOString(),
        to: settings?.companyEmail || 'N/A',
        subject: `[SRPH-MIS] Approval Expiration Alert`,
        status: 'failed',
        error: error.message || 'Unknown error'
      });
      
      return false;
    }
  }

  async sendVmExpirationNotification(data: {
    vms: Array<{
      vmName: string;
      knoxId: string;
      requestor: string;
      department: string;
      endDate: string;
      approvalNumber: string;
    }>;
  }) {
    try {
      const settings = await storage.getSystemSettings();
      
      if (!settings?.notifyOnVmExpiration) {
        console.log('📧 VM expiration notifications are disabled');
        return false;
      }
      
      if (!settings?.companyEmail) {
        console.log('❌ No admin email configured for notifications');
        return false;
      }

      console.log(`📧 Preparing to send VM expiration notification to: ${settings.companyEmail}`);
      console.log(`📧 ${data.vms.length} expired VM(s)`);

      const subject = `[SRPH-MIS] VM Expiration Alert - ${data.vms.length} Virtual Machine(s)`;
      
      const vmsHtml = data.vms.map(vm => `
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${vm.vmName}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${vm.knoxId || 'N/A'}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${vm.requestor}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${vm.department || 'N/A'}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${vm.endDate}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #ef4444;">${vm.approvalNumber || 'N/A'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #f3f4f6; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Virtual Machine Expiration Alert</h2>
            </div>
            <div class="content">
              <p><strong>The following virtual machines have reached their end date and require attention:</strong></p>
              <table>
                <thead>
                  <tr>
                    <th>VM Name</th>
                    <th>Knox ID</th>
                    <th>Requestor</th>
                    <th>Department</th>
                    <th>End Date</th>
                    <th>Approval Number</th>
                  </tr>
                </thead>
                <tbody>
                  ${vmsHtml}
                </tbody>
              </table>
              <p><strong>Action Required:</strong></p>
              <ul>
                <li>Review and update expired VMs</li>
                <li>Contact requestors for extension if needed</li>
                <li>Decommission VMs if no longer required</li>
                <li>Update status to "Overdue - Notified" after notification</li>
              </ul>
              <p>This is an automated notification from SRPH-MIS.</p>
            </div>
            <div class="footer">
              <p>SRPH Management Information System</p>
              <p>This email was sent automatically. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.sendEmail({
        to: settings.companyEmail,
        subject,
        html
      });

      if (result) {
        console.log(`✅ VM expiration notification sent successfully to ${settings.companyEmail}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending VM expiration notification:', error);
      return false;
    }
  }

  async sendModificationNotification(data: {
    action: string;
    itemType: string;
    itemName: string;
    userName: string;
    details: string;
    timestamp: string;
    additionalInfo?: {
      assetTag?: string;
      category?: string;
      status?: string;
      location?: string;
      assignedTo?: string;
      serialNumber?: string;
      knoxId?: string;
      department?: string;
      previousValues?: any;
      currentValues?: any;
    };
  }) {
    try {
      console.log(`\n📧 [EMAIL SERVICE] sendModificationNotification called`);
      console.log(`   Item: ${data.itemType} - ${data.itemName}`);
      console.log(`   Action: ${data.action}`);
      
      const settings = await storage.getSystemSettings();
      
      const companyEmail = settings?.companyEmail;
      const mailHost = settings?.mailHost;
      
      console.log(`   Settings loaded:`, {
        companyEmail: companyEmail || 'NOT SET',
        mailHost: mailHost || 'NOT SET',
        mailConfigured: !!(companyEmail && mailHost)
      });
      
      console.log('   ✅ All notifications are ALWAYS ON (preference checks removed)');
      
      const subject = `[SRPH-MIS] ${data.action.toUpperCase()} - ${data.itemType}: ${data.itemName}`;
      
      if (!settings?.companyEmail) {
        console.log('   ❌ No admin email configured');
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: 'N/A',
          subject: subject,
          status: 'failed',
          error: 'No admin email configured'
        });
        return false;
      }
      
      if (!settings?.mailHost) {
        console.log('   ❌ No mail host configured');
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings.companyEmail,
          subject: subject,
          status: 'failed',
          error: 'No mail host configured'
        });
        return false;
      }

      console.log(`   ✅ Email configuration verified`);
      console.log(`   📬 Sending to: ${settings.companyEmail}`);
      console.log(`   📝 Subject: ${subject}`);
      
      // Get action color and icon
      const actionConfig = {
        create: { color: '#10b981', icon: '✅', label: 'CREATED', bgColor: '#d1fae5' },
        created: { color: '#10b981', icon: '✅', label: 'CREATED', bgColor: '#d1fae5' },
        update: { color: '#f59e0b', icon: '🔄', label: 'UPDATED', bgColor: '#fef3c7' },
        updated: { color: '#f59e0b', icon: '🔄', label: 'UPDATED', bgColor: '#fef3c7' },
        delete: { color: '#ef4444', icon: '🗑️', label: 'DELETED', bgColor: '#fee2e2' },
        deleted: { color: '#ef4444', icon: '🗑️', label: 'DELETED', bgColor: '#fee2e2' },
        assign: { color: '#3b82f6', icon: '📌', label: 'ASSIGNED', bgColor: '#dbeafe' },
        unassign: { color: '#8b5cf6', icon: '📍', label: 'UNASSIGNED', bgColor: '#ede9fe' },
        checkout: { color: '#0ea5e9', icon: '📤', label: 'CHECKED OUT', bgColor: '#e0f2fe' },
        checkin: { color: '#14b8a6', icon: '📥', label: 'CHECKED IN', bgColor: '#ccfbf1' }
      };

      const config = actionConfig[data.action.toLowerCase()] || { color: '#6b7280', icon: '📝', label: data.action.toUpperCase(), bgColor: '#f3f4f6' };
      
      // Build additional details section if provided
      let additionalDetailsHtml = '';
      if (data.additionalInfo) {
        const info = data.additionalInfo;
        additionalDetailsHtml = `
          <div class="info-section" style="background-color: ${config.bgColor}; border-color: ${config.color};">
            <h3 style="color: ${config.color};">📊 Asset Information:</h3>
            <div class="detail-grid">
              ${info.assetTag ? `<div class="detail-item"><span class="detail-label">Asset Tag:</span> <strong>${info.assetTag}</strong></div>` : ''}
              ${info.category ? `<div class="detail-item"><span class="detail-label">Category:</span> <strong>${info.category}</strong></div>` : ''}
              ${info.status ? `<div class="detail-item"><span class="detail-label">Status:</span> <strong>${info.status}</strong></div>` : ''}
              ${info.location ? `<div class="detail-item"><span class="detail-label">Location:</span> <strong>${info.location}</strong></div>` : ''}
              ${info.assignedTo ? `<div class="detail-item"><span class="detail-label">Assigned To:</span> <strong>${info.assignedTo}</strong></div>` : ''}
              ${info.serialNumber ? `<div class="detail-item"><span class="detail-label">Serial Number:</span> <strong>${info.serialNumber}</strong></div>` : ''}
              ${info.knoxId ? `<div class="detail-item"><span class="detail-label">Knox ID:</span> <strong>${info.knoxId}</strong></div>` : ''}
              ${info.department ? `<div class="detail-item"><span class="detail-label">Department:</span> <strong>${info.department}</strong></div>` : ''}
            </div>
          </div>
        `;
      }

      // Build change comparison if update action
      let changeComparisonHtml = '';
      if (data.action.toLowerCase() === 'update' && data.additionalInfo?.previousValues && data.additionalInfo?.currentValues) {
        const prev = data.additionalInfo.previousValues;
        const curr = data.additionalInfo.currentValues;
        const changes = [];
        
        for (const key in curr) {
          if (prev[key] !== curr[key] && prev[key] !== undefined) {
            changes.push(`
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">${key.charAt(0).toUpperCase() + key.slice(1)}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #ef4444;">${prev[key] || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #10b981;">${curr[key] || 'N/A'}</td>
              </tr>
            `);
          }
        }

        if (changes.length > 0) {
          changeComparisonHtml = `
            <div class="info-section">
              <h3>🔄 Changes Made:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Field</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Previous Value</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${changes.join('')}
                </tbody>
              </table>
            </div>
          `;
        }
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; padding: 24px; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .header .action-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 12px; font-size: 11px; letter-spacing: 0.5px; background-color: rgba(255,255,255,0.2); }
            .content { padding: 24px; }
            .summary { background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 20px; }
            .summary-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .summary-row:last-child { border-bottom: none; }
            .summary-label { font-weight: 600; color: #6b7280; min-width: 120px; font-size: 14px; }
            .summary-value { color: #1f2937; flex: 1; font-size: 14px; }
            .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
            .detail-item { padding: 12px; background-color: #f9fafb; border-radius: 6px; border-left: 3px solid ${config.color}; }
            .detail-item .label { color: #6b7280; font-size: 12px; margin-bottom: 4px; }
            .detail-item .value { color: #1f2937; font-weight: 500; font-size: 14px; }
            .changes-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            .changes-table th { background-color: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            .changes-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .changes-table .old-value { color: #dc2626; }
            .changes-table .new-value { color: #16a34a; }
            .footer { background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { margin: 4px 0; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} Asset ${config.label}</h1>
              <span class="action-badge">${data.itemType} Modification</span>
            </div>
            
            <div class="content">
              <div class="summary">
                <div class="summary-row">
                  <div class="summary-label">Asset:</div>
                  <div class="summary-value"><strong>${data.itemName}</strong></div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">Action:</div>
                  <div class="summary-value">${config.label}</div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">Performed By:</div>
                  <div class="summary-value">${data.userName}</div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">Date & Time:</div>
                  <div class="summary-value">${new Date(data.timestamp).toLocaleString('en-US', { 
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
              </div>

              ${additionalDetailsHtml ? `
              <div class="detail-grid">
                ${data.additionalInfo?.assetTag ? `
                <div class="detail-item">
                  <div class="label">Asset Tag</div>
                  <div class="value">${data.additionalInfo.assetTag}</div>
                </div>` : ''}
                ${data.additionalInfo?.category ? `
                <div class="detail-item">
                  <div class="label">Category</div>
                  <div class="value">${data.additionalInfo.category}</div>
                </div>` : ''}
                ${data.additionalInfo?.status ? `
                <div class="detail-item">
                  <div class="label">Status</div>
                  <div class="value">${data.additionalInfo.status}</div>
                </div>` : ''}
                ${data.additionalInfo?.location ? `
                <div class="detail-item">
                  <div class="label">Location</div>
                  <div class="value">${data.additionalInfo.location}</div>
                </div>` : ''}
                ${data.additionalInfo?.assignedTo ? `
                <div class="detail-item">
                  <div class="label">Assigned To</div>
                  <div class="value">${data.additionalInfo.assignedTo}</div>
                </div>` : ''}
                ${data.additionalInfo?.serialNumber ? `
                <div class="detail-item">
                  <div class="label">Serial Number</div>
                  <div class="value">${data.additionalInfo.serialNumber}</div>
                </div>` : ''}
              </div>` : ''}

              ${changeComparisonHtml}
            </div>
            
            <div class="footer">
              <p><strong>SRPH Management Information System</strong></p>
              <p>This is an automated notification. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`   📤 Calling sendEmail...`);
      
      // Log the attempt before sending
      await logEmailEvent({
        timestamp: new Date().toISOString(),
        to: settings.companyEmail,
        subject: subject,
        status: 'pending'
      });
      
      const result = await this.sendEmail({
        to: settings.companyEmail,
        subject,
        html
      });

      console.log(`   Result: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);

      // Log the final result
      if (result) {
        console.log(`   📧 Logging successful email to email_notifications.log`);
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings.companyEmail,
          subject,
          status: 'success',
          messageId: `modification-${data.itemType}-${Date.now()}`
        });
      } else {
        console.log(`   📧 Logging failed email to email_notifications.log`);
        await logEmailEvent({
          timestamp: new Date().toISOString(),
          to: settings.companyEmail,
          subject,
          status: 'failed',
          error: 'Email service returned false'
        });
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error sending modification notification:', error);
      console.log(`   📧 Logging error to email_notifications.log`);
      
      const subject = `[SRPH-MIS] ${data.action.toUpperCase()} - ${data.itemType}: ${data.itemName}`;
      await logEmailEvent({
        timestamp: new Date().toISOString(),
        to: settings?.companyEmail || 'N/A',
        subject: subject,
        status: 'failed',
        error: error.message || 'Unknown error'
      });
      return false;
    }
  }
}

export const emailService = new EmailService();
