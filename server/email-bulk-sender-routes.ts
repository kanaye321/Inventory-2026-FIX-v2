import type { Express, Request, Response } from "express";
import { emailService } from "./email-service";
import { storage } from "./storage";

export function registerEmailBulkSenderRoutes(app: Express, requireAuth: any) {

  // Send bulk emails with custom data per recipient
  app.post("/api/email-bulk-sender/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const { recipients, subject, bodyTemplate, ccAddresses } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          message: "Recipients array is required and cannot be empty"
        });
      }

      if (!subject || !bodyTemplate) {
        return res.status(400).json({
          message: "Subject and body template are required"
        });
      }

      console.log(`📧 Bulk email send initiated by user ${req.user?.id || 'unknown'}`);
      console.log(`📧 Recipients: ${recipients.length}, Subject: ${subject}`);

      // Ensure email service is initialized with SMTP configuration
      const emailInitialized = await emailService.initialize();
      if (!emailInitialized) {
        return res.status(500).json({
          message: "Email service not configured. Please configure SMTP settings in Email Notifications page.",
          success: false
        });
      }
      
      console.log('✅ Email service initialized successfully with SMTP configuration');

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each recipient
      for (const recipient of recipients) {
        try {
          const { email, customData } = recipient;

          if (!email || !email.includes('@')) {
            results.failed++;
            results.errors.push(`Invalid email address: ${email || 'missing'}`);
            continue;
          }

          // Replace placeholders in body template with custom data
          let personalizedBody = bodyTemplate;

          if (customData && typeof customData === 'object') {
            Object.keys(customData).forEach(key => {
              const placeholder = `{{${key}}}`;
              const value = customData[key] || '';
              // Use global regex to replace all occurrences
              personalizedBody = personalizedBody.split(placeholder).join(value);
            });
          }

          // Build email options using the same format as the existing email service
          const emailOptions: any = {
            to: email,
            subject: subject,
            html: personalizedBody
          };

          console.log(`📧 [Bulk Send] Preparing email for ${email}`);
          console.log(`   Subject: ${subject}`);
          console.log(`   Body length: ${personalizedBody.length} characters`);
          console.log(`   Email options:`, JSON.stringify({ to: email, subject }, null, 2));
          console.log(`📧 [Bulk Send] Sending email to ${email} using configured SMTP...`);

          // Use the existing email service's sendEmail method (uses SMTP from settings)
          const emailSent = await emailService.sendEmail(emailOptions);

          if (emailSent) {
            results.successful++;
            console.log(`✅ [Bulk Send] Email SUCCESSFULLY sent to ${email}`);
            console.log(`   ✉️  Recipient confirmed: ${email}`);
          } else {
            results.failed++;
            results.errors.push(`Failed to send to ${email} - Email service returned false`);
            console.log(`❌ [Bulk Send] FAILED to send to ${email}`);
            console.log(`   ⚠️  Email service returned false - check SMTP configuration`);
          }

        } catch (recipientError: any) {
          results.failed++;
          results.errors.push(`Error sending to ${recipient.email || 'unknown'}: ${recipientError.message}`);
          console.error(`❌ [Bulk Send] Error processing recipient:`, recipientError);
        }
      }

      // Log final results summary
      console.log(`\n📊 ========== BULK EMAIL SEND SUMMARY ==========`);
      console.log(`📧 Total Recipients: ${recipients.length}`);
      console.log(`✅ Successfully Sent: ${results.successful}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`📨 Subject: ${subject}`);
      
      if (results.successful > 0) {
        console.log(`\n✉️  EMAILS SENT TO THE FOLLOWING RECIPIENTS:`);
        recipients.forEach((recipient, index) => {
          const status = results.errors.some(err => err.includes(recipient.email)) ? '❌ FAILED' : '✅ SENT';
          console.log(`   ${index + 1}. ${status} - ${recipient.email}`);
        });
      }
      
      if (results.errors.length > 0) {
        console.log(`\n⚠️  ERRORS:`);
        results.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      console.log(`===============================================\n`);

      // Log activity with full email data for later reuse
      const activityMetadata = {
        subject,
        bodyTemplate,
        ccAddresses: ccAddresses || '',
        recipients,
        recipientCount: recipients.length
      };

      console.log('Saving activity with metadata to database...');

      await storage.createActivity({
        action: "bulk_email_send",
        itemType: "email-bulk-sender",
        itemId: 0,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Sent bulk email: ${subject} to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}. ${results.successful} successful, ${results.failed} failed.`,
        metadata: activityMetadata
      });

      console.log('✅ Activity saved to database');

      return res.json({
        success: true,
        message: `Bulk email completed: ${results.successful} sent, ${results.failed} failed`,
        results
      });

    } catch (error: any) {
      console.error('Error sending bulk emails:', error);
      return res.status(500).json({
        message: "Failed to send bulk emails",
        error: error.message
      });
    }
  });

  // Preview email with sample data
  app.post("/api/email-bulk-sender/preview", requireAuth, async (req: Request, res: Response) => {
    try {
      const { bodyTemplate, sampleData } = req.body;

      if (!bodyTemplate) {
        return res.status(400).json({
          message: "Body template is required"
        });
      }

      let previewBody = bodyTemplate;

      if (sampleData && typeof sampleData === 'object') {
        Object.keys(sampleData).forEach(key => {
          const placeholder = `{{${key}}}`;
          const value = sampleData[key] || '';
          previewBody = previewBody.replace(new RegExp(placeholder, 'g'), value);
        });
      }

      return res.json({
        preview: previewBody
      });

    } catch (error: any) {
      console.error('Error generating preview:', error);
      return res.status(500).json({
        message: "Failed to generate preview",
        error: error.message
      });
    }
  });

  // Get email sending history
  app.get("/api/email-bulk-sender/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();

      const emailHistory = activities
        .filter(activity => activity.itemType === 'email-bulk-sender')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50); // Last 50 bulk sends

      return res.json(emailHistory);

    } catch (error: any) {
      console.error('Error fetching email history:', error);
      return res.status(500).json({
        message: "Failed to fetch email history",
        error: error.message
      });
    }
  });
}