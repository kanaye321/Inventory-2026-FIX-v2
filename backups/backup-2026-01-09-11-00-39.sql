-- =============================================
-- Manual PostgreSQL Database Backup
-- =============================================
-- Created: 2026-01-09T11:00:39.073Z
-- Created By: admin
-- Database: srph_mis
-- =============================================


-- =============================================
-- Table: users
-- Total Records: 1
-- =============================================

TRUNCATE TABLE users CASCADE;

INSERT INTO users (id, username, password, first_name, last_name, email, is_admin, department, role_id, mfa_secret, mfa_enabled, force_password_change, permissions, created_at, updated_at) VALUES (1, 'admin', 'c57d86f0aa0c220839e803baa76c7fe0a029c8f844b76d2af6cc7231d329fa86e208b27f7bcc30ea4dbde716888ae0e3837f909c2819d017a138a0b76a834dc1.00fc2aff37a9aaa98bced047af65eee0', 'Admin', 'User', 'admin@srph.com', TRUE, 'IT', NULL, 'JFNC6IZUOFYUCULCERYUSJJ2IF2EQQRWOFZGW23FKJNC4PDIIRSA', TRUE, FALSE, '{"admin":{"add":false,"edit":false,"view":false},"users":{"add":false,"edit":false,"view":false},"assets":{"add":false,"edit":false,"view":true},"reports":{"add":false,"edit":false,"view":true},"licenses":{"add":false,"edit":false,"view":true},"components":{"add":false,"edit":false,"view":true},"accessories":{"add":false,"edit":false,"view":true},"consumables":{"add":false,"edit":false,"view":true},"vmMonitoring":{"add":false,"edit":false,"view":true},"bitlockerKeys":{"add":false,"edit":false,"view":false},"networkDiscovery":{"add":false,"edit":false,"view":true}}', '2026-01-09 16:50:57.071868', '2026-01-09 16:50:57.071868'); 

-- Completed users: 1 rows exported


-- =============================================
-- Table: assets
-- Total Records: 3
-- =============================================

TRUNCATE TABLE assets CASCADE;

INSERT INTO assets (id, asset_tag, name, description, category, status, condition, purchase_date, purchase_cost, location, serial_number, model, manufacturer, notes, knox_id, ip_address, mac_address, os_type, assigned_to, checkout_date, expected_checkin_date, finance_updated, department) VALUES (2, 'teste', 'teste', '', 'Desktop', 'available', 'Good', '', '', '', 'teste', 'teste', '', '', '', '', '', '', NULL, NULL, NULL, FALSE, ''); 
INSERT INTO assets (id, asset_tag, name, description, category, status, condition, purchase_date, purchase_cost, location, serial_number, model, manufacturer, notes, knox_id, ip_address, mac_address, os_type, assigned_to, checkout_date, expected_checkin_date, finance_updated, department) VALUES (3, 'dasd', 'dad', '', 'Laptop', 'On-Hand', 'Bad', '', '', '', 'vxcvdvwv', 'ewrer', '', '', '', '', '', '', NULL, NULL, NULL, FALSE, ''); 
INSERT INTO assets (id, asset_tag, name, description, category, status, condition, purchase_date, purchase_cost, location, serial_number, model, manufacturer, notes, knox_id, ip_address, mac_address, os_type, assigned_to, checkout_date, expected_checkin_date, finance_updated, department) VALUES (1, 'dasda', 'test', '', 'Laptop', 'Deployed', 'Good', '', '', '', 'test', 'test', '', '', 'sdasda', '', '', '', 1, '2026-01-09', NULL, FALSE, ''); 

-- Completed assets: 3 rows exported


-- =============================================
-- Table: activities
-- Total Records: 10
-- =============================================

TRUNCATE TABLE activities CASCADE;

INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (1, 'create', 'gcp-resource', 7, 1, '2026-01-09T10:48:43.203Z', 'GCP Resource created: test'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (2, 'create', 'asset', 1, 1, '2026-01-09T10:49:50.089Z', 'Asset test (test) created'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (3, 'create', 'asset', 2, 1, '2026-01-09T10:50:17.974Z', 'Asset teste (teste) created'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (4, 'create', 'asset', 3, 1, '2026-01-09T10:50:35.600Z', 'Asset dad (dasd) created'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (5, 'update', 'asset', 1, 1, '2026-01-09T10:50:59.560Z', 'Asset test (dasda) updated'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (6, 'checkout', 'asset', 1, 1, '2026-01-09T10:50:59.570Z', 'Asset automatically checked out to KnoxID: sdasda'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (7, 'checkout', 'asset', 1, 1, '2026-01-09T10:50:59.571Z', 'Asset automatically checked out to KnoxID: sdasda'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (8, 'import', 'iam-accounts', 0, 1, '2026-01-09T10:51:25.267Z', 'Imported undefined IAM accounts, 5 failed.'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (9, 'update', 'gcp-inventory', 7, 1, '2026-01-09T10:55:01.379Z', 'Updated GCP resource: test'); 
INSERT INTO activities (id, action, item_type, item_id, user_id, timestamp, notes) VALUES (10, 'update', 'azure-inventory', 3, 1, '2026-01-09T10:55:18.408Z', 'Updated Azure resource: FSZXS'); 

-- Completed activities: 10 rows exported


-- =============================================
-- Table: monitor_inventory
-- Total Records: 2
-- =============================================

TRUNCATE TABLE monitor_inventory CASCADE;

INSERT INTO monitor_inventory (id, seat_number, knox_id, asset_number, serial_number, model, remarks, department, created_at, updated_at) VALUES (1, 'A001', 'KNOX001', 'MON-001', 'SN123456789', 'Dell P2414H', 'Primary monitor for workstation', 'IT Department', '2026-01-09 18:52:19.113619+08', '2026-01-09 18:52:19.113619+08'); 
INSERT INTO monitor_inventory (id, seat_number, knox_id, asset_number, serial_number, model, remarks, department, created_at, updated_at) VALUES (2, 'B002', 'KNOX002', 'MON-002', 'SN987654321', 'HP E24 G4', 'Secondary monitor', 'Finance Department', '2026-01-09 18:52:19.167102+08', '2026-01-09 18:52:19.167102+08'); 

-- Completed monitor_inventory: 2 rows exported


-- =============================================
-- Table: azure_inventory
-- Total Records: 3
-- =============================================

TRUNCATE TABLE azure_inventory CASCADE;

INSERT INTO azure_inventory (id, name, type, resource_group, location, subscriptions, status, remarks, created_at, updated_at) VALUES (3, 'FSZXS', 'S', 'FSFS', 'SAD', 'DSAD', 'active', 'JHJHJ', '2026-01-09 10:55:11.684', '2026-01-09 10:55:18.388'); 
INSERT INTO azure_inventory (id, name, type, resource_group, location, subscriptions, status, remarks, created_at, updated_at) VALUES (4, 'example-vm', 'Virtual Machine', 'production-rg', 'East US', 'prod-subscription', 'active', 'Production server - Example: test@email.com, 10.0.0.1', '2026-01-09 10:55:28.932', '2026-01-09 10:55:28.932'); 
INSERT INTO azure_inventory (id, name, type, resource_group, location, subscriptions, status, remarks, created_at, updated_at) VALUES (5, 'example-storage', 'Storage Account', 'production-rg', 'West US', 'prod-subscription', 'active', 'Storage for backups: data.backup@company.com', '2026-01-09 10:55:28.934', '2026-01-09 10:55:28.934'); 

-- Completed azure_inventory: 3 rows exported


-- =============================================
-- Table: gcp_inventory
-- Total Records: 1
-- =============================================

TRUNCATE TABLE gcp_inventory CASCADE;

INSERT INTO gcp_inventory (id, name, resource_type, project_id, display_name, location, status, remarks, created_at, updated_at, project_name, resource_name, zone, resource_id) VALUES (7, 'test', 'test', 'test', 'test', 'test', 'active', '4
45
5454', '2026-01-09 10:48:43.189', '2026-01-09 10:55:01.357', NULL, NULL, NULL, NULL); 

-- Completed gcp_inventory: 1 rows exported


-- =============================================
-- Table: aws_inventory
-- Total Records: 2
-- =============================================

TRUNCATE TABLE aws_inventory CASCADE;

INSERT INTO aws_inventory (id, identifier, service, type, region, account_name, account_id, status, remarks, created_at, updated_at) VALUES (1, 'i-1234567890abcdef0', 'EC2', 't3.medium', 'us-east-1', 'Production Account', '123456789012', 'active', 'Production web server - Contact: admin@example.com', '2026-01-09 18:48:14.444904', '2026-01-09 18:48:14.444904'); 
INSERT INTO aws_inventory (id, identifier, service, type, region, account_name, account_id, status, remarks, created_at, updated_at) VALUES (2, 'db-instance-1', 'RDS', 'db.t3.micro', 'us-west-2', 'Production Account', '123456789012313131', 'active', 'Database instance for application', '2026-01-09 18:48:14.486746', '2026-01-09 10:54:54.211'); 

-- Completed aws_inventory: 2 rows exported


-- =============================================
-- Table: system_settings
-- Total Records: 1
-- =============================================

TRUNCATE TABLE system_settings CASCADE;

INSERT INTO system_settings (id, site_name, company_name, auto_backup, auto_optimize, backup_time, optimize_time, retention_days, email_notifications, notify_on_iam_expiration, notify_on_vm_expiration, session_timeout, created_at, updated_at) VALUES (1, 'SRPH-MIS', 'SRPH', FALSE, FALSE, '03:00', '04:00', 30, TRUE, TRUE, TRUE, 1800, '2026-01-09 18:46:39.535555', '2026-01-09 18:46:39.535555'); 

-- Completed system_settings: 1 rows exported


-- ERROR backing up table zabbix_settings:
-- relation "zabbix_settings" does not exist


-- ERROR backing up table zabbix_subnets:
-- relation "zabbix_subnets" does not exist


-- =============================================
-- Table: azure_historical_data
-- Total Records: 3
-- =============================================

TRUNCATE TABLE azure_historical_data CASCADE;

INSERT INTO azure_historical_data (id, resource_id, name, type, resource_group, location, subscriptions, status, remarks, change_type, month_year, created_at) VALUES (1, 1, 'example-vm', 'Virtual Machine', 'production-rg', 'East US', 'prod-subscription', 'active', 'Production server - Example: test@email.com, 10.0.0.1', 'imported', '2026-01', '2026-01-09 08:54:11.748'); 
INSERT INTO azure_historical_data (id, resource_id, name, type, resource_group, location, subscriptions, status, remarks, change_type, month_year, created_at) VALUES (2, 2, 'example-storage', 'Storage Account', 'production-rg', 'West US', 'prod-subscription', 'active', 'Storage for backups: data.backup@company.com', 'imported', '2026-01', '2026-01-09 08:54:11.754'); 
INSERT INTO azure_historical_data (id, resource_id, name, type, resource_group, location, subscriptions, status, remarks, change_type, month_year, created_at) VALUES (3, 3, 'FSZXS', 'S', 'FSFS', 'SAD', 'DSAD', 'active', 'JHJHJ', 'deleted', '2026-01', '2026-01-09 10:55:28.936'); 

-- Completed azure_historical_data: 3 rows exported


-- =============================================
-- Backup Summary
-- =============================================
-- Total Tables Backed Up: 9/29
-- Total Records: 26
-- Backup Completed: 2026-01-09T11:00:39.576Z
-- =============================================
