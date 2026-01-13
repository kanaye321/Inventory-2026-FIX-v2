# SRPH-MIS System Features List

## 🔐 Authentication & Security
- Username/password login
- Two-Factor Authentication (MFA - mandatory)
- Microsoft Authenticator integration
- Session management
- Account lockout protection
- Password reset via email
- AES-256-GCM encryption
- Role-based access control (RBAC)
- Password complexity requirements
- Activity logging & audit trails

## 📦 Inventory Management

### Assets
- IT asset tracking
- Auto-generated asset tags
- Serial number tracking
- Status tracking
- Condition tracking
- Network details (IP, MAC, hostname)
- Technical specs tracking
- Checkout/Checkin workflows
- Warranty tracking
- Purchase & vendor information

### Components
- RAM, CPU, Storage tracking
- GPU, Motherboard, PSU tracking
- Serial numbers & warranty
- Parent asset linking
- Quantity management

### Accessories
- Peripherals tracking
- Condition tracking
- User assignment
- Checkout/Checkin capability

### Licenses
- Software license tracking
- License key storage (encrypted)
- Seat allocation
- Expiration monitoring
- User assignments
- Compliance reports

### IT Equipment
- Server tracking
- Networking equipment
- Serial number tracking
- Department assignment

### Monitor Inventory
- Model & specifications
- Screen size & resolution
- Connectivity tracking
- User assignment

## ☁️ Cloud Infrastructure

### Azure
- VM tracking
- Storage Accounts
- App Services
- Database tracking
- Network Resources
- Container Services

### GCP
- Compute Engine Instances
- Cloud Storage Buckets
- Cloud SQL Databases
- Kubernetes Engine (GKE)
- Cloud Functions

### AWS
- EC2 Instances
- S3 Buckets
- RDS Databases
- Lambda Functions
- ECS/EKS Containers

### Virtual Machines
- VM inventory tracking
- Resource allocation (CPU, RAM, Storage)
- Cloud platform support
- Expiration management
- Automated notifications

### Approval Monitoring
- Type classification
- Platform tracking
- PIC management
- Approval number tracking
- Status calculation
- Compliance reporting

## 🔍 Monitoring & Discovery

### VM Monitoring (Zabbix)
- Real-time VM monitoring
- CPU, Memory, Disk tracking
- Performance threshold alerts
- Dashboard widgets
- Alert management

### Network Discovery
- IP address scanning
- Hostname resolution
- Port scanning
- Service detection
- MAC address discovery
- Scheduled scans

### IAM Accounts
- Cloud platform IAM tracking
- Permission type tracking
- Approval management
- Expiration monitoring

### BitLocker Keys
- Recovery key storage (encrypted)
- Device identifier tracking
- Admin-only access
- Audit trail

## 👥 User Management
- User creation & editing
- Role assignment (Admin, Asset Manager, Department User, Read-Only)
- Granular permissions (View/Edit/Add/Delete per module)
- Department assignment
- Account activation/deactivation
- Bulk user import (CSV)
- Activity tracking

## ⚙️ Administration

### System Configuration
- Site settings
- Company information
- Email configuration (SMTP)
- Asset tag configuration
- Password policy
- Session timeout
- Notification settings

### Email & Notifications
- Asset checkout/checkin notifications
- Warranty expiration alerts
- License expiration alerts
- VM expiration notifications
- Approval expiration alerts
- System maintenance notifications

### Database Management
- PostgreSQL support
- Manual & automated backups
- Database optimization
- Performance monitoring
- Backup restoration

### Page Builder
- Dynamic page creation
- Custom database tables
- Column configuration
- Auto CRUD operations
- CSV import/export templates

## 📊 Reporting & Analytics
- Asset Inventory Reports
- Asset Utilization Reports
- License Compliance Reports
- VM Usage Analytics
- Approval Compliance Reports
- Audit Trail Reports
- Export formats (PDF, Excel, CSV, JSON)
- Dashboard widgets
- Real-time metrics
- Trend analysis

## 🔄 Operations

### Import/Export
- CSV import for all modules
- Template download
- Data validation
- Bulk operations
- CSV export with filters

### Activity Tracking
- User authentication logging
- Asset operation tracking
- Data modification logging
- Permission change tracking
- Immutable audit logs
- Real-time activity feed

### System Maintenance
- Daily database backups
- Weekly optimization
- Log rotation
- Session cleanup
- Health checks
- Performance monitoring

## 🆘 Support & Help
- User Manual
- Admin Guide
- Context-sensitive help
- Interactive tutorials
- Knowledge base
- FAQ section
- Chatbot assistant
- Troubleshooting guide

## 🔌 Integration & API
- RESTful API
- Zabbix integration
- JIRA integration
- Active Directory/LDAP
- Webhook support
- API authentication

## 🎨 User Interface
- Responsive design (desktop, tablet, mobile)
- Light/Dark mode
- 12 color themes
- Global search
- Quick action buttons
- Sortable data tables
- Pagination
- Real-time updates
- Toast notifications