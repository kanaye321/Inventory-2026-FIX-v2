# SRPH-MIS Administrator Setup & Project Guide

## Quick Start

### Prerequisites
- Node.js 18+ or 20+ installed
- Git (for version control)
- Modern web browser (Chrome, Firefox, Edge)
- Administrative access to server/system

### Fastest Setup (Local Development)

1. **Navigate to Application Directory**
   ```bash
   cd "c:/MIS Inventory/Inventory Server - Port 3000"
   ```
   Or for the Port 5000 version:
   ```bash
   cd "c:/MIS Inventory/Inventory Server - Port 5000"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file with your settings:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/srph_mis
   SESSION_SECRET=your-secure-session-secret
   NODE_ENV=development
   PORT=3000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   Open browser to: `http://localhost:3000`

6. **Initial Login**
   Use the default administrator credentials:
   ```
   Username: admin
   Password: admin123
   ```

7. **Change Default Password**
   Navigate to Profile → Settings and update the default password immediately.

## Installation & Deployment

### Local Deployment (Recommended)

#### Advantages of Local Deployment
- Full control over the environment
- Direct access to logs and configuration
- Seamless integration with existing infrastructure

#### Setting Up for Production Locally

1. **Configure Environment Variables**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL=your_production_database_url
   SESSION_SECRET=your_super_secure_secret_key
   NODE_ENV=production
   PORT=3000
   ```

2. **Set Up Database**
   Use PostgreSQL or your preferred database:
   - Install PostgreSQL server
   - Create a database and user for SRPH-MIS
   - Update `DATABASE_URL` with connection details

3. **Build the Application**
   ```bash
   npm run build
   ```

4. **Start the Production Server**
   ```bash
   npm run start
   ```

### Windows Server Deployment

#### Windows Server Requirements
- Windows Server 2019/2022
- Node.js 18+ LTS
- IIS (optional, for reverse proxy)
- PostgreSQL 12+ (for production database)

#### Windows Server Setup Steps

1. **Install Node.js**
   Download and install Node.js LTS from `nodejs.org`

2. **Navigate to Application Directory**
   ```cmd
   cd "c:\MIS Inventory\Inventory Server - Port 3000"
   ```
   Or for the Port 5000 version:
   ```cmd
   cd "c:\MIS Inventory\Inventory Server - Port 5000"
   ```

3. **Install Dependencies**
   ```cmd
   npm install --production
   ```

4. **Configure Environment**
   Create `.env` file with production settings

5. **Start Application**
   ```cmd
   npm start
   ```
   Or use the Windows batch files:
   ```cmd
   start-windows-direct.bat
   ```

6. **Configure Windows Service (Optional)**
   For production, set up as a Windows Service using tools like `node-windows`

## System Configuration

### Initial System Setup

1. **Access Admin Panel**
   Navigate to **Administration → System Setup**

2. **General Settings**
   Configure:
   - Site name and URL
   - Default language and timezone
   - Public registration settings

3. **Company Information**
   Set up:
   - Organization name and address
   - Contact information
   - Company logo URL

4. **Email Configuration**
   Configure SMTP settings for notifications:
   ```
   SMTP Server: smtp.gmail.com
   Port: 587
   Security: TLS
   Username: your-email@domain.com
   Password: your-app-password
   ```

### Security Configuration

#### Password Policy
- Minimum length: 8 characters
- Require complexity (uppercase, lowercase, numbers, special chars)
- Password history prevention
- Regular password expiration

#### Session Security
- Session timeout: 120 minutes default
- Maximum login attempts: 5
- Account lockout duration: configurable
- Secure session storage

### Asset Management Configuration

- **Asset Tag Prefix:** Set default prefix (e.g., "SRPH")
- **Auto-increment:** Enable automatic asset tag generation
- **Checkout/Checkin:** Enable asset assignment workflows
- **Warranties:** Enable warranty tracking
- **Depreciation:** Enable asset depreciation calculations

### Notification Settings

| Notification Type | Description | Default |
|------------------|-------------|---------|
| Asset Checkout | Notify when assets are checked out | Enabled |
| Asset Checkin | Notify when assets are returned | Enabled |
| Warranty Expiration | Alert before warranties expire | 30 days before |
| License Expiration | Alert before licenses expire | 30 days before |
| System Maintenance | Notify about system maintenance | Enabled |

## User Management

### User Roles & Permissions

#### Administrator
- Full system access
- User management
- System configuration
- Database operations
- All permissions granted

#### Asset Manager
- Asset lifecycle management
- Checkout/checkin operations
- Inventory management
- Component & accessory management
- License assignment

#### Department User
- View department assets
- Request asset assignments
- Limited editing capabilities
- Department-specific access

#### Read-Only User
- View-only access
- No editing capabilities
- Limited to assigned resources
- Reporting access

### Creating and Managing Users

1. **Access User Management**
   Navigate to **Administration → User Management**

2. **Add New User**
   Click "Add User" and fill in:
   - Username (unique identifier)
   - First and last name
   - Email address
   - Department assignment
   - Initial password

3. **Set Role and Permissions**
   Choose from predefined roles or set custom permissions:
   - Assets: View, Edit, Add permissions
   - Components: View, Edit, Add permissions
   - Users: View, Edit, Add permissions
   - Reports: View, Edit, Add permissions
   - Admin: View, Edit, Add permissions

4. **Configure Account Settings**
   Set:
   - Account activation status
   - Force password change on first login
   - Email notification preferences

### Permission System Overview

| Module | View | Edit | Add | Description |
|--------|------|------|-----|-------------|
| Assets | ✓ | ✓ | ✓ | Hardware inventory management |
| Components | ✓ | ✓ | ✓ | Internal hardware parts |
| Accessories | ✓ | ✓ | ✓ | Peripheral devices |
| Licenses | ✓ | ✓ | ✓ | Software license management |
| Users | ✓ | ✓ | ✓ | User account management |
| VM Monitoring | ✓ | ✓ | ✓ | Virtual machine oversight |
| Network Discovery | ✓ | ✓ | ✓ | Network device scanning |
| BitLocker Keys | ✓ | ✓ | ✓ | Recovery key management |
| Reports | ✓ | ✓ | ✓ | System reporting |
| Admin | ✓ | ✓ | ✓ | System administration |

## System Administration

### Database Management

⚠️ **Warning:** Database operations can affect system availability. Always perform during maintenance windows and ensure backups are current.

#### Database Operations

1. **Access Database Management**
   Navigate to **Administration → Database**

2. **View Database Status**
   Check:
   - Connection status
   - Database size and table counts
   - Last backup information
   - Performance metrics

3. **Manual Backup Creation**
   Click "Create Backup" and provide description

4. **Backup Restoration**
   Upload backup file and confirm restoration

5. **Database Optimization**
   Run maintenance tasks:
   - Index rebuilding
   - Statistics updates
   - Cleanup old logs

#### Automatic Tasks
- Daily database backups
- Weekly system optimization
- Log rotation and cleanup
- Session cleanup
- Cache clearing

#### Performance Monitoring
- Database query performance
- Memory usage tracking
- CPU utilization
- Network bandwidth
- Storage capacity

### System Settings Management

**Configuration Access:** System settings are managed through the web interface at **Administration → System Setup**. Changes are stored in the database and applied immediately.

#### Key Configuration Areas
- **General Settings:** Site name, URL, language, timezone
- **Company Information:** Organization details, logo, contact info
- **Email Configuration:** SMTP settings for notifications
- **Asset Settings:** Tag prefixes, workflow configurations
- **Security Settings:** Password policies, session management
- **Notification Settings:** Email alerts and timing

### Log Management

| Log Type | Location | Retention | Purpose |
|----------|----------|-----------|---------|
| Application Logs | Console/File | 30 days | General application activity |
| Activity Logs | Database | 1 year | User actions and system events |
| Error Logs | Console/File | 90 days | System errors and exceptions |
| Security Logs | Database | 1 year | Authentication and permission events |
| Backup Logs | File System | 6 months | Backup and restore operations |

## Monitoring & Discovery Systems

### Virtual Machine Monitoring Setup

**Zabbix Integration:** SRPH-MIS integrates with Zabbix monitoring system to provide real-time VM performance data and automated alerting.

#### Configuring VM Monitoring

1. **Access VM Monitoring**
   Navigate to **Monitoring → VM Monitoring**

2. **Configure Zabbix Connection**
   In the Settings tab, enter:
   ```
   Zabbix URL: http://107.105.168.201/zabbix
   API Key: [Generate from Zabbix Administration]
   Sync Interval: 5 minutes
   Alert Thresholds: CPU (80%), Memory (85%), Disk (90%)
   ```

3. **Test Connection**
   Click "Test Connection" to verify API access

4. **Enable Auto-sync**
   Turn on automatic synchronization

5. **Configure Alerts**
   Set up email notifications for critical events

### Network Discovery Configuration

⚠️ **Security Note:** Network discovery scans should be performed during maintenance windows. Ensure proper authorization before scanning production networks.

#### Running Network Discovery

1. **Access Network Discovery**
   Navigate to **Monitoring → Network Discovery**

2. **Configure Scan Parameters**
   Set up scan with:
   ```
   Target Subnets: 192.168.1.0/24 (CIDR format)
   Port Ranges: 22,80,443,3389 (common services)
   DNS Servers: 107.105.134.9, 107.105.134.8
   Timeout: 5 seconds
   Retry Count: 3
   ```

3. **Start Discovery Scan**
   Click "Start Scan" and monitor progress

4. **Review Results**
   Examine discovered devices and services

5. **Generate Reports**
   Export discovery results for documentation

### BitLocker Key Management

🔒 **Security Critical:** BitLocker recovery keys provide access to encrypted drives. Access is restricted to authorized security personnel only.

#### Key Management Functions
- **Secure Storage:** Centralized storage of recovery keys
- **Asset Association:** Link keys to specific devices and users
- **Access Logging:** Complete audit trail of key access
- **Emergency Access:** Quick key retrieval for urgent situations
- **Search Capabilities:** Find keys by device identifier

#### Recovery Process
1. Verify user identity and authorization level
2. Locate device in BitLocker Keys module
3. Retrieve associated recovery key
4. Provide key to authorized user
5. Log key access event for audit trail
6. Monitor for successful drive recovery

## Backup & Recovery

### Backup Strategy

#### Automated Backups
- Daily automatic database backups
- Configurable retention period (default: 30 days)
- Email notifications for backup status
- Automatic integrity verification

#### Manual Backups
- On-demand backup creation
- Custom backup descriptions
- Progress monitoring
- Download backup files

### Backup Configuration

1. **Access Database Management**
   Navigate to **Administration → Database**

2. **Configure Automatic Backups**
   Set up scheduled backups:
   ```
   Schedule: Daily at 2:00 AM
   Retention: 30 days
   Notification Email: admin@yourorg.com
   Compression: Enabled
   Verification: Enabled
   ```

3. **Test Backup Process**
   Create a manual backup to verify configuration

4. **Monitor Backup Status**
   Review backup logs and notifications

### Recovery Procedures

⚠️ **Recovery Warning:** Database restoration will replace all current data. Ensure you have a recent backup before proceeding with any recovery operation.

#### Full System Recovery

1. **Stop Application**
   Shut down the SRPH-MIS application to prevent data conflicts

2. **Access Recovery Interface**
   Navigate to **Administration → Database → Recovery**

3. **Select Backup File**
   Choose from available backups or upload external backup

4. **Verify Backup Integrity**
   System will verify backup file before restoration

5. **Confirm Restoration**
   Review restoration details and confirm operation

6. **Monitor Progress**
   Watch restoration progress and check for errors

7. **Restart Application**
   Start SRPH-MIS and verify system functionality

8. **Verify Data Integrity**
   Check critical data and functionality

### Disaster Recovery Planning

| Scenario | Recovery Time | Data Loss | Procedure |
|----------|---------------|-----------|-----------|
| Application Crash | 5 minutes | None | Restart application service |
| Database Corruption | 30 minutes | Up to 24 hours | Restore from latest backup |
| Server Hardware Failure | 2-4 hours | Up to 24 hours | Deploy to new server, restore backup |
| Complete Site Disaster | 4-8 hours | Up to 24 hours | Deploy to alternative site, restore backup |

## Troubleshooting

### Common Issues & Solutions

#### Application Won't Start

**Port Already in Use**
- Symptoms: Error about port 3000 being busy
- Solutions:
  ```bash
  # Find process using port 3000
  netstat -ano | findstr :3000

  # Kill the process (Windows)
  taskkill /PID [process_id] /F

  # Kill the process (Linux/Mac)
  kill -9 [process_id]
  ```

**Database Connection Failed**
- Symptoms: Cannot connect to database
- Solutions:
  - Check DATABASE_URL in environment
  - Verify database server is running
  - Test connection manually
  - Check firewall settings
  - Verify credentials

#### Performance Issues

**Slow Page Loading**
- Causes & Solutions:
  - Large datasets: Implement pagination
  - Database queries: Optimize with indexes
  - Network latency: Check connection speed
  - Server resources: Monitor CPU/Memory

**High Memory Usage**
- Solutions:
  - Restart application service
  - Clear application cache
  - Check for memory leaks
  - Optimize database queries
  - Increase server resources

### Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| AUTH_001 | Invalid credentials | Reset password or check account status |
| AUTH_002 | Account locked | Unlock account in user management |
| DB_001 | Database connection failed | Check database server and connection string |
| DB_002 | Query timeout | Optimize query or increase timeout |
| PERM_001 | Insufficient permissions | Grant appropriate permissions to user |
| SYS_001 | Configuration error | Review system configuration settings |

### Log Analysis

**Log Locations:**
- Application logs: Browser console and server console
- Activity logs: Administration → Activities
- Error logs: Check browser developer tools
- System logs: Server console output

#### Common Log Patterns
```
# Successful login
[INFO] User 'admin' logged in successfully

# Permission denied
[WARN] User 'user1' denied access to assets.add

# Database error
[ERROR] Database connection failed: timeout

# Backup completed
[INFO] Database backup completed: backup-2025-01-15.sql
```

### Getting Support

#### Internal Support
- Check system logs and error messages
- Review user manual and documentation
- Contact your system administrator
- Submit ticket through internal help desk

#### Technical Support
- Gather system information and logs
- Document error reproduction steps
- Check for known issues and updates
- Contact development team if needed

### Maintenance Schedule

| Task | Frequency | Duration | Impact |
|------|-----------|----------|--------|
| Database Backup | Daily (2:00 AM) | 5-15 minutes | None |
| System Updates | Monthly | 30-60 minutes | System downtime |
| Database Optimization | Weekly (Sunday 3:00 AM) | 15-30 minutes | Reduced performance |
| Log Cleanup | Daily (1:00 AM) | 2-5 minutes | None |
| Security Patches | As needed | 15-45 minutes | System downtime |

## Getting Started Checklist

### Initial Setup
- [ ] Install Node.js 18+
- [ ] Clone repository
- [ ] Install dependencies with `npm install`
- [ ] Create `.env` file with configuration
- [ ] Start development server with `npm run dev`
- [ ] Access application at `http://localhost:3000`
- [ ] Login with admin/admin123
- [ ] Change default password

### System Configuration
- [ ] Configure company information
- [ ] Set up email SMTP settings
- [ ] Configure asset tag prefix
- [ ] Set password policies
- [ ] Configure notification preferences
- [ ] Test backup creation

### User Management
- [ ] Create department users
- [ ] Assign appropriate permissions
- [ ] Test user login and access
- [ ] Configure user notifications
- [ ] Document user roles and responsibilities

### Monitoring Setup
- [ ] Configure Zabbix integration (if applicable)
- [ ] Set up network discovery parameters
- [ ] Test monitoring functionality
- [ ] Configure alert thresholds
- [ ] Set up automated reporting

### Production Deployment
- [ ] Set up PostgreSQL database
- [ ] Configure production environment variables
- [ ] Test backup and restore procedures
- [ ] Set up automated backups
- [ ] Configure SSL/TLS (if applicable)
- [ ] Test disaster recovery procedures

## Contact Information

**Primary Support Contact:**
- Nikkel Jimenez
- System Developer & Administrator
- Knox ID: `jimenez.n`

**Support Priority Levels:**
- **Critical Issues:** 2-4 hours response (system unavailable, security breaches)
- **High Priority:** 8-24 hours response (major functionality impacted)
- **Medium Priority:** 1-3 business days response (minor issues, enhancements)
- **Low Priority:** 3-5 business days response (documentation, suggestions)

---

*This guide is continuously updated to reflect new features and improvements. If you have suggestions for additional documentation or notice any inaccuracies, please contact the support team.*

**Document Information:**
- Version: 2.0
- Last Updated: January 2025
- System Version: SRPH-MIS Local Deployment Release
- Document Type: Complete Administrator & Setup Manual