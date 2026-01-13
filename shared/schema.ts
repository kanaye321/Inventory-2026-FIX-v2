import { pgTable, text, serial, integer, boolean, timestamp, json, real, bigint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  department: text("department"),
  isAdmin: boolean("is_admin").default(false),
  roleId: integer("role_id"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"),
  forcePasswordChange: boolean("force_password_change").default(false),
  permissions: json("permissions").$type<UserPermissions>().default({
    assets: { view: true, edit: false, add: false },
    components: { view: true, edit: false, add: false },
    accessories: { view: true, edit: false, add: false },
    consumables: { view: true, edit: false, add: false },
    licenses: { view: true, edit: false, add: false },
    users: { view: false, edit: false, add: false },
    reports: { view: true, edit: false, add: false },
    vmMonitoring: { view: true, edit: false, add: false },
    networkDiscovery: { view: true, edit: false, add: false },
    bitlockerKeys: { view: false, edit: false, add: false },
    admin: { view: false, edit: false, add: false }
  }),
});

// Permission types
export type PagePermission = {
  view: boolean;
  edit: boolean;
  add: boolean;
};

export type UserPermissions = {
  assets: PagePermission;
  components: PagePermission;
  accessories: PagePermission;
  consumables: PagePermission;
  licenses: PagePermission;
  users: PagePermission;
  reports: PagePermission;
  vmMonitoring: PagePermission;
  networkDiscovery: PagePermission;
  bitlockerKeys: PagePermission;
  admin: PagePermission;
};

// Asset schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetTag: text("asset_tag").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  status: text("status").notNull(), // available, deployed, pending, overdue, archived, defective , reserved
  condition: text("condition").notNull().default("Good"), // Good, Bad
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  location: text("location"),
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  notes: text("notes"),
  knoxId: text("knox_id"),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  osType: text("os_type"),
  assignedTo: integer("assigned_to").references(() => users.id),
  checkoutDate: text("checkout_date"),
  expectedCheckinDate: text("expected_checkin_date"),
  financeUpdated: boolean("finance_updated").default(false),
  department: text("department"),
});

// Components schema
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  status: text("status").default("available"),
  description: text("description"),
  location: text("location"),
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  warrantyExpiry: text("warranty_expiry"),
  assignedTo: text("assigned_to"),
  dateReleased: text("date_released"),
  dateReturned: text("date_returned"),
  releasedBy: text("released_by"),
  returnedTo: text("returned_to"),
  specifications: text("specifications"),
  notes: text("notes"),
});

// Accessories schema
export const accessories = pgTable("accessories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(), // available, borrowed, returned, defective
  quantity: integer("quantity").notNull().default(1),
  description: text("description"),
  location: text("location"),
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  assignedTo: integer("assigned_to").references(() => users.id),
  knoxId: text("knox_id"),  // Added KnoxID field
  dateReleased: text("date_released"),
  dateReturned: text("date_returned"),
  releasedBy: text("released_by"),
  returnedTo: text("returned_to"),
  notes: text("notes"),
});

// Consumables schema
export const consumables = pgTable("consumables", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default('available'), // available, in_use
  location: text("location"),
  modelNumber: text("model_number"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  notes: text("notes"),
});

// Licenses schema
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  seats: text("seats"),
  assignedSeats: integer("assigned_seats").default(0),
  company: text("company"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  expirationDate: text("expiration_date"),
  purchaseCost: text("purchase_cost"),
  status: text("status").notNull(), // active, expired, unused
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
});

// License Assignments schema
export const licenseAssignments = pgTable("license_assignments", {
  id: serial("id").primaryKey(),
  licenseId: integer("license_id").references(() => licenses.id).notNull(),
  assignedTo: text("assigned_to").notNull(),
  notes: text("notes"),
  assignedDate: text("assigned_date").notNull(),
});

// Consumable Assignments schema
export const consumableAssignments = pgTable("consumable_assignments", {
  id: serial("id").primaryKey(),
  consumableId: integer("consumable_id").references(() => consumables.id).notNull(),
  assignedTo: text("assigned_to").notNull(),
  serialNumber: text("serial_number"),
  knoxId: text("knox_id"),
  quantity: integer("quantity").notNull().default(1),
  assignedDate: text("assigned_date").notNull(),
  returnedDate: text("returned_date"),
  status: text("status").notNull().default('assigned'), // assigned, returned
  notes: text("notes"),
});

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // checkout, checkin, create, delete
  itemType: text("item_type").notNull(), // asset, user, license, component, accessory
  itemId: integer("item_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  timestamp: text("timestamp").notNull(),
  notes: text("notes"),
});

// VM Inventory schema
export const vmInventory = pgTable("vm_inventory", {
  id: serial("id").primaryKey(),

  // Core VM Information
  vmId: text("vm_id"),
  vmName: text("vm_name").notNull(),
  vmStatus: text("vm_status").notNull().default('Active'), // Active, Overdue - Not Notified, Overdue - Notified, Decommissioned
  vmIp: text("vm_ip"),
  vmOs: text("vm_os"),
  cpuCount: integer("cpu_count").default(0),
  memoryGB: integer("memory_gb").default(0),
  diskCapacityGB: integer("disk_capacity_gb").default(0),

  // Request and Approval Information
  requestor: text("requestor"),
  knoxId: text("knox_id"),
  department: text("department"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  jiraNumber: text("jira_number"),
  approvalNumber: text("approval_number"),
  remarks: text("remarks"),
  cpuCount: integer("cpu_count").default(0),
  memoryGB: integer("memory_gb").default(0),
  diskCapacityGB: integer("disk_capacity_gb").default(0),
  internetAccess: boolean("internet_access").default(false),
  vmOsVersion: text("vm_os_version"),
  hypervisor: text("hypervisor"),
  hostName: text("host_name"),
  hostModel: text("host_model"),
  hostIp: text("host_ip"),
  hostOs: text("host_os"),
  rack: text("rack"),
  deployedBy: text("deployed_by"),
  user: text("user"),
  jiraTicket: text("jira_ticket"),
  dateDeleted: text("date_deleted"),
  guestOs: text("guest_os"),
  powerState: text("power_state"),
  memoryMB: integer("memory_mb"),
  diskGB: integer("disk_gb"),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  vmwareTools: text("vmware_tools"),
  cluster: text("cluster"),
  datastore: text("datastore"),

  // Legacy compatibility fields
  status: text("status").default('available'),
  assignedTo: integer("assigned_to").references(() => users.id),
  location: text("location"),
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  createdDate: text("created_date"),
  lastModified: text("last_modified"),
  notes: text("notes"),
});

// VM Table - for proper VM management and assignments
export const vms = pgTable("vms", {
  id: serial("id").primaryKey(),
  vmName: text("vm_name").notNull(),
  hostName: text("host_name").notNull(),
  guestOs: text("guest_os").notNull(),
  powerState: text("power_state").notNull().default("stopped"),
  cpuCount: integer("cpu_count").default(1),
  memoryMB: integer("memory_mb").default(1024),
  diskGB: integer("disk_gb").default(20),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  vmwareTools: text("vmware_tools"),
  cluster: text("cluster"),
  datastore: text("datastore"),
  status: text("status").notNull().default("available"), // available, deployed, maintenance
  assignedTo: integer("assigned_to").references(() => users.id),
  location: text("location"),
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  purchaseDate: text("purchase_date"),
  purchaseCost: text("purchase_cost"),
  department: text("department"),
  description: text("description"),
  createdDate: text("created_date").default(new Date().toISOString()),
  lastModified: text("last_modified").default(new Date().toISOString()),
  notes: text("notes"),
});



// Status and category enums - moved before usage
export const AssetStatus = {
  AVAILABLE: "available",
  DEPLOYED: "Deployed",
  PENDING: "pending",
  ON_HAND: "On-Hand",
  RESERVED: "Reserved",
} as const;

export const AccessoryStatus = {
  AVAILABLE: "available",
  BORROWED: "borrowed",
  RETURNED: "returned",
  DEFECTIVE: "defective",
} as const;

export const ConsumableStatus = {
  AVAILABLE: "available",
  IN_USE: "in_use",
} as const;

export const LicenseStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  UNUSED: "unused",
} as const;

export const AssetCategories = {
  LAPTOP: "Laptop",
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  MONITOR: "Monitor",
  TABLET: "Tablet",
  ACCESSORY: "Accessory",
  LICENSE: "License",
  OTHER: "Other",
} as const;

export const AssetConditions = {
  GOOD: "Good",
  BAD: "Bad",
} as const;

export const ActivityTypes = {
  CHECKOUT: "checkout",
  CHECKIN: "checkin",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type AssetStatusType = typeof AssetStatus[keyof typeof AssetStatus];
export type AccessoryStatusType = typeof AccessoryStatus[keyof typeof AccessoryStatus];
export type ConsumableStatusType = typeof ConsumableStatus[keyof typeof ConsumableStatus];
export type LicenseStatusType = typeof LicenseStatus[keyof typeof LicenseStatus];
export type AssetCategoryType = typeof AssetCategories[keyof typeof AssetCategories];
export type AssetConditionType = typeof AssetConditions[keyof typeof AssetConditions];
export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// IT Equipment table
export const itEquipment = pgTable("it_equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  totalQuantity: integer("total_quantity"),
  assignedQuantity: integer("assigned_quantity").default(0),
  model: text("model"),
  location: text("location"),
  dateAcquired: text("date_acquired"),
  knoxId: text("knox_id"),
  serialNumber: text("serial_number"),
  dateRelease: text("date_release"),
  remarks: text("remarks"),
  status: text("status").default("available"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// IT Equipment Assignments table
export const itEquipmentAssignments = pgTable("it_equipment_assignments", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => itEquipment.id).notNull(),
  assignedTo: text("assigned_to").notNull(),
  knoxId: text("knox_id"),
  serialNumber: text("serial_number"),
  quantity: integer("quantity").notNull().default(1),
  assignedDate: text("assigned_date").notNull(),
  returnedDate: text("returned_date"),
  status: text("status").notNull().default('assigned'), // assigned, returned
  notes: text("notes"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAssetSchema = z.object({
  assetTag: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(Object.values(AssetCategories) as [string, ...string[]]),
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]),
  condition: z.enum(Object.values(AssetConditions) as [string, ...string[]]),
  purchaseDate: z.string().optional(),
  purchaseCost: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  notes: z.string().optional(),
  knoxId: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  osType: z.string().optional(),
  department: z.string().optional(),
});
export const insertComponentSchema = createInsertSchema(components).omit({ id: true });
export const insertAccessorySchema = createInsertSchema(accessories).omit({ id: true });
export const insertConsumableSchema = createInsertSchema(consumables).omit({ id: true });
export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true });
export const insertLicenseAssignmentSchema = createInsertSchema(licenseAssignments).omit({ id: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertVmInventorySchema = createInsertSchema(vmInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// VM Approval History table
export const vmApprovalHistory = pgTable("vm_approval_history", {
  id: serial("id").primaryKey(),
  vmId: integer("vm_id").notNull().references(() => vmInventory.id, { onDelete: "cascade" }),
  oldApprovalNumber: text("old_approval_number"),
  newApprovalNumber: text("new_approval_number"),
  changedBy: integer("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vmApprovalHistorySchema = createSelectSchema(vmApprovalHistory);
export const insertVmApprovalHistorySchema = createInsertSchema(vmApprovalHistory).omit({
  id: true,
  createdAt: true,
});

export type VmInventory = typeof vmInventory.$inferSelect;
export type InsertVmInventory = typeof vmInventorySchema._type;
export type VmApprovalHistory = typeof vmApprovalHistory.$inferSelect;
export type InsertVmApprovalHistory = z.infer<typeof insertVmApprovalHistorySchema>;
export type ConsumableAssignment = typeof consumableAssignments.$inferSelect;

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type InsertAccessory = z.infer<typeof insertAccessorySchema>;
export type InsertConsumable = z.infer<typeof insertConsumableSchema>;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type InsertLicenseAssignment = z.infer<typeof insertLicenseAssignmentSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertConsumableAssignment = z.infer<typeof insertConsumableAssignmentSchema>;
export type ITEquipmentAssignment = typeof itEquipmentAssignments.$inferSelect;
export type InsertITEquipmentAssignment = z.infer<typeof insertITEquipmentAssignmentSchema>;

// Monitor Inventory schema
export const monitorInventory = pgTable("monitor_inventory", {
  id: serial("id").primaryKey(),
  seatNumber: text("seat_number").default(null),
  knoxId: text("knox_id").default(null),
  assetNumber: text("asset_number").default(null),
  serialNumber: text("serial_number").default(null),
  model: text("model").default(null),
  remarks: text("remarks").default(null),
  department: text("department").default(null),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMonitorInventorySchema = createInsertSchema(monitorInventory).omit({ id: true });

export type MonitorInventory = typeof monitorInventory.$inferSelect;
export type InsertMonitorInventory = z.infer<typeof insertMonitorInventorySchema>;

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  // General Settings
  siteName: text("site_name").notNull().default("SRPH-MIS"),
  siteUrl: text("site_url").notNull().default(""),
  defaultLanguage: text("default_language").notNull().default("en"),
  defaultTimezone: text("default_timezone").notNull().default("UTC"),
  allowPublicRegistration: boolean("allow_public_registration").default(false),

  // Company Information
  companyName: text("company_name").notNull().default("SRPH"),
  companyAddress: text("company_address").default(""),
  companyPhone: text("company_phone").default(""),
  companyEmail: text("company_email").default(""),
  companyLogo: text("company_logo").default(""),

  // Email Configuration
  mailDriver: text("mail_driver").default(""),
  mailHost: text("mail_host").default(""),
  mailPort: text("mail_port").default(""),
  mailUsername: text("mail_username").default(""),
  mailPassword: text("mail_password").default(""),
  mailFromAddress: text("mail_from_address").default(""),
  mailFromName: text("mail_from_name").default(""),

  // Asset Settings
  assetTagPrefix: text("asset_tag_prefix").default("SRPH"),
  assetTagZeros: integer("asset_tag_zeros").default(5),
  assetAutoIncrement: boolean("asset_auto_increment").default(true),
  assetCheckoutPolicy: text("asset_checkout_policy").default(""),
  assetCheckoutDuration: integer("asset_checkout_duration").default(30),

  // Security Settings
  enableLoginAttempts: boolean("enable_login_attempts").default(true),
  maxLoginAttempts: integer("max_login_attempts").default(5),
  lockoutDuration: integer("lockout_duration").default(30),
  passwordMinLength: integer("password_min_length").default(8),
  requireSpecialChar: boolean("require_special_char").default(true),
  requireUppercase: boolean("require_uppercase").default(true),
  requireNumber: boolean("require_number").default(true),
  passwordExpiryDays: integer("password_expiry_days").default(90),

  // Notification Settings
  enableAdminNotifications: boolean("enable_admin_notifications").default(true),
  enableUserNotifications: boolean("enable_user_notifications").default(true),
  notifyOnCheckout: boolean("notify_on_checkout").default(true),
  notifyOnCheckin: boolean("notify_on_checkin").default(true),
  notifyOnOverdue: boolean("notify_on_overdue").default(true),
  notifyOnIamExpiration: boolean("notify_on_iam_expiration").default(true),
  notifyOnVmExpiration: boolean("notify_on_vm_expiration").default(true),
  notifyOnItEquipmentChanges: boolean("notify_on_it_equipment_changes").default(true),
  notifyOnUserChanges: boolean("notify_on_user_changes").default(true),
  notifyOnVmInventoryChanges: boolean("notify_on_vm_inventory_changes").default(true),
  notifyOnIamAccountChanges: boolean("notify_on_iam_account_changes").default(true),
  notifyOnGcpChanges: boolean("notify_on_gcp_changes").default(true),
  notifyOnAzureChanges: boolean("notify_on_azure_changes").default(true),
  notifyOnApprovalExpiration: boolean("notify_on_approval_expiration").default(true),
  sessionTimeout: integer("session_timeout").default(1800), // Default to 30 minutes
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings);

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

// Zabbix Settings schema
export const zabbixSettings = pgTable("zabbix_settings", {
  id: serial("id").primaryKey(),
  serverUrl: text("server_url").notNull().default(""),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  apiToken: text("api_token").default(""),
  lastSync: timestamp("last_sync"),
  syncInterval: integer("sync_interval").default(30), // in minutes
  enabled: boolean("enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Zabbix Subnet schema for monitoring ranges
export const zabbixSubnets = pgTable("zabbix_subnets", {
  id: serial("id").primaryKey(),
  cidrRange: text("cidr_range").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Discovered hosts schema
export const discoveredHosts = pgTable("discovered_hosts", {
  id: serial("id").primaryKey(),
  hostname: text("hostname"),
  ipAddress: text("ip_address").notNull(),
  macAddress: text("mac_address"),
  status: text("status").notNull().default("new"), // new, imported, ignored
  lastSeen: timestamp("last_seen").defaultNow(),
  source: text("source").notNull().default("zabbix"), // zabbix, network_scan
  systemInfo: json("system_info").default({}),
  hardwareDetails: json("hardware_details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// VM Monitoring schema
export const vmMonitoring = pgTable("vm_monitoring", {
  id: serial("id").primaryKey(),
  vmId: integer("vm_id").notNull(),
  hostname: text("hostname"),
  ipAddress: text("ip_address"),
  status: text("status"),
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
  diskUsage: real("disk_usage"),
  uptime: integer("uptime"),
  networkStatus: text("network_status"),
  osName: text("os_name"),
  cpuCores: integer("cpu_cores"),
  totalMemory: bigint("total_memory", { mode: "number" }),
  totalDisk: bigint("total_disk", { mode: "number" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Azure Inventory schema
export const azureInventory = pgTable("azure_inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  resourceGroup: text("resource_group").notNull(),
  location: text("location").notNull(),
  subscriptions: text("subscriptions"),
  status: text("status").notNull().default("active"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GCP Inventory schema
export const gcpInventory = pgTable("gcp_inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  resourceType: text("resource_type").notNull(),
  projectId: text("project_id").notNull(),
  displayName: text("display_name").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("active"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertAzureInventorySchema = createInsertSchema(azureInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertGcpInventorySchema = createInsertSchema(gcpInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Azure Historical Data schema
export const azureHistoricalData = pgTable("azure_historical_data", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  resourceGroup: text("resource_group").notNull(),
  location: text("location").notNull(),
  subscriptions: text("subscriptions").notNull(),
  status: text("status").notNull(),
  remarks: text("remarks"),
  changeType: text("change_type").notNull(), // 'deleted', 'updated', 'imported'
  monthYear: text("month_year").notNull(), // Format: 'YYYY-MM'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GCP Historical Data schema
export const gcpHistoricalData = pgTable("gcp_historical_data", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id"),
  name: text("name").notNull(),
  resourceType: text("resource_type").notNull(),
  projectId: text("project_id").notNull(),
  displayName: text("display_name").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull(),
  remarks: text("remarks"),
  changeType: text("change_type").notNull(), // 'deleted', 'updated', 'imported'
  monthYear: text("month_year").notNull(), // Format: 'YYYY-MM'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertAzureHistoricalDataSchema = createInsertSchema(azureHistoricalData).omit({
  id: true,
  createdAt: true
});

export const insertGcpHistoricalDataSchema = createInsertSchema(gcpHistoricalData).omit({
  id: true,
  createdAt: true
});

// Types
export type AzureInventory = typeof azureInventory.$inferSelect;
export type InsertAzureInventory = z.infer<typeof insertAzureInventorySchema>;
export type GcpInventory = typeof gcpInventory.$inferSelect;
export type InsertGcpInventory = z.infer<typeof insertGcpInventorySchema>;
export type AzureHistoricalData = typeof azureHistoricalData.$inferSelect;
export type InsertAzureHistoricalData = z.infer<typeof insertAzureHistoricalDataSchema>;
export type GcpHistoricalData = typeof gcpHistoricalData.$inferSelect;
export type InsertGcpHistoricalData = z.infer<typeof insertGcpHistoricalDataSchema>;

// Approval Monitoring
export const approvalMonitoring = pgTable("approval_monitoring", {
  id: serial("id").primaryKey(),
  type: text("type"),
  platform: text("platform"),
  pic: text("pic"),
  ipAddress: text("ip_address"),
  hostnameAccounts: text("hostname_accounts"),
  identifierSerialNumber: text("identifier_serial_number"),
  approvalNumber: text("approval_number"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApprovalMonitoringSchema = createInsertSchema(approvalMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ApprovalMonitoring = typeof approvalMonitoring.$inferSelect;
export type InsertApprovalMonitoring = z.infer<typeof insertApprovalMonitoringSchema>;

// Custom Pages for Page Builder
export const customPages = pgTable("custom_pages", {
  id: serial("id").primaryKey(),
  pageName: text("page_name").notNull().unique(),
  pageSlug: text("page_slug").notNull().unique(),
  tableName: text("table_name").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("FileText"),
  isActive: boolean("is_active").default(true),
  columns: json("columns").notNull(),
  filters: json("filters").default([]),
  sortConfig: json("sort_config").default({ field: "id", direction: "asc" }),
  paginationConfig: json("pagination_config").default({ pageSize: 10, enabled: true }),
  importExportEnabled: boolean("import_export_enabled").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomPageSchema = createInsertSchema(customPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CustomPage = typeof customPages.$inferSelect;
export type InsertCustomPage = z.infer<typeof insertCustomPageSchema>;

// Monitoring Platform Tables
export const monitoringDashboards = pgTable("monitoring_dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  refreshInterval: integer("refresh_interval").default(30),
  tags: text("tags"), // JSON string
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const monitoringPanels = pgTable("monitoring_panels", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => monitoringDashboards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // line, bar, pie, gauge, stat, table, etc.
  datasource: text("datasource").notNull(),
  query: text("query").notNull(),
  refreshInterval: integer("refresh_interval").default(30),
  width: integer("width").default(6),
  height: integer("height").default(300),
  xPos: integer("x_pos").default(0),
  yPos: integer("y_pos").default(0),
  thresholds: text("thresholds"), // JSON string
  unit: text("unit"),
  decimals: integer("decimals").default(2),
  showLegend: boolean("show_legend").default(true),
  colorScheme: text("color_scheme").default("default"),
  config: text("config"), // JSON string for additional config
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const monitoringAlertRules = pgTable("monitoring_alert_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  datasource: text("datasource").notNull(),
  query: text("query").notNull(),
  condition: text("condition").notNull(), // gt, lt, eq, ne
  threshold: real("threshold").notNull(),
  evaluationInterval: integer("evaluation_interval").default(60),
  forDuration: integer("for_duration").default(300),
  severity: text("severity").default("medium"), // critical, high, medium, low, info
  enabled: boolean("enabled").default(true),
  notificationChannels: text("notification_channels"), // JSON string
  annotations: text("annotations"), // JSON string
  labels: text("labels"), // JSON string
  state: text("state").default("normal"), // normal, firing, pending
  lastEvaluation: text("last_evaluation"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const monitoringDatasources = pgTable("monitoring_datasources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // zabbix, prometheus, influxdb, mysql, etc.
  url: text("url").notNull(),
  access: text("access").default("proxy"), // proxy, direct
  basicAuth: boolean("basic_auth").default(false),
  basicAuthUser: text("basic_auth_user"),
  basicAuthPassword: text("basic_auth_password"),
  database: text("database"),
  jsonData: text("json_data"), // JSON string for type-specific config
  secureJsonFields: text("secure_json_fields"), // JSON string for secure fields
  isDefault: boolean("is_default").default(false),
  status: text("status").default("pending"), // pending, connected, error
  lastCheck: text("last_check"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const monitoringAlerts = pgTable("monitoring_alerts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  datasource: text("datasource").notNull(),
  query: text("query").notNull(),
  condition: text("condition").notNull(), // gt, lt, eq, ne
  threshold: real("threshold").notNull(),
  evaluationInterval: integer("evaluation_interval").default(60),
  forDuration: integer("for_duration").default(300),
  severity: text("severity").default("medium"), // critical, high, medium, low, info
  enabled: boolean("enabled").default(true),
  notificationChannels: text("notification_channels").array(),
  annotations: text("annotations"), // JSON string
  labels: text("labels"), // JSON string
  state: text("state").default("normal"), // normal, pending, firing
  lastEvaluation: text("last_evaluation"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const monitoringNotifications = pgTable("monitoring_notifications", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").notNull(),
  type: text("type").notNull(), // email, webhook, slack, etc.
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"), // pending, sent, failed
  sentAt: text("sent_at"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

// Insert schemas for new tables
export const insertZabbixSettingsSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().min(5).max(1440).default(60),
  alertsEnabled: z.boolean().default(true),
  criticalThreshold: z.number().min(1).max(100).default(90),
  warningThreshold: z.number().min(1).max(100).default(75),
});
export const insertZabbixSubnetSchema = createInsertSchema(zabbixSubnets).omit({ id: true });
export const insertDiscoveredHostSchema = createInsertSchema(discoveredHosts).omit({ id: true });
export const insertVMMonitoringSchema = createInsertSchema(vmMonitoring).omit({ id: true });

// Bitlocker Keys schema
export const bitlockerKeys = pgTable("bitlocker_keys", {
  id: serial("id").primaryKey(),
  serialNumber: text("serial_number").notNull(),
  identifier: text("identifier").notNull(),
  recoveryKey: text("recovery_key").notNull(),
  notes: text("notes"),
  dateAdded: timestamp("date_added").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertBitlockerKeySchema = createInsertSchema(bitlockerKeys).omit({ id: true });

// Types for new schemas
export type ZabbixSettings = typeof zabbixSettings.$inferSelect;
export type ZabbixSubnet = typeof zabbixSubnets.$inferSelect;
export type DiscoveredHost = typeof discoveredHosts.$inferSelect;
export type VMMonitoring = typeof vmMonitoring.$inferSelect;
export type BitlockerKey = typeof bitlockerKeys.$inferSelect;

export type InsertZabbixSettings = z.infer<typeof insertZabbixSettingsSchema>;
export type InsertZabbixSubnet = z.infer<typeof insertZabbixSubnetSchema>;
export type InsertDiscoveredHost = z.infer<typeof insertDiscoveredHostSchema>;
export type InsertVMMonitoring = z.infer<typeof insertVMMonitoringSchema>;
export type InsertBitlockerKey = z.infer<typeof insertBitlockerKeySchema>;

// Approval Number History schema
export const approvalNumberHistory = pgTable("approval_number_history", {
  id: serial("id").primaryKey(),
  vmInventoryId: integer("vm_inventory_id").references(() => vmInventory.id).notNull(),
  oldApprovalNumber: text("old_approval_number"),
  newApprovalNumber: text("new_approval_number"),
  changedBy: integer("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  reason: text("reason"),
  notes: text("notes"),
});

// IAM Accounts schema
export const iamAccounts = pgTable('iam_accounts', {
  id: serial('id').primaryKey(),
  requestor: text('requestor').notNull(),
  knoxId: text('knox_id').notNull(),
  name: text('name'),
  userKnoxId: text('user_knox_id'),
  permission: text('permission').notNull(),
  durationStartDate: text('duration_start_date'),
  durationEndDate: text('duration_end_date'),
  cloudPlatform: text('cloud_platform').notNull(),
  projectAccounts: text('project_accounts'),
  approvalId: text('approval_id'),
  remarks: text('remarks'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// IAM Account Approval History schema
export const iamAccountApprovalHistory = pgTable('iam_account_approval_history', {
  id: serial('id').primaryKey(),
  iamAccountId: integer('iam_account_id').references(() => iamAccounts.id).notNull(),
  approvalNumber: text('approval_number').notNull(),
  duration: text('duration'),
  action: text('action').notNull(),
  actedBy: text('acted_by').notNull(),
  actedAt: timestamp('acted_at').defaultNow().notNull()
});

export const insertApprovalNumberHistorySchema = createInsertSchema(approvalNumberHistory).omit({ id: true });

export const insertIamAccountSchema = createInsertSchema(iamAccounts, {
  requestor: z.string().nullable().optional(),
  knoxId: z.string().nullable().optional(),
  name: z.string().nullable().optional(), // Added for the new name field
  userKnoxId: z.string().nullable().optional(), // Added for the new userKnoxId field
  permission: z.string().nullable().optional(),
  durationStartDate: z.string().nullable().optional(),
  durationEndDate: z.string().nullable().optional(),
  cloudPlatform: z.string().nullable().optional(),
  projectAccounts: z.string().nullable().optional(),
  approvalId: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  status: z.enum(["active", "expired_not_notified", "expired_notified", "extended", "access_removed"]).default("active").optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIamAccountApprovalHistorySchema = createInsertSchema(iamAccountApprovalHistory).omit({
  id: true,
  actedAt: true
});

export type ApprovalNumberHistory = typeof approvalNumberHistory.$inferSelect;
export type InsertApprovalNumberHistory = z.infer<typeof insertApprovalNumberHistorySchema>;
export type IamAccount = typeof iamAccounts.$inferSelect;
export type InsertIamAccount = z.infer<typeof insertIamAccountSchema>;
export type IamAccountApprovalHistory = typeof iamAccountApprovalHistory.$inferSelect;
export type InsertIamAccountApprovalHistory = z.infer<typeof insertIamAccountApprovalHistorySchema>;

// AWS Inventory schema
export const awsInventory = pgTable("aws_inventory", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  service: text("service").notNull(),
  type: text("type").notNull(),
  region: text("region").notNull(),
  accountName: text("account_name").notNull(),
  accountId: text("account_id").notNull(),
  status: text("status").notNull().default("active"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const awsHistoricalData = pgTable("aws_historical_data", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id"),
  identifier: text("identifier").notNull(),
  service: text("service").notNull(),
  type: text("type").notNull(),
  region: text("region").notNull(),
  accountName: text("account_name").notNull(),
  accountId: text("account_id").notNull(),
  status: text("status").notNull(),
  remarks: text("remarks"),
  changeType: text("change_type").notNull(),
  monthYear: text("month_year").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAwsInventorySchema = createInsertSchema(awsInventory, {
  identifier: z.string().min(1, "Identifier is required"),
  service: z.string().min(1, "Service is required"),
  type: z.string().min(1, "Type is required"),
  region: z.string().min(1, "Region is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  status: z.string().min(1, "Status is required"),
  remarks: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAwsHistoricalDataSchema = createInsertSchema(awsHistoricalData, {
  identifier: z.string().min(1, "Identifier is required"),
  service: z.string().min(1, "Service is required"),
  type: z.string().min(1, "Type is required"),
  region: z.string().min(1, "Region is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountId: z.string().min(1, "Account ID is required"),
  status: z.string().min(1, "Status is required"),
  changeType: z.string().min(1, "Change type is required"),
  monthYear: z.string().min(1, "Month/year is required"),
  remarks: z.string().optional(),
}).omit({
  id: true,
  createdAt: true
});

export type AwsInventory = typeof awsInventory.$inferSelect;
export type InsertAwsInventory = z.infer<typeof insertAwsInventorySchema>;
export type AwsHistoricalData = typeof awsHistoricalData.$inferSelect;
export type InsertAwsHistoricalData = z.infer<typeof insertAwsHistoricalDataSchema>;