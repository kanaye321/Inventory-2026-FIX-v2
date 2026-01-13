
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SYSTEM_KNOWLEDGE = `
You are a helpful assistant for the SRPH-MIS (San Roque Philippine Hospital - Management Information System) web application.

SYSTEM OVERVIEW:
SRPH-MIS is an enterprise-grade platform providing comprehensive inventory management, monitoring, and security features for IT infrastructure management.

KEY FEATURES & MODULES:

1. DASHBOARD
   - Real-time system metrics and status cards
   - Recent activity timeline
   - Quick action shortcuts
   - JIRA integration widgets
   - Customizable widget layout

2. ASSET MANAGEMENT
   - Track computers, servers, and major equipment
   - Checkout/Checkin workflows
   - Asset lifecycle tracking
   - Warranty and maintenance tracking
   - CSV bulk import
   - Asset tagging with auto-generation
   - Serial number tracking
   - Location management

3. INVENTORY MODULES
   - Components: Internal hardware parts (RAM, CPU, hard drives)
   - Accessories: Peripheral devices (keyboards, mice, monitors)
   - Consumables: Supplies (toner, paper, batteries)
   - IT Equipment: General IT equipment inventory
   - Monitor Inventory: Dedicated monitor tracking

4. LICENSE MANAGEMENT
   - Software license tracking
   - License key storage
   - Seat allocation
   - Expiration monitoring
   - User assignment
   - Automated expiration alerts

5. VIRTUAL MACHINE MANAGEMENT
   - VM Inventory: Track all virtual machines with owner, platform, resources
   - VM Monitoring: Real-time status via Zabbix integration
   - Cloud platform support (AWS, Azure, GCP, etc.)
   - Resource allocation tracking (CPU, RAM, Storage)
   - Expiration date management
   - Automated notifications

6. NETWORK DISCOVERY
   - Automated network device scanning
   - IP address and hostname detection
   - MAC address tracking
   - Open port and service discovery
   - Network topology visualization
   - DNS server configuration (default: 107.105.134.9, 107.105.134.8)
   - CIDR subnet scanning

7. SECURITY FEATURES
   - BitLocker Keys: Secure recovery key management with encryption
   - IAM Accounts: Cloud platform IAM account tracking
   - Role-based access control (RBAC)
   - Granular permission system (View, Edit, Add per module)
   - Data encryption for PII (AES-256-GCM)
   - Audit trail and activity logs
   - Secure authentication

8. USER MANAGEMENT
   - User Roles: Administrator, Asset Manager, Department User, Read-Only User
   - Granular Permissions: Configure per-module access (View, Edit, Add)
   - Department assignment
   - Account status management
   - Activity tracking

9. MONITORING & INTEGRATION
   - Zabbix Integration: Real-time VM performance monitoring
   - JIRA Integration: Issue tracking and dashboard widgets
   - Email Notifications: Automated alerts for expirations
   - Performance metrics (CPU, Memory, Disk)
   - Alert management

10. ADMINISTRATION
    - System Setup: Configure site settings, email, notifications
    - Database Management: Backup, restore, optimization
    - Data Encryption: Manage PII encryption
    - System Logs: View application logs
    - Email Notifications: Configure SMTP and alerts
    - User Permissions: Manage user access

COMMON TASKS:

Asset Management:
1. Add Asset: Assets → Add Asset → Fill details (name, category, serial number, etc.) → Submit
2. Checkout: Select asset → Checkout → Choose user → Set dates → Submit
3. Checkin: Select asset → Checkin → Add notes → Submit
4. Import Assets: Assets → Import CSV → Upload file

User Management:
1. Add User: Users → Add User → Enter details → Set role → Assign permissions → Submit
2. Edit Permissions: Admin → User Permissions → Select user → Configure module access
3. View Activities: Users → Activities → Filter by user/date

VM Management:
1. Add VM: VM Inventory → Add VM → Enter host details, VM config, assignment → Submit
2. Monitor VMs: VM Monitoring → View real-time status and metrics
3. Configure Zabbix: VM Monitoring → Settings → Enter Zabbix URL and API key
4. Decommission VM: VM Inventory → Select VM → Decommission

Network Discovery:
1. Run Scan: Network Discovery → Configure parameters (subnet, ports) → Start Scan
2. View Results: Review discovered devices, services, and configurations
3. Export Data: Generate reports for documentation

BitLocker Keys:
1. Add Key: BitLocker Keys → Add Key → Enter serial number, identifier, recovery key → Submit
2. Search Keys: Use search by serial number or device identifier
3. Access Log: All key access is logged for audit trail

License Management:
1. Add License: Licenses → Add License → Enter name, key, seats, expiration → Submit
2. Assign License: Select license → Assign to user
3. Track Expiration: View expiration alerts on dashboard

ADMIN TASKS:

System Configuration:
1. System Setup: Admin → System Setup → Configure company info, email, settings
2. Email Config: Set SMTP server, port, credentials for notifications
3. Notification Settings: Enable/disable alerts for various events

Database Management:
1. Backup: Admin → Database → Create Backup → Enter description
2. Restore: Admin → Database → Upload backup file → Confirm restoration
3. Optimization: Regular maintenance tasks (indexes, statistics, cleanup)

Data Encryption:
1. Enable: Set ENCRYPTION_KEY in environment/secrets
2. Encrypt Data: Admin → Data Encryption → Encrypt All Data
3. Decrypt Data: Admin → Data Encryption → Decrypt All Data

User Permissions:
1. Configure: Admin → User Permissions → Select user
2. Set Permissions: Choose View, Edit, Add for each module
3. Save Changes: Apply and optionally notify user

SECURITY & ACCESS:

Default Admin Account:
- Username: admin
- Password: admin123
- ⚠️ Change password immediately after first login

User Roles:
- Administrator: Full system access, user management, configuration
- Asset Manager: Asset lifecycle, checkout/checkin, maintenance
- Department User: View department assets, request assignments
- Read-Only User: View-only access to assigned resources

Module Permissions:
Each user can have View, Edit, Add permissions for:
- Assets, Components, Accessories, Licenses
- Users, VM Monitoring, Network Discovery
- BitLocker Keys, IAM Accounts
- Reports, Admin Settings

TECHNICAL DETAILS:

Ports & Access:
- Default Port: 3000
- External Access: Configured via port forwarding
- Network Discovery Ports: 22, 80, 443, 3389 (configurable)

Integrations:
- Zabbix URL: http://107.105.168.201/zabbix
- DNS Servers: 107.105.134.9, 107.105.134.8
- JIRA: Configurable API integration

Encryption:
- Algorithm: AES-256-GCM
- PII Encryption: Email, names, serial numbers, recovery keys
- Knox IDs: Not encrypted for searchability
- Default: Encryption disabled (enable via ENCRYPTION_KEY)

Notifications:
- Asset expiration alerts
- License expiration (30 days before)
- VM expiration notices
- IAM account expiration
- System modification alerts
- Email templates customizable

SUPPORT & DOCUMENTATION:

Primary Contact:
- Nikkel Jimenez (jimenez.n)
- System Developer & Administrator

Resources:
- User Manual: Available at /user-manual
- Admin Guide: Available at /admin-confluence-guide.html
- Report Issue: /report-issue
- System Settings: /settings

Response Times:
- Critical: 2-4 hours (system down, security breach)
- High: 8-24 hours (major functionality impacted)
- Medium: 1-3 days (minor issues, enhancements)
- Low: 3-5 days (documentation, suggestions)

TROUBLESHOOTING:

Common Issues:
1. Can't Log In: Check credentials, clear cache, verify account not locked
2. Session Expires: Check timeout settings, enable cookies
3. Missing Data: Check filters, permissions, archived status
4. Slow Performance: Check connection, clear cache, reduce items per page
5. Checkout Failed: Verify asset status, user permissions, availability

Error Codes:
- AUTH_001: Invalid credentials
- AUTH_002: Account locked
- PERM_001: Insufficient permissions
- DB_001: Database connection failed
- DB_002: Query timeout

Browser Compatibility:
- Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- JavaScript must be enabled
- Ad blockers may interfere

This chatbot can help you with any questions about features, tasks, administration, troubleshooting, or general system usage. Ask me anything!
`;

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 **Welcome to SRPH-MIS Assistant!**\n\nI\'m your comprehensive guide to the system. I can help you with:\n\n' +
               '• **Step-by-step instructions** for any task\n' +
               '• **Detailed explanations** of features\n' +
               '• **Troubleshooting** common issues\n' +
               '• **Best practices** and tips\n\n' +
               '**Just ask me using keywords like:**\n' +
               '"how to", "what is", "setup", "add", "create", "manage", etc.\n\n' +
               'Try: "How do I checkout an asset?" or "What is VM monitoring?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract keywords for better matching
    const keywords = lowerMessage.split(/\s+/).filter(word => word.length > 2);
    const hasKeyword = (terms: string[]) => terms.some(term => 
      keywords.includes(term) || lowerMessage.includes(term)
    );

    // Pattern matching for common questions with comprehensive responses
    if (hasKeyword(['asset', 'assets']) && hasKeyword(['add', 'create', 'new'])) {
      return '**Adding a New Asset - Complete Guide**\n\n' +
             '📋 **Step-by-Step Process:**\n' +
             '1. Navigate to the "Assets" page from the sidebar\n' +
             '2. Click the "Add Asset" button in the top right\n' +
             '3. Fill in the required information:\n' +
             '   • Asset Name (required)\n' +
             '   • Category (Computer, Server, Equipment, etc.)\n' +
             '   • Serial Number (for warranty tracking)\n' +
             '   • Model, Manufacturer, Purchase Date\n' +
             '   • Location and Department\n' +
             '   • Asset Tag (auto-generated or custom)\n' +
             '4. Click "Submit" to save\n\n' +
             '💡 **Quick Tips:**\n' +
             '• Use CSV import for bulk asset creation\n' +
             '• Asset tags are auto-generated but can be customized\n' +
             '• All assets are immediately available for checkout after creation\n' +
             '• You can attach warranty information and documents';
    }

    if (hasKeyword(['checkout', 'check-out', 'assign'])) {
      return '**Asset Checkout - Complete Guide** 📋\n\n' +
             '**Step-by-Step Process:**\n' +
             '1. Navigate to the Assets page from the sidebar\n' +
             '2. Find and click on the asset you want to checkout\n' +
             '3. Click the "Checkout" button in the asset details\n' +
             '4. Fill in the checkout form:\n' +
             '   • Select the user who will use the asset\n' +
             '   • Set the checkout date (defaults to today)\n' +
             '   • Set expected checkin/return date\n' +
             '   • Add any notes or special instructions\n' +
             '5. Click "Submit" to complete checkout\n\n' +
             '**What Happens Next:**\n' +
             '• Asset status changes to "Checked Out"\n' +
             '• User assignment is tracked in the system\n' +
             '• Activity is logged with timestamp\n' +
             '• Email notification sent (if enabled)\n' +
             '• Due date reminders will be sent\n\n' +
             '**Bulk Checkout:** You can checkout multiple assets to the same user by selecting them and using the bulk action feature.';
    }

    if (lowerMessage.includes('checkin') || lowerMessage.includes('check in') || lowerMessage.includes('return')) {
      return 'To checkin an asset:\n1. Navigate to the asset details page\n2. Click the "Checkin" button\n3. Add any notes about the asset condition\n4. Click "Submit"\n\nThe asset will be marked as available again.';
    }

    if (lowerMessage.includes('user') && (lowerMessage.includes('add') || lowerMessage.includes('create'))) {
      return 'To add a new user:\n1. Go to the "Users" page\n2. Click "Add User"\n3. Enter user details (first name, last name, email, Knox ID, etc.)\n4. Set the user role (Admin or User)\n5. Optionally assign a department\n6. Click "Submit"\n\nNote: Only administrators can create new users.';
    }

    if (lowerMessage.includes('license')) {
      return 'License Management:\n- View all licenses in the "Licenses" page\n- Add new licenses with name, key, seats, and expiration date\n- Assign licenses to users\n- Track available seats\n- Monitor expiration dates\n\nThe system will notify you when licenses are about to expire.';
    }

    if (lowerMessage.includes('vm') || lowerMessage.includes('virtual machine')) {
      return 'VM Management features:\n- VM Inventory: Track all virtual machines with details like owner, platform, resources\n- VM Monitoring: Real-time status monitoring of VMs\n- Set expiration dates and get notifications\n- Track cloud platforms (AWS, Azure, GCP, etc.)\n- Monitor resource allocation (CPU, RAM, Storage)\n\nNavigate to VM Inventory or VM Monitoring from the Infrastructure section.';
    }

    if (lowerMessage.includes('bitlocker')) {
      return 'BitLocker Keys Management:\n- Securely store BitLocker recovery keys\n- Associate keys with specific assets\n- Track key creation dates\n- Search and filter keys\n- All keys are encrypted for security\n\nAccess this from the Security section in the sidebar.';
    }

    if (lowerMessage.includes('iam') || lowerMessage.includes('cloud')) {
      return 'IAM Account Management:\n- Track IAM accounts across cloud platforms (AWS, Azure, GCP)\n- Monitor permissions and access levels\n- Set expiration dates for temporary access\n- Automated notifications for expiring accounts\n- Link to approval IDs and requestors\n\nFind this in the Security section.';
    }

    if (lowerMessage.includes('report')) {
      return 'Reports & Analytics:\n- Generate various reports (assets, users, licenses, etc.)\n- Export data to CSV or PDF\n- View activities and audit logs\n- Track asset utilization\n- Monitor license compliance\n\nAccess the Reports page from the Reporting section.';
    }

    if (lowerMessage.includes('email') || lowerMessage.includes('notification')) {
      return 'Email Notifications:\n- Automated alerts for asset/license/VM expirations\n- IAM account expiration notices\n- System modification notifications\n- Configure email settings in Admin > System Setup\n- View notification logs in Admin > Email Notifications\n\nEnable/disable specific notification types in system settings.';
    }

    if (lowerMessage.includes('admin') || lowerMessage.includes('settings')) {
      return 'Admin Features:\n- User Management: Create and manage user accounts\n- System Setup: Configure system-wide settings\n- Database Management: Backup and restore\n- Data Encryption: Manage encrypted data\n- System Logs: View application logs\n- JIRA Settings: Configure integration\n- Email Notifications: Configure alerts\n\nAccess admin features from the Admin section (requires admin role).';
    }

    if (lowerMessage.includes('jira')) {
      return 'JIRA Integration:\n- Configure JIRA connection in Admin > JIRA Settings\n- View JIRA dashboard with issue metrics\n- Report issues directly to JIRA\n- Track issue status and priority\n- Customizable widgets on dashboard\n\nRequires JIRA API credentials to be configured.';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('manual') || lowerMessage.includes('guide')) {
      return 'Help Resources:\n- User Manual: Comprehensive guide in the Help section\n- Report an Issue: Submit problems directly through the system\n- Settings: Customize your preferences\n- Contact Support: Use the Report Issue feature\n\nYou can also ask me specific questions about any feature!';
    }

    if (lowerMessage.includes('monitor inventory')) {
      return 'Monitor Inventory:\n- Track monitors separately from other assets\n- Store details like brand, model, size, resolution\n- Track serial numbers and asset tags\n- Monitor assignment status\n- Import monitors via CSV\n\nAccess from the Inventory section in the sidebar.';
    }

    if (lowerMessage.includes('network discovery')) {
      return 'Network Discovery:\n- Scan network for devices\n- Discover IP addresses, hostnames, MAC addresses\n- View network topology\n- Dashboard with network statistics\n- Track device types and status\n\nAccess from the Infrastructure section.';
    }

    // Handle specific unknown topics
    if (hasKeyword(['help', 'support', 'assist', 'guide'])) {
      return '**I\'m here to help you with SRPH-MIS!** 🤖\n\n' +
             'I can provide comprehensive answers about:\n\n' +
             '**📦 Inventory & Assets:**\n' +
             '• Asset Management (add, checkout, checkin, track)\n' +
             '• Components, Accessories, Consumables\n' +
             '• Monitor Inventory\n' +
             '• IT Equipment tracking\n\n' +
             '**👥 Users & Security:**\n' +
             '• User Management & Permissions\n' +
             '• BitLocker Keys (recovery key management)\n' +
             '• IAM Accounts (cloud access tracking)\n' +
             '• Role-based access control\n\n' +
             '**🖥️ Infrastructure:**\n' +
             '• VM Inventory & Monitoring\n' +
             '• Network Discovery\n' +
             '• Zabbix Integration\n\n' +
             '**🔧 Administration:**\n' +
             '• License Management\n' +
             '• Email Notifications\n' +
             '• Reports & Analytics\n' +
             '• JIRA Integration\n' +
             '• System Settings\n\n' +
             '**Just ask me anything using keywords like:**\n' +
             '"how to checkout asset", "add user", "monitor VM", "setup email", etc.';
    }

    // Default response for truly unknown queries
    return `**I'm not sure about that specific topic.** 🤔\n\n` +
           `However, I can help you with:\n\n` +
           `**Core Features:**\n` +
           `• Asset Management (add, checkout, checkin, import)\n` +
           `• User & Permission Management\n` +
           `• License & Software Tracking\n` +
           `• VM Inventory & Real-time Monitoring\n` +
           `• Network Discovery & Scanning\n` +
           `• BitLocker Recovery Keys\n` +
           `• IAM Cloud Accounts\n` +
           `• Reports & Analytics\n` +
           `• Email Notifications\n` +
           `• JIRA Integration\n\n` +
           `**Try asking:**\n` +
           `• "How do I [action] [feature]?" (e.g., "How do I checkout an asset?")\n` +
           `• "What is [feature]?" (e.g., "What is VM monitoring?")\n` +
           `• "Setup/Configure [feature]" (e.g., "Setup email notifications")\n\n` +
           `If you need help with something not listed, please contact support at jimenez.n@samsung.com`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const responseText = await generateResponse(input);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-6 w-96 h-[600px] shadow-2xl z-40 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              SRPH-MIS Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2 whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask me anything about the system..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
