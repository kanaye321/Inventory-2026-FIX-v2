import {
  users, activities, assets, licenses, accessories, components, consumables,
  zabbixSettings, zabbixSubnets, vmMonitoring, discoveredHosts, bitlockerKeys, vmInventory,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type Activity, type InsertActivity,
  type License, type InsertLicense,
  type Accessory, type InsertAccessory,
  type Component, type InsertComponent,
  type Consumable, type InsertConsumable,
  type ZabbixSettings, type InsertZabbixSettings,
  type ZabbixSubnet, type InsertZabbixSubnet,
  type VMMonitoring, type InsertVMMonitoring,
  type VmInventory, type InsertVmInventory,
  type DiscoveredHost, type InsertDiscoveredHost,
  type LicenseAssignment, type InsertLicenseAssignment,
  type BitlockerKey, type InsertBitlockerKey,
  AssetStatus, LicenseStatus, AccessoryStatus, ConsumableStatus,
  type VmApprovalHistory, type InsertVmApprovalHistory,
} from "@shared/schema";
import { encrypt, decrypt } from "./encryption.js";

// Mock database for in-memory storage demonstration
const mockDb = {
  exec: async (query: string) => {
    console.log(`Executing DB query: ${query}`);
    return Promise.resolve();
  },
  get: async (query: string) => {
    console.log(`Fetching DB row: ${query}`);
    return Promise.resolve(null); // Default to null
  },
  run: async (query: string, params: any[]) => {
    console.log(`Running DB query: ${query} with params: ${params}`);
    return Promise.resolve({ lastID: 1 });
  },
  all: async (query: string, params?: any[]) => {
    console.log(`Fetching DB rows: ${query} with params: ${params}`);
    return Promise.resolve([]);
  },
  executeQuery: async (query: string, params?: any[]): Promise<any> => {
    console.log(`Executing query: ${query} with params: ${params}`);
    // Simulate a database operation
    if (query.startsWith("DELETE FROM users")) {
      return Promise.resolve({ changes: 1 });
    }
    return Promise.resolve({ changes: 0 });
  }
};

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Asset operations
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  getAssetByTag(assetTag: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;

  // Component operations
  getComponents(): Promise<Component[]>;
  getComponent(id: number): Promise<Component | undefined>;
  createComponent(component: InsertComponent): Promise<Component>;
  updateComponent(id: number, component: Partial<InsertComponent>): Promise<Component | undefined>;
  deleteComponent(id: number): Promise<boolean>;

  // Accessory operations
  getAccessories(): Promise<Accessory[]>;
  getAccessory(id: number): Promise<Accessory | undefined>;
  createAccessory(accessory: InsertAccessory): Promise<Accessory>;
  updateAccessory(id: number, accessory: Partial<InsertAccessory>): Promise<Accessory | undefined>;
  deleteAccessory(id: number): Promise<boolean>;

  // Consumable operations
  getConsumables(): Promise<Consumable[]>;
  getConsumable(id: number): Promise<Consumable | undefined>;
  createConsumable(consumable: InsertConsumable): Promise<Consumable>;
  updateConsumable(id: number, consumable: Partial<InsertConsumable>): Promise<Consumable | undefined>;
  deleteConsumable(id: number): Promise<boolean>;

  // License operations
  getLicenses(): Promise<License[]>;
  getLicense(id: number): Promise<License | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: number, license: Partial<InsertLicense>): Promise<License | undefined>;
  deleteLicense(id: number): Promise<boolean>;

  // License assignment operations
  getLicenseAssignments(licenseId: number): Promise<LicenseAssignment[]>;
  createLicenseAssignment(assignment: InsertLicenseAssignment): Promise<LicenseAssignment>;

  // Checkout/checkin operations
  checkoutAsset(assetId: number, userId: number, expectedCheckinDate?: string, customNotes?: string): Promise<Asset | undefined>;
  checkinAsset(assetId: number): Promise<Asset | undefined>;

  // Activity operations
  getActivities(): Promise<Activity[]>;
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  getActivitiesByAsset(assetId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Zabbix settings operations
  getZabbixSettings(): Promise<ZabbixSettings | undefined>;
  saveZabbixSettings(settings: InsertZabbixSettings): Promise<ZabbixSettings>;

  // Zabbix subnet operations
  getZabbixSubnets(): Promise<ZabbixSubnet[]>;
  getZabbixSubnet(id: number): Promise<ZabbixSubnet | undefined>;
  createZabbixSubnet(subnet: InsertZabbixSubnet): Promise<ZabbixSubnet>;
  deleteZabbixSubnet(id: number): Promise<boolean>;

  // VM monitoring operations
  getVMMonitoring(): Promise<VMMonitoring[]>;
  getVMMonitoringByVMId(vmId: number): Promise<VMMonitoring | undefined>;
  createVMMonitoring(monitoring: InsertVMMonitoring): Promise<VMMonitoring>;
  updateVMMonitoring(id: number, monitoring: Partial<InsertVMMonitoring>): Promise<VMMonitoring | undefined>;

  // Discovered hosts operations
  getDiscoveredHosts(): Promise<DiscoveredHost[]>;
  getDiscoveredHost(id: number): Promise<DiscoveredHost | undefined>;
  createDiscoveredHost(host: InsertDiscoveredHost): Promise<DiscoveredHost>;
  updateDiscoveredHost(id: number, host: Partial<InsertDiscoveredHost>): Promise<DiscoveredHost | undefined>;
  deleteDiscoveredHost(id: number): Promise<boolean>;

  // Bitlocker keys operations
  getBitlockerKeys(): Promise<BitlockerKey[]>;
  getBitlockerKey(id: number): Promise<BitlockerKey | undefined>;
  getBitlockerKeyBySerialNumber(serialNumber: string): Promise<BitlockerKey[]>;
  getBitlockerKeyByIdentifier(identifier: string): Promise<BitlockerKey[]>;
  createBitlockerKey(key: InsertBitlockerKey): Promise<BitlockerKey>;
  updateBitlockerKey(id: number, key: Partial<InsertBitlockerKey>): Promise<BitlockerKey | undefined>;
  deleteBitlockerKey(id: number): Promise<boolean>;

  // VM Inventory operations
  getVmInventory(): Promise<VmInventory[]>;
  getVmInventoryItem(id: number): Promise<VmInventory | undefined>;
  createVmInventoryItem(vm: InsertVmInventory): Promise<VmInventory>;
  updateVmInventoryItem(id: number, vm: Partial<InsertVmInventory>): Promise<VmInventory | undefined>;
  deleteVmInventoryItem(id: number): Promise<boolean>;

  // Stats and summaries
  getAssetStats(): Promise<AssetStats>;

    // VM operations
    getVMs(): Promise<any[]>;
    getVM(id: number): Promise<any | null>;
    createVM(vmData: any): Promise<any>;
    updateVM(id: number, vmData: any): Promise<any | null>;
    deleteVM(id: number): Promise<boolean>;

    // IT Equipment operations
    getITEquipment(): Promise<any[]>;
    getITEquipmentById(id: number): Promise<any | null>;
    createITEquipment(data: any): Promise<any>;
    updateITEquipment(id: number, data: any): Promise<any | null>;
    deleteITEquipment(id: number): Promise<boolean>;

    // System Settings methods
    getSystemSettings(): Promise<any>;
    updateSystemSettings(id: number, data: any): Promise<any>;

  // JIRA Integration
  getJiraSettings(): Promise<any>;
  saveJiraSettings(settings: any): Promise<void>;

  // Issues
  createIssue(issue: any): Promise<any>;
  getIssues(): Promise<any[]>;

  // Encryption helpers
  encrypt(text: string | null | undefined): string | null;
  decrypt(text: string | null | undefined): string | null;

  // VM Approval History operations
  getVmApprovalHistory(vmId: number): Promise<VmApprovalHistory[]>;
  createVmApprovalHistory(insertHistory: InsertVmApprovalHistory): Promise<VmApprovalHistory>;

  // IAM Accounts operations
  getIamAccounts(): Promise<any[]>;
  createIamAccount(data: any): Promise<any>;
  updateIamAccount(id: number, data: any): Promise<any>;
  deleteIamAccount(id: number): Promise<void>;

  // Azure Inventory
  getAzureInventory(): Promise<any[]>;
  createAzureInventory(data: any): Promise<any>;
  updateAzureInventory(id: number, data: any): Promise<any>;
  deleteAzureInventory(id: number): Promise<void>;

  // GCP Inventory
  getGcpInventory(): Promise<any[]>;
  createGcpInventory(data: any): Promise<any>;
  updateGcpInventory(id: number, data: any): Promise<any>;
  deleteGcpInventory(id: number): Promise<void>;
}

export interface AssetStats {
  total: number;
  checkedOut: number;
  available: number;
  pending: number;
  overdue: number;
  archived: number;
  reserved: number;
}

// Mock memory database structure
interface MemoryDb {
  users: User[];
  assets: Asset[];
  accessories: Accessory[];
  components: Component[];
  licenses: License[];
  consumables: Consumable[];
  itEquipment: any[];
  bitlockerKeys: BitlockerKey[];
  activities: Activity[];
  systemSettings?: any;
  jiraSettings?: any;
  vmApprovalHistory: VmApprovalHistory[];
  iamAccounts?: any[];
  vmInventory: VmInventory[];
}

class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private assetsData: Map<number, Asset>;
  private licensesData: Map<number, License>;
  private licenseAssignmentsData: Map<number, LicenseAssignment>;
  private activitiesData: Map<number, Activity>;
  private accessoriesData: Map<number, Accessory>;
  private componentsData: Map<number, Component>;
  private consumablesData: Map<number, Consumable>;
  private zabbixSettingsData: ZabbixSettings | undefined;
  private zabbixSubnetsData: Map<number, ZabbixSubnet>;
  private vmMonitoringData: Map<number, VMMonitoring>;
  private discoveredHostsData: Map<number, DiscoveredHost>;
  private bitlockerKeysData: Map<number, BitlockerKey>;
  private vmInventoryData: Map<number, VmInventory>;
  private zabbixSettings: any[] = [];
  private zabbixSubnets = new Map<number, any>();
  private consumableAssignments: any[] = [];
  private jiraSettings: any = null;
  private issues: any[] = [];

  // Azure and GCP Inventory
  private azureInventoryData: Map<number, any>;
  private gcpInventoryData: Map<number, any>;
  private azureInventoryCurrentId: number;
  private gcpInventoryCurrentId: number;

  // VM Approval History
  private vmApprovalHistoryData: Map<number, VmApprovalHistory>;
  private vmApprovalHistoryCurrentId: number;

  private userCurrentId: number;
  private assetCurrentId: number;
  private licenseCurrentId: number;
  private licenseAssignmentCurrentId: number;
  private activityCurrentId: number;
  private accessoryCurrentId: number;
  private componentCurrentId: number;
  private consumableCurrentId: number;
  private zabbixSubnetCurrentId: number;
  private vmMonitoringCurrentId: number;
  private discoveredHostCurrentId: number;
  private bitlockerKeyCurrentId: number;
  private vmInventoryCurrentId: number;

  // VM Management
  private vms: any[] = [];

  // IT Equipment Management  
  private itEquipment: any[] = [];
  private itEquipmentAssignments: any[] = []; // Added for IT Equipment Assignments

  private db: any; // Database connection object
  private isMemoryStorage: boolean;

  private memoryDb: MemoryDb = {
    users: [],
    assets: [],
    accessories: [],
    components: [],
    licenses: [],
    consumables: [],
    itEquipment: [],
    bitlockerKeys: [],
    activities: [],
    vmApprovalHistory: [],
  };

  constructor(db: any = mockDb) {
    this.db = db;
    this.isMemoryStorage = !db || db === mockDb; // Determine if using mock DB for memory storage simulation

    this.usersData = new Map();
    this.assetsData = new Map();
    this.licensesData = new Map();
    this.licenseAssignmentsData = new Map();
    this.activitiesData = new Map();
    this.accessoriesData = new Map();
    this.componentsData = new Map();
    this.consumablesData = new Map();
    this.zabbixSettingsData = undefined;
    this.zabbixSubnetsData = new Map();
    this.vmMonitoringData = new Map();
    this.discoveredHostsData = new Map();
    this.bitlockerKeysData = new Map();
    this.vmInventoryData = new Map();
    this.zabbixSettings = [];
    this.zabbixSubnets = new Map();

    // Azure and GCP Inventory
    this.azureInventoryData = new Map();
    this.gcpInventoryData = new Map();
    this.azureInventoryCurrentId = 1;
    this.gcpInventoryCurrentId = 1;

    // VM Approval History
    this.vmApprovalHistoryData = new Map();
    this.vmApprovalHistoryCurrentId = 1;

    this.userCurrentId = 1;
    this.assetCurrentId = 1;
    this.licenseCurrentId = 1;
    this.licenseAssignmentCurrentId = 1;
    this.activityCurrentId = 1;
    this.accessoryCurrentId = 1;
    this.componentCurrentId = 1;
    this.consumableCurrentId = 1;
    this.zabbixSubnetCurrentId = 1;
    this.vmMonitoringCurrentId = 1;
    this.discoveredHostCurrentId = 1;
    this.bitlockerKeyCurrentId = 1;
    this.vmInventoryCurrentId = 1;

    // Initialize with sample admin user
    this.initializeDefaultAdmin();
    // Initialize database tables
    this.initializeDatabase();
    // Initialize sample data for memory storage
    this.initializeSampleData();
  }

  private async initializeDatabase() {
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          firstName TEXT,
          lastName TEXT,
          email TEXT UNIQUE,
          isAdmin BOOLEAN DEFAULT 0,
          department TEXT,
          roleId INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          assetTag TEXT UNIQUE,
          assetType TEXT,
          name TEXT,
          description TEXT,
          serialNumber TEXT,
          model TEXT,
          manufacturer TEXT,
          status TEXT,
          location TEXT,
          purchaseDate DATE,
          purchaseCost REAL,
          assignedTo INTEGER,
          checkoutDate DATE,
          expectedCheckinDate DATE,
          notes TEXT,
          knoxId TEXT,
          ipAddress TEXT,
          macAddress TEXT,
          osType TEXT,
          financeUpdated BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assignedTo) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS components (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT,
          status TEXT,
          description TEXT,
          location TEXT,
          serialNumber TEXT,
          model TEXT,
          manufacturer TEXT,
          purchaseDate DATE,
          purchaseCost REAL,
          warrantyExpiry DATE,
          specifications TEXT,
          assignedTo INTEGER,
          dateReleased DATE,
          dateReturned DATE,
          releasedBy INTEGER,
          returnedTo INTEGER,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assignedTo) REFERENCES users(id),
          FOREIGNKEY (releasedBy) REFERENCES users(id),
          FOREIGNKEY (returnedTo) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS accessories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT,
          description TEXT,
          location TEXT,
          serialNumber TEXT,
          model TEXT,
          manufacturer TEXT,
          purchaseDate DATE,
          purchaseCost REAL,
          assignedTo INTEGER,
          knoxId TEXT,
          dateReleased DATE,
          dateReturned DATE,
          releasedBy INTEGER,
          returnedTo INTEGER,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGNKEY (assignedTo) REFERENCES users(id),
          FOREIGNKEY (releasedBy) REFERENCES users(id),
          FOREIGNKEY (returnedTo) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS consumables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT,
          status TEXT,
          description TEXT,
          location TEXT,
          modelNumber TEXT,
          manufacturer TEXT,
          purchaseDate DATE,
          purchaseCost REAL,
          quantity INTEGER DEFAULT 1,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          licenseKey TEXT,
          type TEXT,
          seats INTEGER,
          assignedSeats INTEGER DEFAULT 0,
          company TEXT,
          purchaseDate DATE,
          purchaseCost REAL,
          expirationDate DATE,
          assignedTo INTEGER,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGNKEY (assignedTo) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS license_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          licenseId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          assignedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGNKEY (licenseId) REFERENCES licenses(id),
          FOREIGNKEY (userId) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          itemType TEXT NOT NULL,
          itemId INTEGER NOT NULL,
          userId INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGNKEY (userId) REFERENCES users(id)
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS zabbix_settings (
          id INTEGER PRIMARY KEY,
          zabbixUrl TEXT,
          zabbixUser TEXT,
          zabbixPassword TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS zabbix_subnets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cidrRange TEXT NOT NULL UNIQUE,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS vm_monitoring (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vmId INTEGER NOT NULL UNIQUE,
          vmName TEXT,
          monitoringEnabled BOOLEAN DEFAULT 1,
          checkInterval INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS discovered_hosts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ipAddress TEXT NOT NULL UNIQUE,
          hostname TEXT,
          os TEXT,
          lastSeen DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS bitlocker_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serialNumber TEXT NOT NULL,
          identifier TEXT NOT NULL,
          recoveryKey TEXT NOT NULL,
          addedByUser TEXT,
          dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS vm_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vmName TEXT NOT NULL,
          vmId TEXT NOT NULL UNIQUE,
          vmIpAddress TEXT,
          vmOs TEXT,
          vmRamGB INTEGER,
          vmCpuCores INTEGER,
          vmStorageGB INTEGER,
          vmPowerState TEXT,
          lastModified DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY,
          siteName TEXT DEFAULT 'SRPH-MIS',
          siteUrl TEXT DEFAULT 'https://localhost:5000',
          defaultLanguage TEXT DEFAULT 'en',
          defaultTimezone TEXT DEFAULT 'UTC',
          allowPublicRegistration BOOLEAN DEFAULT 0,
          companyName TEXT DEFAULT 'SRPH - School of Public Health',
          companyAddress TEXT DEFAULT '123 University Drive, College City',
          companyEmail TEXT DEFAULT 'admin@srph-example.org',
          companyLogo TEXT DEFAULT '/logo.png',
          mailFromAddress TEXT DEFAULT 'srph-mis@example.org',
          mailHost TEXT DEFAULT 'smtp.example.org',
          mailPort TEXT DEFAULT '587',
          mailUsername TEXT DEFAULT 'srph-mailer',
          mailPassword TEXT DEFAULT '',
          assetTagPrefix TEXT DEFAULT 'SRPH',
          lockoutDuration INTEGER DEFAULT 120,
          passwordMinLength INTEGER DEFAULT 8,
          requireSpecialChar BOOLEAN DEFAULT 1,
          requireUppercase BOOLEAN DEFAULT 1,
          requireNumber BOOLEAN DEFAULT 1,
          maxLoginAttempts INTEGER DEFAULT 5,
          enableAdminNotifications BOOLEAN DEFAULT 1,
          notifyOnCheckin BOOLEAN DEFAULT 1,
          notifyOnCheckout BOOLEAN DEFAULT 1,
          notifyOnOverdue BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS jira_settings (
          id INTEGER PRIMARY KEY,
          settings TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // VM Approval History table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS vm_approval_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vm_id INTEGER NOT NULL,
          old_approval_number TEXT,
          new_approval_number TEXT,
          changed_by TEXT,
          reason TEXT,
          notes TEXT,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vm_id) REFERENCES vm_inventory(id)
        )
      `);

      // Azure Inventory Table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS azure_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resourceGroupName TEXT,
          resourceType TEXT,
          resourceName TEXT,
          location TEXT,
          subscriptionId TEXT,
          resourceId TEXT UNIQUE,
          tags TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // GCP Inventory Table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS gcp_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectName TEXT,
          projectId TEXT,
          resourceType TEXT,
          resourceName TEXT,
          location TEXT,
          zone TEXT,
          resourceId TEXT UNIQUE,
          tags TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log("✅ Database tables initialized successfully.");
    } catch (error) {
      console.error("❌ Failed to initialize database tables:", error);
    }
  }

  private async initializeDefaultAdmin() {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.getUserByUsername("admin");
      if (!existingAdmin) {
        // Create default admin user
        console.log('🔧 Creating default admin user...');
        const defaultAdmin = {
          username: 'admin',
          password: 'admin123', // Plain text for initial login
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          isAdmin: true,
          department: 'IT',
          roleId: null
        };
        await this.createUser(defaultAdmin);
        console.log("✅ Default admin user created: username=admin, password=admin123");
      } else {
        console.log("✅ Default admin user already exists: username=admin");
      }
    } catch (error) {
      console.error("Failed to create default admin user:", error);
    }
  }

  private async initializeSampleData() {
    // Skip sample data initialization - show empty state instead
    if (this.isMemoryStorage) {
      console.log('📝 Memory storage initialized without sample data - starting with empty state');
    }
  }

  // User operations
  async getUsers(): Promise<User[]> {
    // In-memory storage fallback if db is not available
    if (this.isMemoryStorage) {
      return this.memoryDb.users;
    }
    try {
      const rows = await this.db.all('SELECT * FROM users');
      return rows.map((row: any) => ({ ...row, isAdmin: Boolean(row.isAdmin) }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return this.memoryDb.users; // Fallback
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.users.find((user: User) => user.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
      return row ? { ...row, isAdmin: Boolean(row.isAdmin) } : undefined;
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      return this.memoryDb.users.find((user: User) => user.id === id); // Fallback
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.users.find((user: User) => user.username === username);
    }
    try {
      const row = await this.db.get('SELECT * FROM users WHERE username = ?', [username]);
      return row ? { ...row, isAdmin: Boolean(row.isAdmin) } : undefined;
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      return this.memoryDb.users.find((user: User) => user.username === username); // Fallback
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (this.isMemoryStorage) {
      const id = this.userCurrentId++;
      const user: User = {
        ...insertUser,
        id,
        department: insertUser.department || null,
        isAdmin: insertUser.isAdmin || false,
        roleId: insertUser.roleId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.users.push(user);
      return user;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO users (username, password, firstName, lastName, email, isAdmin, department, roleId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [insertUser.username, insertUser.password, insertUser.firstName, insertUser.lastName, insertUser.email, insertUser.isAdmin, insertUser.department, insertUser.roleId]
      );
      const id = result.lastID;
      const newUser: User = { ...insertUser, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isAdmin: insertUser.isAdmin || false };
      this.usersData.set(id, newUser); // Update internal map as well
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      // Fallback to memory store if DB fails
      const id = this.userCurrentId++;
      const user: User = { ...insertUser, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isAdmin: insertUser.isAdmin || false };
      this.memoryDb.users.push(user);
      return user;
    }
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    if (this.isMemoryStorage) {
      const userIndex = this.memoryDb.users.findIndex((user: User) => user.id === id);
      if (userIndex === -1) return undefined;
      const updatedUser = { ...this.memoryDb.users[userIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.users[userIndex] = updatedUser;
      return updatedUser;
    }
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) return undefined;

      const updateQuery = `
        UPDATE users SET 
          username = ?, firstName = ?, lastName = ?, email = ?, isAdmin = ?, department = ?, roleId = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.username !== undefined ? updateData.username : existingUser.username,
        updateData.firstName !== undefined ? updateData.firstName : existingUser.firstName,
        updateData.lastName !== undefined ? updateData.lastName : existingUser.lastName,
        updateData.email !== undefined ? updateData.email : existingUser.email,
        updateData.isAdmin !== undefined ? updateData.isAdmin : existingUser.isAdmin,
        updateData.department !== undefined ? updateData.department : existingUser.department,
        updateData.roleId !== undefined ? updateData.roleId : existingUser.roleId,
        new Date().toISOString(),
        id
      ]);
      const updatedUser = { ...existingUser, ...updateData, updatedAt: new Date().toISOString() };
      this.usersData.set(id, updatedUser); // Update internal map
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      console.log(`Deleting user ${id} from memory storage...`);
      const userIndex = this.memoryDb.users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        console.log(`User ${id} not found in memory storage`);
        return false;
      }

      const deletedUser = this.memoryDb.users[userIndex];

      // Update activities to nullify userId and add deletion note (for audit trail)
      let activitiesUpdated = 0;
      this.memoryDb.activities.forEach(activity => {
        if (activity.userId === id) {
          activity.userId = null;
          const existingNotes = activity.notes || '';
          const deletionNote = `[User deleted: ${deletedUser.username}]`;
          activity.notes = existingNotes ? `${existingNotes} ${deletionNote}` : deletionNote;
          activitiesUpdated++;
        }
      });

      console.log(`Updated ${activitiesUpdated} activities to preserve audit trail`);

      // Remove user from memory
      this.memoryDb.users.splice(userIndex, 1);
      this.usersData.delete(id);

      console.log(`User ${deletedUser.username} (ID: ${id}) deleted from memory storage`);
      return true;
    }

    try {
      console.log(`Deleting user ${id} from database...`);

      // Get user info before deletion for audit trail
      const userToDelete = await this.getUser(id);
      if (!userToDelete) {
        console.log(`User ${id} not found`);
        return false;
      }

      // First, update activities to preserve audit trail
      const activityUpdateResult = await this.db.run(
        'UPDATE activities SET userId = NULL, notes = COALESCE(notes, "") || " [User deleted: " || ? || "]" WHERE userId = ?',
        [userToDelete.username, id]
      );
      console.log(`Updated ${activityUpdateResult.changes || 0} activities for audit trail`);

      // Then delete the user
      const result = await this.db.run('DELETE FROM users WHERE id = ?', [id]);
      console.log(`Database delete result: ${result.changes} rows affected`);

      // Remove from internal map
      this.usersData.delete(id);

      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting user from database:`, error);
      throw error;
    }
  }

  // Asset operations
  async getAssets(): Promise<Asset[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.assets;
    }
    try {
      const rows = await this.db.all('SELECT * FROM assets');
      return rows.map((row: any) => ({
        ...row,
        financeUpdated: Boolean(row.financeUpdated),
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        checkoutDate: row.checkoutDate ? new Date(row.checkoutDate) : null,
        expectedCheckinDate: row.expectedCheckinDate ? new Date(row.expectedCheckinDate) : null,
      }));
    } catch (error) {
      console.error('Error fetching assets:', error);
      return this.memoryDb.assets; // Fallback
    }
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.assets.find((asset: Asset) => asset.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM assets WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        financeUpdated: Boolean(row.financeUpdated),
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        checkoutDate: row.checkoutDate ? new Date(row.checkoutDate) : null,
        expectedCheckinDate: row.expectedCheckinDate ? new Date(row.expectedCheckinDate) : null,
      };
    } catch (error) {
      console.error(`Error fetching asset with id ${id}:`, error);
      return this.memoryDb.assets.find((asset: Asset) => asset.id === id); // Fallback
    }
  }

  async getAssetByTag(assetTag: string): Promise<Asset | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.assets.find((asset: Asset) => asset.assetTag === assetTag);
    }
    try {
      const row = await this.db.get('SELECT * FROM assets WHERE assetTag = ?', [assetTag]);
      if (!row) return undefined;
      return {
        ...row,
        financeUpdated: Boolean(row.financeUpdated),
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        checkoutDate: row.checkoutDate ? new Date(row.checkoutDate) : null,
        expectedCheckinDate: row.expectedCheckinDate ? new Date(row.expectedCheckinDate) : null,
      };
    } catch (error) {
      console.error(`Error fetching asset by tag ${assetTag}:`, error);
      return this.memoryDb.assets.find((asset: Asset) => asset.assetTag === assetTag); // Fallback
    }
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    if (this.isMemoryStorage) {
      const id = this.assetCurrentId++;
      const asset: Asset = {
        ...insertAsset,
        id,
        description: insertAsset.description || null,
        purchaseDate: insertAsset.purchaseDate || null,
        purchaseCost: insertAsset.purchaseCost || null,
        location: insertAsset.location || null,
        serialNumber: insertAsset.serialNumber || null,
        model: insertAsset.model || null,
        manufacturer: insertAsset.manufacturer || null,
        notes: insertAsset.notes || null,
        knoxId: insertAsset.knoxId || null,
        ipAddress: insertAsset.ipAddress || null,
        macAddress: insertAsset.macAddress || null,
        osType: insertAsset.osType || null,
        assignedTo: insertAsset.assignedTo || null,
        checkoutDate: insertAsset.checkoutDate || null,
        expectedCheckinDate: insertAsset.expectedCheckinDate || null,
        financeUpdated: insertAsset.financeUpdated || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.assets.push(asset);
      return asset;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO assets (assetTag, assetType, name, description, serialNumber, model, manufacturer, status, location, purchaseDate, purchaseCost, assignedTo, checkoutDate, expectedCheckinDate, notes, knoxId, ipAddress, macAddress, osType, financeUpdated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [insertAsset.assetTag, insertAsset.assetType, insertAsset.name, insertAsset.description, insertAsset.serialNumber, insertAsset.model, insertAsset.manufacturer, insertAsset.status, insertAsset.location, insertAsset.purchaseDate, insertAsset.purchaseCost, insertAsset.assignedTo, insertAsset.checkoutDate, insertAsset.expectedCheckinDate, insertAsset.notes, insertAsset.knoxId, insertAsset.ipAddress, insertAsset.macAddress, insertAsset.osType, insertAsset.financeUpdated]
      );
      const id = result.lastID;
      const newAsset: Asset = { ...insertAsset, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.assetsData.set(id, newAsset);
      return newAsset;
    } catch (error) {
      console.error('Error creating asset:', error);
      // Fallback to memory store
      const id = this.assetCurrentId++;
      const asset: Asset = { ...insertAsset, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.memoryDb.assets.push(asset);
      return asset;
    }
  }

  async updateAsset(id: number, updateData: Partial<InsertAsset>): Promise<Asset | undefined> {
    if (this.isMemoryStorage) {
      const assetIndex = this.memoryDb.assets.findIndex((asset: Asset) => asset.id === id);
      if (assetIndex === -1) return undefined;
      const updatedAsset = { ...this.memoryDb.assets[assetIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.assets[assetIndex] = updatedAsset;
      return updatedAsset;
    }
    try {
      const existingAsset = await this.getAsset(id);
      if (!existingAsset) return undefined;

      const updateQuery = `
        UPDATE assets SET 
          assetTag = ?, assetType = ?, name = ?, description = ?, serialNumber = ?, model = ?, manufacturer = ?, status = ?, location = ?, purchaseDate = ?, purchaseCost = ?, assignedTo = ?, checkoutDate = ?, expectedCheckinDate = ?, notes = ?, knoxId = ?, ipAddress = ?, macAddress = ?, osType = ?, financeUpdated = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.assetTag !== undefined ? updateData.assetTag : existingAsset.assetTag,
        updateData.assetType !== undefined ? updateData.assetType : existingAsset.assetType,
        updateData.name !== undefined ? updateData.name : existingAsset.name,
        updateData.description !== undefined ? updateData.description : existingAsset.description,
        updateData.serialNumber !== undefined ? updateData.serialNumber : existingAsset.serialNumber,
        updateData.model !== undefined ? updateData.model : existingAsset.model,
        updateData.manufacturer !== undefined ? updateData.manufacturer : existingAsset.manufacturer,
        updateData.status !== undefined ? updateData.status : existingAsset.status,
        updateData.location !== undefined ? updateData.location : existingAsset.location,
        updateData.purchaseDate !== undefined ? updateData.purchaseDate : existingAsset.purchaseDate,
        updateData.purchaseCost !== undefined ? updateData.purchaseCost : existingAsset.purchaseCost,
        updateData.assignedTo !== undefined ? updateData.assignedTo : existingAsset.assignedTo,
        updateData.checkoutDate !== undefined ? updateData.checkoutDate : existingAsset.checkoutDate,
        updateData.expectedCheckinDate !== undefined ? updateData.expectedCheckinDate : existingAsset.expectedCheckinDate,
        updateData.notes !== undefined ? updateData.notes : existingAsset.notes,
        updateData.knoxId !== undefined ? updateData.knoxId : existingAsset.knoxId,
        updateData.ipAddress !== undefined ? updateData.ipAddress : existingAsset.ipAddress,
        updateData.macAddress !== undefined ? updateData.macAddress : existingAsset.macAddress,
        updateData.osType !== undefined ? updateData.osType : existingAsset.osType,
        updateData.financeUpdated !== undefined ? updateData.financeUpdated : existingAsset.financeUpdated,
        new Date().toISOString(),
        id
      ]);
      const updatedAsset = { ...existingAsset, ...updateData, updatedAt: new Date().toISOString() };
      this.assetsData.set(id, updatedAsset);
      return updatedAsset;
    } catch (error) {
      console.error(`Error updating asset with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteAsset(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.assets.length;
      this.memoryDb.assets = this.memoryDb.assets.filter((asset: Asset) => asset.id !== id);
      return this.memoryDb.assets.length < initialLength;
    }
    try {
      const result = await this.db.run('DELETE FROM assets WHERE id = ?', [id]);
      this.assetsData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting asset with id ${id}:`, error);
      return false;
    }
  }

  // Component operations
  async getComponents(): Promise<Component[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.components;
    }
    try {
      const rows = await this.db.all('SELECT * FROM components');
      return rows.map((row: any) => ({
        ...row,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
        dateReleased: row.dateReleased ? new Date(row.dateReleased) : null,
        dateReturned: row.dateReturned ? new Date(row.dateReturned) : null,
      }));
    } catch (error) {
      console.error('Error fetching components:', error);
      return this.memoryDb.components; // Fallback
    }
  }

  async getComponent(id: number): Promise<Component | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.components.find((component: Component) => component.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM components WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
        dateReleased: row.dateReleased ? new Date(row.dateReleased) : null,
        dateReturned: row.dateReturned ? new Date(row.dateReturned) : null,
      };
    } catch (error) {
      console.error(`Error fetching component with id ${id}:`, error);
      return this.memoryDb.components.find((component: Component) => component.id === id); // Fallback
    }
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    if (this.isMemoryStorage) {
      const id = this.componentCurrentId++;
      const component: Component = {
        ...insertComponent,
        id,
        type: insertComponent.type || 'Other',
        status: insertComponent.status || 'available',
        assignedTo: insertComponent.assignedTo || null,
        description: insertComponent.description || null,
        location: insertComponent.location || null,
        serialNumber: insertComponent.serialNumber || null,
        model: insertComponent.model || null,
        manufacturer: insertComponent.manufacturer || null,
        purchaseDate: insertComponent.purchaseDate || null,
        purchaseCost: insertComponent.purchaseCost || null,
        warrantyExpiry: insertComponent.warrantyExpiry || null,
        specifications: insertComponent.specifications || null,
        dateReleased: insertComponent.dateReleased || null,
        dateReturned: insertComponent.dateReturned || null,
        releasedBy: insertComponent.releasedBy || null,
        returnedTo: insertComponent.returnedTo || null,
        notes: insertComponent.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.components.push(component);

      console.log('Component created in storage:', component);

      // Create activity record
      this.createActivity({
        action: "create",
        itemType: "component",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Component "${component.name}" created`,
      });

      return component;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO components (name, type, status, description, location, serialNumber, model, manufacturer, purchaseDate, purchaseCost, warrantyExpiry, specifications, assignedTo, dateReleased, dateReturned, releasedBy, returnedTo, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [insertComponent.name, insertComponent.type, insertComponent.status, insertComponent.description, insertComponent.location, insertComponent.serialNumber, insertComponent.model, insertComponent.manufacturer, insertComponent.purchaseDate, insertComponent.purchaseCost, insertComponent.warrantyExpiry, insertComponent.specifications, insertComponent.assignedTo, insertComponent.dateReleased, insertComponent.dateReturned, insertComponent.releasedBy, insertComponent.returnedTo, insertComponent.notes]
      );
      const id = result.lastID;
      const newComponent: Component = { ...insertComponent, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.componentsData.set(id, newComponent);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "component",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Component "${newComponent.name}" created`,
      });

      return newComponent;
    } catch (error) {
      console.error('Error creating component:', error);
      // Fallback to memory store
      const id = this.componentCurrentId++;
      const component: Component = { ...insertComponent, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.memoryDb.components.push(component);
      await this.createActivity({
        action: "create",
        itemType: "component",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Component "${component.name}" created (memory storage fallback)`,
      });
      return component;
    }
  }

  async updateComponent(id: number, updateData: Partial<InsertComponent>): Promise<Component | undefined> {
    if (this.isMemoryStorage) {
      const componentIndex = this.memoryDb.components.findIndex((component: Component) => component.id === id);
      if (componentIndex === -1) return undefined;
      const updatedComponent = { ...this.memoryDb.components[componentIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.components[componentIndex] = updatedComponent;
      return updatedComponent;
    }
    try {
      const existingComponent = await this.getComponent(id);
      if (!existingComponent) return undefined;

      const updateQuery = `
        UPDATE components SET 
          name = ?, type = ?, status = ?, description = ?, location = ?, serialNumber = ?, model = ?, manufacturer = ?, purchaseDate = ?, purchaseCost = ?, warrantyExpiry = ?, specifications = ?, assignedTo = ?, dateReleased = ?, dateReturned = ?, releasedBy = ?, returnedTo = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.name !== undefined ? updateData.name : existingComponent.name,
        updateData.type !== undefined ? updateData.type : existingComponent.type,
        updateData.status !== undefined ? updateData.status : existingComponent.status,
        updateData.description !== undefined ? updateData.description : existingComponent.description,
        updateData.location !== undefined ? updateData.location : existingComponent.location,
        updateData.serialNumber !== undefined ? updateData.serialNumber : existingComponent.serialNumber,
        updateData.model !== undefined ? updateData.model : existingComponent.model,
        updateData.manufacturer !== undefined ? updateData.manufacturer : existingComponent.manufacturer,
        updateData.purchaseDate !== undefined ? updateData.purchaseDate : existingComponent.purchaseDate,
        updateData.purchaseCost !== undefined ? updateData.purchaseCost : existingComponent.purchaseCost,
        updateData.warrantyExpiry !== undefined ? updateData.warrantyExpiry : existingComponent.warrantyExpiry,
        updateData.specifications !== undefined ? updateData.specifications : existingComponent.specifications,
        updateData.assignedTo !== undefined ? updateData.assignedTo : existingComponent.assignedTo,
        updateData.dateReleased !== undefined ? updateData.dateReleased : existingComponent.dateReleased,
        updateData.dateReturned !== undefined ? updateData.dateReturned : existingComponent.dateReturned,
        updateData.releasedBy !== undefined ? updateData.releasedBy : existingComponent.releasedBy,
        updateData.returnedTo !== undefined ? updateData.returnedTo : existingComponent.returnedTo,
        updateData.notes !== undefined ? updateData.notes : existingComponent.notes,
        new Date().toISOString(),
        id
      ]);
      const updatedComponent = { ...existingComponent, ...updateData, updatedAt: new Date().toISOString() };
      this.componentsData.set(id, updatedComponent);

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "component",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Component "${updatedComponent.name}" updated`,
      });

      return updatedComponent;
    } catch (error) {
      console.error(`Error updating component with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteComponent(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.components.length;
      this.memoryDb.components = this.memoryDb.components.filter((component: Component) => component.id !== id);
      return this.memoryDb.components.length < initialLength;
    }
    try {
      const component = await this.getComponent(id);
      if (!component) return false;

      const result = await this.db.run('DELETE FROM components WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "component",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `Component "${component.name}" deleted`,
        });
      }
      this.componentsData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting component with id ${id}:`, error);
      return false;
    }
  }

  // Accessory operations
  async getAccessories(): Promise<Accessory[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.accessories;
    }
    try {
      const rows = await this.db.all('SELECT * FROM accessories');
      return rows.map((row: any) => ({
        ...row,
        dateReleased: row.dateReleased ? new Date(row.dateReleased) : null,
        dateReturned: row.dateReturned ? new Date(row.dateReturned) : null,
      }));
    } catch (error) {
      console.error('Error fetching accessories:', error);
      return this.memoryDb.accessories; // Fallback
    }
  }

  async getAccessory(id: number): Promise<Accessory | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.accessories.find((accessory: Accessory) => accessory.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM accessories WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        dateReleased: row.dateReleased ? new Date(row.dateReleased) : null,
        dateReturned: row.dateReturned ? new Date(row.dateReturned) : null,
      };
    } catch (error) {
      console.error(`Error fetching accessory with id ${id}:`, error);
      return this.memoryDb.accessories.find((accessory: Accessory) => accessory.id === id); // Fallback
    }
  }

  async createAccessory(insertAccessory: InsertAccessory): Promise<Accessory> {
    if (this.isMemoryStorage) {
      const id = this.accessoryCurrentId++;
      const accessory: Accessory = {
        ...insertAccessory,
        id,
        description: insertAccessory.description || null,
        location: insertAccessory.location || null,
        serialNumber: insertAccessory.serialNumber || null,
        model: insertAccessory.model || null,
        manufacturer: insertAccessory.manufacturer || null,
        purchaseDate: insertAccessory.purchaseDate || null,
        purchaseCost: insertAccessory.purchaseCost || null,
        assignedTo: insertAccessory.assignedTo || null,
        knoxId: insertAccessory.knoxId || null,
        dateReleased: insertAccessory.dateReleased || null,
        dateReturned: insertAccessory.dateReturned || null,
        releasedBy: insertAccessory.releasedBy || null,
        returnedTo: insertAccessory.returnedTo || null,
        notes: insertAccessory.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.accessories.push(accessory);

      // Create activity record
      this.createActivity({
        action: "create",
        itemType: "accessory",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Accessory "${accessory.name}" created`,
      });

      return accessory;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO accessories (name, type, description, location, serialNumber, model, manufacturer, purchaseDate, purchaseCost, assignedTo, knoxId, dateReleased, dateReturned, releasedBy, returnedTo, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [insertAccessory.name, insertAccessory.type, insertAccessory.description, insertAccessory.location, insertAccessory.serialNumber, insertAccessory.model, insertAccessory.manufacturer, insertAccessory.purchaseDate, insertAccessory.purchaseCost, insertAccessory.assignedTo, insertAccessory.knoxId, insertAccessory.dateReleased, insertAccessory.dateReturned, insertAccessory.releasedBy, insertAccessory.returnedTo, insertAccessory.notes]
      );
      const id = result.lastID;
      const newAccessory: Accessory = { ...insertAccessory, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.accessoriesData.set(id, newAccessory);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "accessory",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Accessory "${newAccessory.name}" created`,
      });

      return newAccessory;
    } catch (error) {
      console.error('Error creating accessory:', error);
      // Fallback to memory store
      const id = this.accessoryCurrentId++;
      const accessory: Accessory = { ...insertAccessory, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.memoryDb.accessories.push(accessory);
      await this.createActivity({
        action: "create",
        itemType: "accessory",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Accessory "${accessory.name}" created (memory storage fallback)`,
      });
      return accessory;
    }
  }

  async updateAccessory(id: number, updateData: Partial<InsertAccessory>): Promise<Accessory | undefined> {
    if (this.isMemoryStorage) {
      const accessoryIndex = this.memoryDb.accessories.findIndex((accessory: Accessory) => accessory.id === id);
      if (accessoryIndex === -1) return undefined;
      const updatedAccessory = { ...this.memoryDb.accessories[accessoryIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.accessories[accessoryIndex] = updatedAccessory;
      return updatedAccessory;
    }
    try {
      const existingAccessory = await this.getAccessory(id);
      if (!existingAccessory) return undefined;

      const updateQuery = `
        UPDATE accessories SET 
          name = ?, type = ?, description = ?, location = ?, serialNumber = ?, model = ?, manufacturer = ?, purchaseDate = ?, purchaseCost = ?, assignedTo = ?, knoxId = ?, dateReleased = ?, dateReturned = ?, releasedBy = ?, returnedTo = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.name !== undefined ? updateData.name : existingAccessory.name,
        updateData.type !== undefined ? updateData.type : existingAccessory.type,
        updateData.description !== undefined ? updateData.description : existingAccessory.description,
        updateData.location !== undefined ? updateData.location : existingAccessory.location,
        updateData.serialNumber !== undefined ? updateData.serialNumber : existingAccessory.serialNumber,
        updateData.model !== undefined ? updateData.model : existingAccessory.model,
        updateData.manufacturer !== undefined ? updateData.manufacturer : existingAccessory.manufacturer,
        updateData.purchaseDate !== undefined ? updateData.purchaseDate : existingAccessory.purchaseDate,
        updateData.purchaseCost !== undefined ? updateData.purchaseCost : existingAccessory.purchaseCost,
        updateData.assignedTo !== undefined ? updateData.assignedTo : existingAccessory.assignedTo,
        updateData.knoxId !== undefined ? updateData.knoxId : existingAccessory.knoxId,
        updateData.dateReleased !== undefined ? updateData.dateReleased : existingAccessory.dateReleased,
        updateData.dateReturned !== undefined ? updateData.dateReturned : existingAccessory.dateReturned,
        updateData.releasedBy !== undefined ? updateData.releasedBy : existingAccessory.releasedBy,
        updateData.returnedTo !== undefined ? updateData.returnedTo : existingAccessory.returnedTo,
        updateData.notes !== undefined ? updateData.notes : existingAccessory.notes,
        new Date().toISOString(),
        id
      ]);
      const updatedAccessory = { ...existingAccessory, ...updateData, updatedAt: new Date().toISOString() };
      this.accessoriesData.set(id, updatedAccessory);

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "accessory",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Accessory "${updatedAccessory.name}" updated`,
      });

      return updatedAccessory;
    } catch (error) {
      console.error(`Error updating accessory with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteAccessory(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.accessories.length;
      this.memoryDb.accessories = this.memoryDb.accessories.filter((accessory: Accessory) => accessory.id !== id);
      return this.memoryDb.accessories.length < initialLength;
    }
    try {
      const accessory = await this.getAccessory(id);
      if (!accessory) return false;

      const result = await this.db.run('DELETE FROM accessories WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "accessory",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `Accessory "${accessory.name}" deleted`,
        });
      }
      this.accessoriesData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting accessory with id ${id}:`, error);
      return false;
    }
  }

  // Consumable operations
  async getConsumables(): Promise<Consumable[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.consumables;
    }
    try {
      const rows = await this.db.all('SELECT * FROM consumables');
      return rows.map((row: any) => ({ ...row, quantity: Number(row.quantity) }));
    } catch (error) {
      console.error('Error fetching consumables:', error);
      return this.memoryDb.consumables; // Fallback
    }
  }

  async getConsumable(id: number): Promise<Consumable | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.consumables.find((consumable: Consumable) => consumable.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM consumables WHERE id = ?', [id]);
      return row ? { ...row, quantity: Number(row.quantity) } : undefined;
    } catch (error) {
      console.error(`Error fetching consumable with id ${id}:`, error);
      return this.memoryDb.consumables.find((consumable: Consumable) => consumable.id === id); // Fallback
    }
  }

  async createConsumable(insertConsumable: InsertConsumable): Promise<Consumable> {
    if (this.isMemoryStorage) {
      const id = this.consumableCurrentId++;
      const consumable: Consumable = {
        ...insertConsumable,
        id,
        status: insertConsumable.status || ConsumableStatus.AVAILABLE,
        location: insertConsumable.location || null,
        modelNumber: insertConsumable.modelNumber || null,
        manufacturer: insertConsumable.manufacturer || null,
        purchaseDate: insertConsumable.purchaseDate || null,
        purchaseCost: insertConsumable.purchaseCost || null,
        notes: insertConsumable.notes || null,
        quantity: insertConsumable.quantity || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.consumables.push(consumable);

      // Create activity record
      this.createActivity({
        action: "create",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${consumable.name}" created`,
      });

      return consumable;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO consumables (name, type, status, description, location, modelNumber, manufacturer, purchaseDate, purchaseCost, quantity, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [insertConsumable.name, insertConsumable.type, insertConsumable.status, insertConsumable.description, insertConsumable.location, insertConsumable.modelNumber, insertConsumable.manufacturer, insertConsumable.purchaseDate, insertConsumable.purchaseCost, insertConsumable.quantity, insertConsumable.notes]
      );
      const id = result.lastID;
      const newConsumable: Consumable = { ...insertConsumable, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), quantity: insertConsumable.quantity || 1 };
      this.consumablesData.set(id, newConsumable);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${newConsumable.name}" created`,
      });

      return newConsumable;
    } catch (error) {
      console.error('Error creating consumable:', error);
      // Fallback to memory store
      const id = this.consumableCurrentId++;
      const consumable: Consumable = { ...insertConsumable, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), quantity: insertConsumable.quantity || 1 };
      this.memoryDb.consumables.push(consumable);
      await this.createActivity({
        action: "create",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${consumable.name}" created (memory storage fallback)`,
      });
      return consumable;
    }
  }

  async updateConsumable(id: number, updateData: Partial<InsertConsumable>): Promise<Consumable | undefined> {
    if (this.isMemoryStorage) {
      const consumableIndex = this.memoryDb.consumables.findIndex((consumable: Consumable) => consumable.id === id);
      if (consumableIndex === -1) return undefined;
      const updatedConsumable = { ...this.memoryDb.consumables[consumableIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.consumables[consumableIndex] = updatedConsumable;
      return updatedConsumable;
    }
    try {
      const existingConsumable = await this.getConsumable(id);
      if (!existingConsumable) return undefined;

      const updateQuery = `
        UPDATE consumables SET 
          name = ?, type = ?, status = ?, description = ?, location = ?, modelNumber = ?, manufacturer = ?, purchaseDate = ?, purchaseCost = ?, quantity = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.name !== undefined ? updateData.name : existingConsumable.name,
        updateData.type !== undefined ? updateData.type : existingConsumable.type,
        updateData.status !== undefined ? updateData.status : existingConsumable.status,
        updateData.description !== undefined ? updateData.description : existingConsumable.description,
        updateData.location !== undefined ? updateData.location : existingConsumable.location,
        updateData.modelNumber !== undefined ? updateData.modelNumber : existingConsumable.modelNumber,
        updateData.manufacturer !== undefined ? updateData.manufacturer : existingConsumable.manufacturer,
        updateData.purchaseDate !== undefined ? updateData.purchaseDate : existingConsumable.purchaseDate,
        updateData.purchaseCost !== undefined ? updateData.purchaseCost : existingConsumable.purchaseCost,
        updateData.quantity !== undefined ? updateData.quantity : existingConsumable.quantity,
        updateData.notes !== undefined ? updateData.notes : existingConsumable.notes,
        new Date().toISOString(),
        id
      ]);
      const updatedConsumable = { ...existingConsumable, ...updateData, updatedAt: new Date().toISOString() };
      this.consumablesData.set(id, updatedConsumable);

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${updatedConsumable.name}" updated`,
      });

      return updatedConsumable;
    } catch (error) {
      console.error(`Error updating consumable with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteConsumable(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.consumables.length;
      this.memoryDb.consumables = this.memoryDb.consumables.filter((consumable: Consumable) => consumable.id !== id);
      return this.memoryDb.consumables.length < initialLength;
    }
    try {
      const consumable = await this.getConsumable(id);
      if (!consumable) return false;

      const result = await this.db.run('DELETE FROM consumables WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "consumable",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `Consumable "${consumable.name}" deleted`,
        });
      }
      this.consumablesData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting consumable with id ${id}:`, error);
      return false;
    }
  }

  async assignConsumable(consumableId: number, assignmentData: any): Promise<any> {
    const assignment = {
      id: this.consumableAssignments.length + 1,
      consumableId,
      assignedTo: assignmentData.assignedTo,
      serialNumber: assignmentData.serialNumber,
      knoxId: assignmentData.knoxId,
      quantity: assignmentData.quantity || 1,
      assignedDate: new Date().toISOString(),
      status: 'assigned',
      notes: assignmentData.notes
    };

    this.consumableAssignments.push(assignment);
    return assignment;
  }

  // System Settings methods
  async getSystemSettings(): Promise<any> {
    if (this.isMemoryStorage) {
      return this.memoryDb.systemSettings || {
        id: 1, siteName: "SRPH-MIS", defaultLanguage: "english", defaultTimezone: "UTC",
        dateFormat: "yyyy-mm-dd", autoBackupEnabled: false, cacheEnabled: true, colorScheme: "default",
        enableAdminNotifications: true, notifyOnCheckout: true, notifyOnOverdue: true, passwordMinLength: 8,
        requireSpecialChar: false, requireUppercase: true, requireLowercase: true, requireNumber: true,
        maxLoginAttempts: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
    }
    try {
      const row = await this.db.get('SELECT * FROM system_settings WHERE id = 1');
      return row || {
        id: 1, siteName: "SRPH-MIS", defaultLanguage: "english", defaultTimezone: "UTC",
        dateFormat: "yyyy-mm-dd", autoBackupEnabled: false, cacheEnabled: true, colorScheme: "default",
        enableAdminNotifications: true, notifyOnCheckout: true, notifyOnOverdue: true, passwordMinLength: 8,
        requireSpecialChar: false, requireUppercase: true, requireLowercase: true, requireNumber: true,
        maxLoginAttempts: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system settings:', error);
      return this.memoryDb.systemSettings || {}; // Fallback
    }
  }

  async updateSystemSettings(id: number, data: any): Promise<any> {
    if (this.isMemoryStorage) {
      this.memoryDb.systemSettings = { ...data, id, updatedAt: new Date().toISOString() };
      return this.memoryDb.systemSettings;
    }
    try {
      const existingSettings = await this.getSystemSettings();
      const updateQuery = `
        UPDATE system_settings SET 
          siteName = ?, siteUrl = ?, defaultLanguage = ?, defaultTimezone = ?, allowPublicRegistration = ?, companyName = ?, companyAddress = ?, companyEmail = ?, companyLogo = ?, mailFromAddress = ?, mailFromName = ?, mailHost = ?, mailPort = ?, mailUsername = ?, mailPassword = ?, assetTagPrefix = ?, lockoutDuration = ?, passwordMinLength = ?, requireSpecialChar = ?, requireUppercase = ?, requireNumber = ?, maxLoginAttempts = ?, enableAdminNotifications = ?, notifyOnCheckin = ?, notifyOnCheckout = ?, notifyOnOverdue = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        data.siteName !== undefined ? data.siteName : existingSettings.siteName,
        data.siteUrl !== undefined ? data.siteUrl : existingSettings.siteUrl,
        data.defaultLanguage !== undefined ? data.defaultLanguage : existingSettings.defaultLanguage,
        data.defaultTimezone !== undefined ? data.defaultTimezone : existingSettings.defaultTimezone,
        data.allowPublicRegistration !== undefined ? data.allowPublicRegistration : existingSettings.allowPublicRegistration,
        data.companyName !== undefined ? data.companyName : existingSettings.companyName,
        data.companyAddress !== undefined ? data.companyAddress : existingSettings.companyAddress,
        data.companyEmail !== undefined ? data.companyEmail : existingSettings.companyEmail,
        data.companyLogo !== undefined ? data.companyLogo : existingSettings.companyLogo,
        data.mailFromAddress !== undefined ? data.mailFromAddress : existingSettings.mailFromAddress,
        data.mailFromName !== undefined ? data.mailFromName : existingSettings.mailFromName,
        data.mailHost !== undefined ? data.mailHost : existingSettings.mailHost,
        data.mailPort !== undefined ? data.mailPort : existingSettings.mailPort,
        data.mailUsername !== undefined ? data.mailUsername : existingSettings.mailUsername,
        data.mailPassword !== undefined ? data.mailPassword : existingSettings.mailPassword,
        data.assetTagPrefix !== undefined ? data.assetTagPrefix : existingSettings.assetTagPrefix,
        data.lockoutDuration !== undefined ? data.lockoutDuration : existingSettings.lockoutDuration,
        data.passwordMinLength !== undefined ? data.passwordMinLength : existingSettings.passwordMinLength,
        data.requireSpecialChar !== undefined ? data.requireSpecialChar : existingSettings.requireSpecialChar,
        data.requireUppercase !== undefined ? data.requireUppercase : existingSettings.requireUppercase,
        data.requireNumber !== undefined ? data.requireNumber : existingSettings.requireNumber,
        data.maxLoginAttempts !== undefined ? data.maxLoginAttempts : existingSettings.maxLoginAttempts,
        data.enableAdminNotifications !== undefined ? data.enableAdminNotifications : existingSettings.enableAdminNotifications,
        data.notifyOnCheckin !== undefined ? data.notifyOnCheckin : existingSettings.notifyOnCheckin,
        data.notifyOnCheckout !== undefined ? data.notifyOnCheckout : existingSettings.notifyOnCheckout,
        data.notifyOnOverdue !== undefined ? data.notifyOnOverdue : existingSettings.notifyOnOverdue,
        new Date().toISOString(),
        id
      ]);
      return { ...existingSettings, ...data, updatedAt: new Date().toISOString() };
    } catch (error) {
      console.error(`Error updating system settings with id ${id}:`, error);
      return undefined;
    }
  }

  // License operations
  async getLicenses(): Promise<License[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.licenses;
    }
    try {
      const rows = await this.db.all('SELECT * FROM licenses');
      return rows.map((row: any) => ({
        ...row,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        expirationDate: row.expirationDate ? new Date(row.expirationDate) : null,
        assignedSeats: Number(row.assignedSeats),
      }));
    } catch (error) {
      console.error('Error fetching licenses:', error);
      return this.memoryDb.licenses; // Fallback
    }
  }

  async getLicense(id: number): Promise<License | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.licenses.find((license: License) => license.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM licenses WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        expirationDate: row.expirationDate ? new Date(row.expirationDate) : null,
        assignedSeats: Number(row.assignedSeats),
      };
    } catch (error) {
      console.error(`Error fetching license with id ${id}:`, error);
      return this.memoryDb.licenses.find((license: License) => license.id === id); // Fallback
    }
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    if (this.isMemoryStorage) {
      const id = this.licenseCurrentId++;
      const license: License = {
        ...insertLicense,
        id,
        purchaseDate: insertLicense.purchaseDate || null,
        purchaseCost: insertLicense.purchaseCost || null,
        manufacturer: insertLicense.manufacturer || null,
        notes: insertLicense.notes || null,
        assignedTo: insertLicense.assignedTo || null,
        seats: insertLicense.seats || null,
        assignedSeats: insertLicense.assignedSeats || 0,
        company: insertLicense.company || null,
        expirationDate: insertLicense.expirationDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.memoryDb.licenses.push(license);

      // Create activity record
      this.createActivity({
        action: "create",
        itemType: "license",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${license.name}" created`,
      });

      return license;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO licenses (name, licenseKey, type, seats, assignedSeats, company, purchaseDate, purchaseCost, expirationDate, assignedTo, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [insertLicense.name, insertLicense.licenseKey, insertLicense.type, insertLicense.seats, insertLicense.assignedSeats, insertLicense.company, insertLicense.purchaseDate, insertLicense.purchaseCost, insertLicense.expirationDate, insertLicense.assignedTo, insertLicense.notes]
      );
      const id = result.lastID;
      const newLicense: License = { ...insertLicense, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assignedSeats: insertLicense.assignedSeats || 0 };
      this.licensesData.set(id, newLicense);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "license",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${newLicense.name}" created`,
      });

      return newLicense;
    } catch (error) {
      console.error('Error creating license:', error);
      // Fallback to memory store
      const id = this.licenseCurrentId++;
      const license: License = { ...insertLicense, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assignedSeats: insertLicense.assignedSeats || 0 };
      this.memoryDb.licenses.push(license);
      await this.createActivity({
        action: "create",
        itemType: "license",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${license.name}" created (memory storage fallback)`,
      });
      return license;
    }
  }

  async updateLicense(id: number, updateData: Partial<InsertLicense>): Promise<License | undefined> {
    if (this.isMemoryStorage) {
      const licenseIndex = this.memoryDb.licenses.findIndex((license: License) => license.id === id);
      if (licenseIndex === -1) return undefined;
      const updatedLicense = { ...this.memoryDb.licenses[licenseIndex], ...updateData, updatedAt: new Date().toISOString() };
      this.memoryDb.licenses[licenseIndex] = updatedLicense;
      return updatedLicense;
    }
    try {
      const existingLicense = await this.getLicense(id);
      if (!existingLicense) return undefined;

      const updateQuery = `
        UPDATE licenses SET 
          name = ?, licenseKey = ?, type = ?, seats = ?, assignedSeats = ?, company = ?, purchaseDate = ?, purchaseCost = ?, expirationDate = ?, assignedTo = ?, notes = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.name !== undefined ? updateData.name : existingLicense.name,
        updateData.licenseKey !== undefined ? updateData.licenseKey : existingLicense.licenseKey,
        updateData.type !== undefined ? updateData.type : existingLicense.type,
        updateData.seats !== undefined ? updateData.seats : existingLicense.seats,
        updateData.assignedSeats !== undefined ? updateData.assignedSeats : existingLicense.assignedSeats,
        updateData.company !== undefined ? updateData.company : existingLicense.company,
        updateData.purchaseDate !== undefined ? updateData.purchaseDate : existingLicense.purchaseDate,
        updateData.purchaseCost !== undefined ? updateData.purchaseCost : existingLicense.purchaseCost,
        updateData.expirationDate !== undefined ? updateData.expirationDate : existingLicense.expirationDate,
        updateData.assignedTo !== undefined ? updateData.assignedTo : existingLicense.assignedTo,
        updateData.notes !== undefined ? updateData.notes : existingLicense.notes,
        new Date().toISOString(),
        id
      ]);
      const updatedLicense = { ...existingLicense, ...updateData, updatedAt: new Date().toISOString() };
      this.licensesData.set(id, updatedLicense);

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "license",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${updatedLicense.name}" updated`,
      });

      return updatedLicense;
    } catch (error) {
      console.error(`Error updating license with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteLicense(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.licenses.length;
      this.memoryDb.licenses = this.memoryDb.licenses.filter((license: License) => license.id !== id);
      return this.memoryDb.licenses.length < initialLength;
    }
    try {
      const license = await this.getLicense(id);
      if (!license) return false;

      const result = await this.db.run('DELETE FROM licenses WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "license",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `License "${license.name}" deleted`,
        });
      }
      this.licensesData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting license with id ${id}:`, error);
      return false;
    }
  }

  // License assignment operations  
  async getLicenseAssignments(licenseId: number): Promise<LicenseAssignment[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.licenses.find(l => l.id === licenseId)?.assignments || [];
    }
    try {
      const rows = await this.db.all('SELECT * FROM license_assignments WHERE licenseId = ?', [licenseId]);
      return rows.map((row: any) => ({
        ...row,
        assignedDate: new Date(row.assignedDate),
      }));
    } catch (error) {
      console.error(`Error fetching license assignments for licenseId ${licenseId}:`, error);
      return []; // Fallback
    }
  }

  async createLicenseAssignment(insertAssignment: InsertLicenseAssignment): Promise<LicenseAssignment> {
    if (this.isMemoryStorage) {
      const id = this.licenseAssignmentCurrentId++;
      const assignment: LicenseAssignment = {
        ...insertAssignment,
        id,
        notes: insertAssignment.notes || null,
        assignedDate: new Date().toISOString()
      };
      // Find the license and add the assignment
      const license = this.memoryDb.licenses.find(l => l.id === assignment.licenseId);
      if (license) {
        if (!license.assignments) license.assignments = [];
        license.assignments.push(assignment);
        license.assignedSeats = (license.assignedSeats || 0) + 1;
      }
      return assignment;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO license_assignments (licenseId, userId, notes) VALUES (?, ?, ?)',
        [insertAssignment.licenseId, insertAssignment.userId, insertAssignment.notes]
      );
      const id = result.lastID;
      const newAssignment: LicenseAssignment = { ...insertAssignment, id, assignedDate: new Date().toISOString() };
      this.licenseAssignmentsData.set(id, newAssignment);

      const license = await this.getLicense(newAssignment.licenseId);
      if (license) {
        // Increment the assignedSeats count
        await this.updateLicense(license.id, {
          assignedSeats: (license.assignedSeats || 0) + 1
        });
      }

      return newAssignment;
    } catch (error) {
      console.error('Error creating license assignment:', error);
      // Fallback to memory store
      const id = this.licenseAssignmentCurrentId++;
      const assignment: LicenseAssignment = { ...insertAssignment, id, assignedDate: new Date().toISOString() };
      // Add to memory store assignments
      const license = this.memoryDb.licenses.find(l => l.id === assignment.licenseId);
      if (license) {
        if (!license.assignments) license.assignments = [];
        license.assignments.push(assignment);
        license.assignedSeats = (license.assignedSeats || 0) + 1;
      }
      return assignment;
    }
  }

  // Checkout/Checkin operations
  async checkoutAsset(assetId: number, userId: number, expectedCheckinDate?: string, customNotes?: string): Promise<Asset | undefined> {
    const asset = await this.getAsset(assetId);
    if (!asset) return undefined;

    // Cannot checkout an asset that is already checked out
    if (asset.status === AssetStatus.DEPLOYED) return undefined;

    // Update the asset
    const updatedAsset: Asset = {
      ...asset,
      status: AssetStatus.DEPLOYED,
      assignedTo: userId,
      checkoutDate: new Date().toISOString(),
      expectedCheckinDate: expectedCheckinDate || null
    };

    await this.updateAsset(assetId, updatedAsset); // Use updateAsset to handle persistence

    // Create activity record
    await this.createActivity({
      action: "checkout",
      itemType: "asset",
      itemId: assetId,
      userId,
      timestamp: new Date().toISOString(),
      notes: customNotes || `Asset checked out to user ID: ${userId}`
    });

    return updatedAsset;
  }

  async checkinAsset(assetId: number): Promise<Asset | undefined> {
    const asset = await this.getAsset(assetId);
    if (!asset) return undefined;

    // Cannot checkin an asset that is not checked out
    if (asset.status !== AssetStatus.DEPLOYED) return undefined;

    const userId = asset.assignedTo;

    // Update the asset
    const updatedAsset: Asset = {
      ...asset,
      status: AssetStatus.AVAILABLE,
      assignedTo: null,
      checkoutDate: null,
      expectedCheckinDate: null
    };

    await this.updateAsset(assetId, updatedAsset); // Use updateAsset to handle persistence

    // Create activity record
    await this.createActivity({
      action: "checkin",
      itemType: "asset",
      itemId: assetId,
      userId: userId || null,
      timestamp: new Date().toISOString(),
      notes: `Asset checked in from user ID: ${userId || 'Unknown'}`
    });

    return updatedAsset;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.activities;
    }
    try {
      const rows = await this.db.all('SELECT * FROM activities');
      return rows.map((row: any) => ({
        ...row,
        userId: row.userId !== null ? Number(row.userId) : null,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      return this.memoryDb.activities; // Fallback
    }
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.activities.filter(activity => activity.userId === userId);
    }
    try {
      const rows = await this.db.all('SELECT * FROM activities WHERE userId = ?', [userId]);
      return rows.map((row: any) => ({
        ...row,
        userId: row.userId !== null ? Number(row.userId) : null,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error(`Error fetching activities for user ${userId}:`, error);
      return this.memoryDb.activities.filter(activity => activity.userId === userId); // Fallback
    }
  }

  async getActivitiesByAsset(assetId: number): Promise<Activity[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.activities.filter(activity => activity.itemType === 'asset' && activity.itemId === assetId);
    }
    try {
      const rows = await this.db.all('SELECT * FROM activities WHERE itemType = ? AND itemId = ?', ['asset', assetId]);
      return rows.map((row: any) => ({
        ...row,
        userId: row.userId !== null ? Number(row.userId) : null,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error(`Error fetching activities for asset ${assetId}:`, error);
      return this.memoryDb.activities.filter(activity => activity.itemType === 'asset' && activity.itemId === assetId); // Fallback
    }
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    if (this.isMemoryStorage) {
      const id = this.activityCurrentId++;
      const activity: Activity = {
        ...insertActivity,
        id,
        notes: insertActivity.notes || null,
        userId: insertActivity.userId !== undefined ? insertActivity.userId : null,
        timestamp: new Date().toISOString()
      };
      this.memoryDb.activities.push(activity);
      return activity;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO activities (action, itemType, itemId, userId, notes) VALUES (?, ?, ?, ?, ?)',
        [insertActivity.action, insertActivity.itemType, insertActivity.itemId, insertActivity.userId, insertActivity.notes]
      );
      const id = result.lastID;
      const newActivity: Activity = { ...insertActivity, id, timestamp: new Date().toISOString() };
      this.activitiesData.set(id, newActivity);
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      // Fallback to memory store
      const id = this.activityCurrentId++;
      const activity: Activity = { ...insertActivity, id, timestamp: new Date().toISOString() };
      this.memoryDb.activities.push(activity);
      return activity;
    }
  }

  // BitLocker keys operations
  async getBitlockerKeys(): Promise<BitlockerKey[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.bitlockerKeys;
    }
    try {
      const rows = await this.db.all('SELECT * FROM bitlocker_keys');
      return rows.map((row: any) => ({
        ...row,
        dateAdded: new Date(row.dateAdded),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching Bitlocker keys:', error);
      return this.memoryDb.bitlockerKeys; // Fallback
    }
  }

  async getBitlockerKey(id: number): Promise<BitlockerKey | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.bitlockerKeys.find(k => k.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM bitlocker_keys WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        dateAdded: new Date(row.dateAdded),
        updatedAt: new Date(row.updatedAt),
      };
    } catch (error) {
      console.error(`Error fetching Bitlocker key with id ${id}:`, error);
      return this.memoryDb.bitlockerKeys.find(k => k.id === id); // Fallback
    }
  }

  async getBitlockerKeyBySerialNumber(serialNumber: string): Promise<BitlockerKey[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.bitlockerKeys.filter(k => k.serialNumber === serialNumber);
    }
    try {
      const rows = await this.db.all('SELECT * FROM bitlocker_keys WHERE serialNumber = ?', [serialNumber]);
      return rows.map((row: any) => ({
        ...row,
        dateAdded: new Date(row.dateAdded),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      console.error(`Error fetching Bitlocker keys by serial number ${serialNumber}:`, error);
      return this.memoryDb.bitlockerKeys.filter(k => k.serialNumber === serialNumber); // Fallback
    }
  }

  async getBitlockerKeyByIdentifier(identifier: string): Promise<BitlockerKey[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.bitlockerKeys.filter(k => k.identifier === identifier);
    }
    try {
      const rows = await this.db.all('SELECT * FROM bitlocker_keys WHERE identifier = ?', [identifier]);
      return rows.map((row: any) => ({
        ...row,
        dateAdded: new Date(row.dateAdded),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      console.error(`Error fetching Bitlocker keys by identifier ${identifier}:`, error);
      return this.memoryDb.bitlockerKeys.filter(k => k.identifier === identifier); // Fallback
    }
  }

  async createBitlockerKey(key: InsertBitlockerKey): Promise<BitlockerKey> {
    if (this.isMemoryStorage) {
      const newKey: BitlockerKey = {
        id: this.bitlockerKeyCurrentId++,
        ...key,
        dateAdded: new Date(),
        updatedAt: new Date(),
      };
      this.memoryDb.bitlockerKeys.push(newKey);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "bitlocker",
        itemId: newKey.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `BitLocker key for ${newKey.serialNumber} created (memory storage)`,
      });
      return newKey;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO bitlocker_keys (serialNumber, identifier, recoveryKey, addedByUser) VALUES (?, ?, ?, ?)',
        [key.serialNumber, key.identifier, key.recoveryKey, key.addedByUser]
      );
      const id = result.lastID;
      const newKey: BitlockerKey = { ...key, id, dateAdded: new Date(), updatedAt: new Date() };
      this.bitlockerKeysData.set(id, newKey);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "bitlocker",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `BitLocker key for ${newKey.serialNumber} created`,
      });
      return newKey;
    } catch (error) {
      console.error('Error creating Bitlocker key:', error);
      // Fallback to memory store
      const newKey: BitlockerKey = {
        id: this.bitlockerKeyCurrentId++,
        ...key,
        dateAdded: new Date(),
        updatedAt: new Date(),
      };
      this.memoryDb.bitlockerKeys.push(newKey);
      await this.createActivity({
        action: "create",
        itemType: "bitlocker",
        itemId: newKey.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `BitLocker key for ${newKey.serialNumber} created (memory storage fallback)`,
      });
      return newKey;
    }
  }

  async updateBitlockerKey(id: number, keyData: Partial<InsertBitlockerKey>): Promise<BitlockerKey | undefined> {
    if (this.isMemoryStorage) {
      const keyIndex = this.memoryDb.bitlockerKeys.findIndex(k => k.id === id);
      if (keyIndex === -1) return undefined;
      const updatedKey = { ...this.memoryDb.bitlockerKeys[keyIndex], ...keyData, updatedAt: new Date() };
      this.memoryDb.bitlockerKeys[keyIndex] = updatedKey;
      return updatedKey;
    }
    try {
      const existingKey = await this.getBitlockerKey(id);
      if (!existingKey) return undefined;

      const updateQuery = `
        UPDATE bitlocker_keys SET 
          serialNumber = ?, identifier = ?, recoveryKey = ?, addedByUser = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        keyData.serialNumber !== undefined ? keyData.serialNumber : existingKey.serialNumber,
        keyData.identifier !== undefined ? keyData.identifier : existingKey.identifier,
        keyData.recoveryKey !== undefined ? keyData.recoveryKey : existingKey.recoveryKey,
        keyData.addedByUser !== undefined ? keyData.addedByUser : existingKey.addedByUser,
        new Date(),
        id
      ]);
      const updatedKey = { ...existingKey, ...keyData, updatedAt: new Date() };
      this.bitlockerKeysData.set(id, updatedKey);
      return updatedKey;
    } catch (error) {
      console.error(`Error updating Bitlocker key with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteBitlockerKey(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.bitlockerKeys.length;
      this.memoryDb.bitlockerKeys = this.memoryDb.bitlockerKeys.filter(k => k.id !== id);
      return this.memoryDb.bitlockerKeys.length < initialLength;
    }
    try {
      const result = await this.db.run('DELETE FROM bitlocker_keys WHERE id = ?', [id]);
      this.bitlockerKeysData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting Bitlocker key with id ${id}:`, error);
      return false;
    }
  }

  // VM Inventory operations
  async getVmInventory(): Promise<VmInventory[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.vmInventory;
    }
    try {
      const rows = await this.db.all('SELECT * FROM vm_inventory');
      return rows.map((row: any) => ({
        ...row,
        lastModified: row.lastModified ? new Date(row.lastModified) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
      }));
    } catch (error) {
      console.error('Error fetching VM inventory:', error);
      return this.memoryDb.vmInventory; // Fallback
    }
  }

  async getVmInventoryItem(id: number): Promise<VmInventory | undefined> {
    if (this.isMemoryStorage) {
      return this.memoryDb.vmInventory.find(vm => vm.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM vm_inventory WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        lastModified: row.lastModified ? new Date(row.lastModified) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
      };
    } catch (error) {
      console.error(`Error fetching VM inventory item with id ${id}:`, error);
      return this.memoryDb.vmInventory.find(vm => vm.id === id); // Fallback
    }
  }

  async createVmInventoryItem(vm: InsertVmInventory): Promise<VmInventory> {
    if (this.isMemoryStorage) {
      const id = this.vmInventoryCurrentId++;
      const now = new Date().toISOString();
      const newVm: VmInventory = {
        id,
        ...vm,
        lastModified: now,
        createdAt: now,
      };
      this.memoryDb.vmInventory.push(newVm);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "vm",
        itemId: id,
        userId: null,
        timestamp: now,
        notes: `VM "${vm.vmName}" added to inventory`,
      });
      return newVm;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO vm_inventory (vmName, vmId, vmIpAddress, vmOs, vmRamGB, vmCpuCores, vmStorageGB, vmPowerState) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [vm.vmName, vm.vmId, vm.vmIpAddress, vm.vmOs, vm.vmRamGB, vm.vmCpuCores, vm.vmStorageGB, vm.vmPowerState]
      );
      const id = result.lastID;
      const now = new Date().toISOString();
      const newVm: VmInventory = { ...vm, id, lastModified: now, createdAt: now };
      this.vmInventoryData.set(id, newVm);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "vm",
        itemId: id,
        userId: null,
        timestamp: now,
        notes: `VM "${vm.vmName}" added to inventory`,
      });
      return newVm;
    } catch (error) {
      console.error('Error creating VM inventory item:', error);
      // Fallback to memory store
      const id = this.vmInventoryCurrentId++;
      const now = new Date().toISOString();
      const newVm: VmInventory = { ...vm, id, lastModified: now, createdAt: now };
      this.memoryDb.vmInventory.push(newVm);
      await this.createActivity({
        action: "create",
        itemType: "vm",
        itemId: id,
        userId: null,
        timestamp: now,
        notes: `VM "${vm.vmName}" added to inventory (memory storage fallback)`,
      });
      return newVm;
    }
  }

  async updateVmInventoryItem(id: number, vm: Partial<InsertVmInventory>): Promise<VmInventory | undefined> {
    if (this.isMemoryStorage) {
      const vmIndex = this.memoryDb.vmInventory.findIndex(v => v.id === id);
      if (vmIndex === -1) return undefined;
      const now = new Date().toISOString();
      const updatedVm = { ...this.memoryDb.vmInventory[vmIndex], ...vm, lastModified: now };
      this.memoryDb.vmInventory[vmIndex] = updatedVm;
      return updatedVm;
    }
    try {
      const existingVm = await this.getVmInventoryItem(id);
      if (!existingVm) return undefined;

      const updateQuery = `
        UPDATE vm_inventory SET 
          vmName = ?, vmId = ?, vmIpAddress = ?, vmOs = ?, vmRamGB = ?, vmCpuCores = ?, vmStorageGB = ?, vmPowerState = ?, lastModified = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        vm.vmName !== undefined ? vm.vmName : existingVm.vmName,
        vm.vmId !== undefined ? vm.vmId : existingVm.vmId,
        vm.vmIpAddress !== undefined ? vm.vmIpAddress : existingVm.vmIpAddress,
        vm.vmOs !== undefined ? vm.vmOs : existingVm.vmOs,
        vm.vmRamGB !== undefined ? vm.vmRamGB : existingVm.vmRamGB,
        vm.vmCpuCores !== undefined ? vm.vmCpuCores : existingVm.vmCpuCores,
        vm.vmStorageGB !== undefined ? vm.vmStorageGB : existingVm.vmStorageGB,
        vm.vmPowerState !== undefined ? vm.vmPowerState : existingVm.vmPowerState,
        new Date().toISOString(),
        id
      ]);
      const now = new Date().toISOString();
      const updatedVm: VmInventory = { ...existingVm, ...vm, lastModified: now };
      this.vmInventoryData.set(id, updatedVm);

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "vm",
        itemId: id,
        userId: null,
        timestamp: now,
        notes: `VM "${updatedVm.vmName}" updated`,
      });
      return updatedVm;
    } catch (error) {
      console.error(`Error updating VM inventory item with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteVmInventoryItem(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.memoryDb.vmInventory.length;
      this.memoryDb.vmInventory = this.memoryDb.vmInventory.filter(vm => vm.id !== id);
      return this.memoryDb.vmInventory.length < initialLength;
    }
    try {
      const vm = await this.getVmInventoryItem(id);
      if (!vm) return false;

      const result = await this.db.run('DELETE FROM vm_inventory WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "vm",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `VM "${vm.vmName}" deleted from inventory`,
        });
      }
      this.vmInventoryData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting VM inventory item with id ${id}:`, error);
      return false;
    }
  }

  // IAM Accounts operations
  async getIamAccounts(): Promise<any[]> {
    if (this.isMemoryStorage) {
      return this.memoryDb.iamAccounts || [];
    }
    try {
      const rows = await this.db.all('SELECT * FROM iam_accounts ORDER BY id DESC');
      return rows;
    } catch (error) {
      console.error('Error fetching IAM accounts:', error);
      return [];
    }
  }

  async getIamAccount(id: number): Promise<any | undefined> {
    if (this.isMemoryStorage) {
      return (this.memoryDb.iamAccounts || []).find((acc: any) => acc.id === id);
    }
    try {
      const row = await this.db.get('SELECT * FROM iam_accounts WHERE id = ?', [id]);
      return row;
    } catch (error) {
      console.error(`Error fetching IAM account with id ${id}:`, error);
      return undefined;
    }
  }

  async updateIamAccount(id: number, data: any): Promise<any | undefined> {
    if (this.isMemoryStorage) {
      const accounts = this.memoryDb.iamAccounts || [];
      const index = accounts.findIndex((acc: any) => acc.id === id);
      if (index === -1) return undefined;

      accounts[index] = { ...accounts[index], ...data, updatedAt: new Date().toISOString() };
      return accounts[index];
    }
    try {
      const existing = await this.getIamAccount(id);
      if (!existing) return undefined;

      const updateFields = [];
      const updateValues = [];

      for (const [key, value] of Object.entries(data)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(id);

      const updateQuery = `UPDATE iam_accounts SET ${updateFields.join(', ')} WHERE id = ?`;
      await this.db.run(updateQuery, updateValues);

      return await this.getIamAccount(id);
    } catch (error) {
      console.error(`Error updating IAM account with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteIamAccount(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const accounts = this.memoryDb.iamAccounts || [];
      const initialLength = accounts.length;
      this.memoryDb.iamAccounts = accounts.filter((acc: any) => acc.id !== id);
      return (this.memoryDb.iamAccounts?.length || 0) < initialLength;
    }
    try {
      const result = await this.db.run('DELETE FROM iam_accounts WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting IAM account with id ${id}:`, error);
      return false;
    }
  }

  async importIamAccounts(accounts: any[]): Promise<any> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    for (const account of accounts) {
      try {
        if (this.isMemoryStorage) {
          const accounts = this.memoryDb.iamAccounts || [];
          const id = accounts.length + 1;
          const newAccount = {
            ...account,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          accounts.push(newAccount);
          this.memoryDb.iamAccounts = accounts;
        } else {
          const nameValue = account.name !== undefined && account.name !== null && account.name.trim() !== '' 
            ? account.name 
            : null;

          await this.db.run(
            `INSERT INTO iam_accounts (requestor, knox_id, name, user_knox_id, permission, duration_start_date, duration_end_date, cloud_platform, project_accounts, approval_id, remarks, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [account.requestor || null, account.knoxId || null, nameValue, account.userKnoxId || null, account.permission || null, 
             account.durationStartDate || null, account.durationEndDate || null, 
             account.cloudPlatform || null, account.projectAccounts || null, account.approvalId || null, 
             account.remarks || null, account.status || 'active']
          );
        }
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to import account: ${error.message}`);
      }
    }

    return results;
  }

  // Azure Inventory operations
  async getAzureInventory(): Promise<any[]> {
    if (this.isMemoryStorage) {
      return Array.from(this.azureInventoryData.values());
    }
    try {
      const rows = await this.db.all('SELECT * FROM azure_inventory ORDER BY id DESC');
      return rows;
    } catch (error) {
      console.error('Error fetching Azure inventory:', error);
      return [];
    }
  }

  async createAzureInventory(data: any): Promise<any> {
    if (this.isMemoryStorage) {
      const id = this.azureInventoryCurrentId++;
      const newRecord = {
        id,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.azureInventoryData.set(id, newRecord);
      return newRecord;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO azure_inventory (resourceGroupName, resourceType, resourceName, location, subscriptionId, resourceId, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.resourceGroupName, data.resourceType, data.resourceName, data.location, data.subscriptionId, data.resourceId, JSON.stringify(data.tags)]
      );
      const id = result.lastID;
      const newRecord = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.azureInventoryData.set(id, newRecord);
      return newRecord;
    } catch (error) {
      console.error('Error creating Azure inventory record:', error);
      // Fallback to memory store
      const id = this.azureInventoryCurrentId++;
      const newRecord = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.azureInventoryData.set(id, newRecord);
      return newRecord;
    }
  }

  async updateAzureInventory(id: number, data: any): Promise<any> {
    if (this.isMemoryStorage) {
      const record = this.azureInventoryData.get(id);
      if (!record) return undefined;
      const updatedRecord = { ...record, ...data, updatedAt: new Date().toISOString() };
      this.azureInventoryData.set(id, updatedRecord);
      return updatedRecord;
    }
    try {
      const existing = await this.getAzureInventory().then(inv => inv.find(item => item.id === id));
      if (!existing) return undefined;

      await db
        .update(azureInventory)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(azureInventory.id, id));

      return await this.getAzureInventory().then(inv => inv.find(item => item.id === id));
    } catch (error) {
      console.error(`Error updating Azure inventory with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteAzureInventory(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const sizeBefore = this.azureInventoryData.size;
      this.azureInventoryData.delete(id);
      return this.azureInventoryData.size < sizeBefore;
    }
    try {
      const result = await this.db.run('DELETE FROM azure_inventory WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting Azure inventory with id ${id}:`, error);
      return false;
    }
  }

  // GCP Inventory operations
  async getGcpInventory(): Promise<any[]> {
    if (this.isMemoryStorage) {
      return Array.from(this.gcpInventoryData.values());
    }
    try {
      const rows = await this.db.all('SELECT * FROM gcp_inventory ORDER BY id DESC');
      return rows;
    } catch (error) {
      console.error('Error fetching GCP inventory:', error);
      return [];
    }
  }

  async createGcpInventory(data: any): Promise<any> {
    if (this.isMemoryStorage) {
      const id = this.gcpInventoryCurrentId++;
      const newRecord = {
        id,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.gcpInventoryData.set(id, newRecord);
      return newRecord;
    }
    try {
      const result = await this.db.run(
        `INSERT INTO gcp_inventory (projectName, projectId, resourceType, resourceName, location, zone, resourceId, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.projectName, data.projectId, data.resourceType, data.resourceName, data.location, data.zone, data.resourceId, JSON.stringify(data.tags)]
      );
      const id = result.lastID;
      const newRecord = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.gcpInventoryData.set(id, newRecord);
      return newRecord;
    } catch (error) {
      console.error('Error creating GCP inventory record:', error);
      // Fallback to memory store
      const id = this.gcpInventoryCurrentId++;
      const newRecord = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.gcpInventoryData.set(id, newRecord);
      return newRecord;
    }
  }

  async updateGcpInventory(id: number, data: any): Promise<any> {
    if (this.isMemoryStorage) {
      const record = this.gcpInventoryData.get(id);
      if (!record) return undefined;
      const updatedRecord = { ...record, ...data, updatedAt: new Date().toISOString() };
      this.gcpInventoryData.set(id, updatedRecord);
      return updatedRecord;
    }
    try {
      const existing = await this.getGcpInventory().then(inv => inv.find(item => item.id === id));
      if (!existing) return undefined;

      const updateQuery = `
        UPDATE gcp_inventory SET 
          projectName = ?, projectId = ?, resourceType = ?, resourceName = ?, location = ?, zone = ?, resourceId = ?, tags = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        data.projectName !== undefined ? data.projectName : existing.projectName,
        data.projectId !== undefined ? data.projectId : existing.projectId,
        data.resourceType !== undefined ? data.resourceType : existing.resourceType,
        data.resourceName !== undefined ? data.resourceName : existing.resourceName,
        data.location !== undefined ? data.location : existing.location,
        data.zone !== undefined ? data.zone : existing.zone,
        data.resourceId !== undefined ? data.resourceId : existing.resourceId,
        data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
        new Date().toISOString(),
        id
      ]);
      return await this.getGcpInventory().then(inv => inv.find(item => item.id === id));
    } catch (error) {
      console.error(`Error updating GCP inventory with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteGcpInventory(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const sizeBefore = this.gcpInventoryData.size;
      this.gcpInventoryData.delete(id);
      return this.gcpInventoryData.size < sizeBefore;
    }
    try {
      const result = await this.db.run('DELETE FROM gcp_inventory WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting GCP inventory with id ${id}:`, error);
      return false;
    }
  }

  // Page Builder methods
  async getPageBySlug(slug: string): Promise<any | undefined> {
    if (this.isMemoryStorage) {
      // In memory storage, we don't store custom pages
      return undefined;
    }
    try {
      const row = await this.db.get('SELECT * FROM custom_pages WHERE page_slug = ?', [slug]);
      if (!row) return undefined;

      return {
        ...row,
        columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
        filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
        sortConfig: typeof row.sort_config === 'string' ? JSON.parse(row.sort_config) : row.sort_config,
        paginationConfig: typeof row.pagination_config === 'string' ? JSON.parse(row.pagination_config) : row.pagination_config,
        tableName: row.table_name,
        pageName: row.page_name,
        pageSlug: row.page_slug
      };
    } catch (error) {
      console.error(`Error fetching page by slug ${slug}:`, error);
      return undefined;
    }
  }

  // VM Management methods
  async getVMs(): Promise<any[]> {
    return this.vms;
  }

  async getVM(id: number): Promise<any | null> {
    return this.vms.find(vm => vm.id === id) || null;
  }

  async createVM(vmData: any): Promise<any> {
    const vm = {
      id: this.vms.length + 1,
      ...vmData,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    this.vms.push(vm);
    return vm;
  }

  async updateVM(id: number, vmData: any): Promise<any | null> {
    const index = this.vms.findIndex(vm => vm.id === id);
    if (index === -1) return null;

    this.vms[index] = {
      ...this.vms[index],
      ...vmData,
      lastModified: new Date().toISOString()
    };

    return this.vms[index];
  }

  async deleteVM(id: number): Promise<boolean> {
    const index = this.vms.findIndex(vm => vm.id === id);
    if (index === -1) return false;

    this.vms.splice(index, 1);
    return true;
  }

  // IT Equipment methods
  async getITEquipment(): Promise<any[]> {
    return this.itEquipment;
  }

  async getITEquipmentById(id: number): Promise<any | null> {
    return this.itEquipment.find(eq => eq.id === id) || null;
  }

  async createITEquipment(data: any): Promise<any> {
    const equipment = {
      id: this.itEquipment.length + 1,
      ...data,
      assignedQuantity: data.assignedQuantity || 0,
      status: data.status || 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.itEquipment.push(equipment);

    // Create activity record
    this.createActivity({
      action: "create",
      itemType: "it-equipment",
      itemId: equipment.id,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `IT Equipment "${equipment.name}" created`,
    });

    return equipment;
  }

  async updateITEquipment(id: number, data: any): Promise<any | null> {
    const index = this.itEquipment.findIndex(eq => eq.id === id);
    if (index === -1) return null;

    this.itEquipment[index] = {
      ...this.itEquipment[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Create activity record
    this.createActivity({
      action: "update",
      itemType: "it-equipment",
      itemId: id,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `IT Equipment "${this.itEquipment[index].name}" updated`,
    });

    return this.itEquipment[index];
  }

  async deleteITEquipment(id: number): Promise<boolean> {
    const index = this.itEquipment.findIndex(eq => eq.id === id);
    if (index === -1) return false;

    const equipment = this.itEquipment[index];
    this.itEquipment.splice(index, 1);

    // Remove all assignments for this equipment
    this.itEquipmentAssignments = this.itEquipmentAssignments.filter(a => a.equipmentId !== id);

    // Create activity record
    this.createActivity({
      action: "delete",
      itemType: "it-equipment",
      itemId: id,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `IT Equipment "${equipment.name}" deleted`,
    });

    return true;
  }

  // IT Equipment Assignment methods
  async getITEquipmentAssignments(equipmentId: number): Promise<any[]> {
    return this.itEquipmentAssignments.filter(a => a.equipmentId === equipmentId);
  }

  async assignITEquipment(equipmentId: number, assignmentData: any): Promise<any> {
    const assignment = {
      id: this.itEquipmentAssignments.length + 1,
      equipmentId,
      assignedTo: assignmentData.assignedTo,
      knoxId: assignmentData.knoxId || null,
      serialNumber: assignmentData.serialNumber || null,
      quantity: assignmentData.quantity || 1,
      assignedDate: assignmentData.assignedDate || new Date().toISOString(),
      status: 'assigned',
      notes: assignmentData.notes || null
    };

    this.itEquipmentAssignments.push(assignment);

    // Update equipment assigned quantity
    const equipment = this.itEquipment.find(eq => eq.id === equipmentId);
    if (equipment) {
      equipment.assignedQuantity = (equipment.assignedQuantity || 0) + assignment.quantity;
      equipment.updatedAt = new Date().toISOString();
    }

    // Create activity record
    this.createActivity({
      action: "assign",
      itemType: "it-equipment",
      itemId: equipmentId,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `IT Equipment assigned to: ${assignmentData.assignedTo} (Qty: ${assignment.quantity})`,
    });

    return assignment;
  }

  async bulkAssignITEquipment(equipmentId: number, assignments: any[]): Promise<any[]> {
    const createdAssignments = [];

    for (const assignmentData of assignments) {
      const assignment = await this.assignITEquipment(equipmentId, assignmentData);
      createdAssignments.push(assignment);
    }

    return createdAssignments;
  }

  // Stats operations
  async getAssetStats(): Promise<AssetStats> {
    const assets = await this.getAssets();
    return {
      total: assets.length,
      checkedOut: assets.filter(asset => asset.status === AssetStatus.DEPLOYED).length,
      available: assets.filter(asset => asset.status === AssetStatus.AVAILABLE).length,
      pending: assets.filter(asset => asset.status === AssetStatus.PENDING).length,
      overdue: assets.filter(asset => asset.status === AssetStatus.OVERDUE).length,
      archived: assets.filter(asset => asset.status === AssetStatus.ARCHIVED).length,
      reserved: assets.filter(asset => asset.status === AssetStatus.RESERVED).length,
    };
  }

  // Zabbix settings operations
  async getZabbixSettings(): Promise<ZabbixSettings | undefined> {
    if (this.isMemoryStorage) {
      return this.zabbixSettingsData;
    }
    try {
      const row = await this.db.get('SELECT * FROM zabbix_settings WHERE id = 1');
      return row ? {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      } : undefined;
    } catch (error) {
      console.error('Error fetching Zabbix settings:', error);
      return this.zabbixSettingsData; // Fallback
    }
  }

  async saveZabbixSettings(settings: InsertZabbixSettings): Promise<ZabbixSettings> {
    if (this.isMemoryStorage) {
      this.zabbixSettingsData = { ...settings, id: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "settings",
        itemId: 1,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: "Zabbix integration settings updated (memory storage)",
      });
      return this.zabbixSettingsData;
    }
    try {
      const zabbixSettings: ZabbixSettings = {
        ...settings,
        id: 1, // Only one row for settings
        updatedAt: new Date().toISOString()
      };
      await this.db.run(
        `INSERT INTO zabbix_settings (id, zabbixUrl, zabbixUser, zabbixPassword, updatedAt) 
         VALUES (?, ?, ?, ?, ?) 
         ON CONFLICT(id) DO UPDATE SET 
           zabbixUrl = excluded.zabbixUrl, 
           zabbixUser = excluded.zabbixUser, 
           zabbixPassword = excluded.zabbixPassword, 
           updatedAt = excluded.updatedAt`,
        [zabbixSettings.id, zabbixSettings.zabbixUrl, zabbixSettings.zabbixUser, zabbixSettings.zabbixPassword, zabbixSettings.updatedAt]
      );

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "settings",
        itemId: 1,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: "Zabbix integration settings updated",
      });
      this.zabbixSettingsData = zabbixSettings; // Update internal state
      return zabbixSettings;
    } catch (error) {
      console.error('Error saving Zabbix settings:', error);
      // Fallback to memory store
      this.zabbixSettingsData = { ...settings, id: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await this.createActivity({
        action: "update",
        itemType: "settings",
        itemId: 1,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: "Zabbix integration settings updated (memory storage fallback)",
      });
      return this.zabbixSettingsData;
    }
  }

  // Zabbix subnet operations
  async getZabbixSubnets(): Promise<ZabbixSubnet[]> {
    if (this.isMemoryStorage) {
      return Array.from(this.zabbixSubnets.values());
    }
    try {
      const rows = await this.db.all('SELECT * FROM zabbix_subnets');
      return rows.map((row: any) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching Zabbix subnets:', error);
      return Array.from(this.zabbixSubnets.values()); // Fallback
    }
  }

  async getZabbixSubnet(id: number): Promise<ZabbixSubnet | undefined> {
    if (this.isMemoryStorage) {
      return this.zabbixSubnets.get(id);
    }
    try {
      const row = await this.db.get('SELECT * FROM zabbix_subnets WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    } catch (error) {
      console.error(`Error fetching Zabbix subnet with id ${id}:`, error);
      return this.zabbixSubnets.get(id); // Fallback
    }
  }

  async createZabbixSubnet(subnet: InsertZabbixSubnet): Promise<ZabbixSubnet> {
    if (this.isMemoryStorage) {
      const id = this.zabbixSubnetCurrentId++;
      const zabbixSubnet: ZabbixSubnet = {
        ...subnet,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.zabbixSubnetsData.set(id, zabbixSubnet);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "subnet",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `CIDR range "${subnet.cidrRange}" added for monitoring`,
      });
      return zabbixSubnet;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO zabbix_subnets (cidrRange, description) VALUES (?, ?)',
        [subnet.cidrRange, subnet.description]
      );
      const id = result.lastID;
      const zabbixSubnet: ZabbixSubnet = { ...subnet, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.zabbixSubnetsData.set(id, zabbixSubnet);

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "subnet",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `CIDR range "${subnet.cidrRange}" added for monitoring`,
      });
      return zabbixSubnet;
    } catch (error) {
      console.error('Error creating Zabbix subnet:', error);
      // Fallback to memory store
      const id = this.zabbixSubnetCurrentId++;
      const zabbixSubnet: ZabbixSubnet = { ...subnet, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.zabbixSubnetsData.set(id, zabbixSubnet);
      await this.createActivity({
        action: "create",
        itemType: "subnet",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `CIDR range "${subnet.cidrRange}" added for monitoring (memory storage fallback)`,
      });
      return zabbixSubnet;
    }
  }

  async deleteZabbixSubnet(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.zabbixSubnets.size;
      this.zabbixSubnets.delete(id);
      return this.zabbixSubnets.size < initialLength;
    }
    try {
      const subnet = await this.getZabbixSubnet(id);
      if (!subnet) return false;

      const result = await this.db.run('DELETE FROM zabbix_subnets WHERE id = ?', [id]);

      if (result.changes > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "subnet",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `CIDR range "${subnet.cidrRange}" removed from monitoring`,
        });
      }
      this.zabbixSubnetsData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting Zabbix subnet with id ${id}:`, error);
      return false;
    }
  }

  // VM monitoring operations
  async getVMMonitoring(): Promise<VMMonitoring[]> {
    if (this.isMemoryStorage) {
      return Array.from(this.vmMonitoringData.values());
    }
    try {
      const rows = await this.db.all('SELECT * FROM vm_monitoring');
      return rows.map((row: any) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching VM monitoring:', error);
      return Array.from(this.vmMonitoringData.values()); // Fallback
    }
  }

  async getVMMonitoringByVMId(vmId: number): Promise<VMMonitoring | undefined> {
    if (this.isMemoryStorage) {
      return Array.from(this.vmMonitoringData.values()).find(vm => vm.vmId === vmId);
    }
    try {
      const row = await this.db.get('SELECT * FROM vm_monitoring WHERE vmId = ?', [vmId]);
      if (!row) return undefined;
      return {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    } catch (error) {
      console.error(`Error fetching VM monitoring by VM ID ${vmId}:`, error);
      return Array.from(this.vmMonitoringData.values()).find(vm => vm.vmId === vmId); // Fallback
    }
  }

  async createVMMonitoring(monitoring: InsertVMMonitoring): Promise<VMMonitoring> {
    if (this.isMemoryStorage) {
      const id = this.vmMonitoringCurrentId++;
      const vmMonitoring: VMMonitoring = {
        ...monitoring,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.vmMonitoringData.set(id, vmMonitoring);
      return vmMonitoring;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO vm_monitoring (vmId, vmName, monitoringEnabled, checkInterval) VALUES (?, ?, ?, ?)',
        [monitoring.vmId, monitoring.vmName, monitoring.monitoringEnabled, monitoring.checkInterval]
      );
      const id = result.lastID;
      const vmMonitoring: VMMonitoring = { ...monitoring, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.vmMonitoringData.set(id, vmMonitoring);
      return vmMonitoring;
    } catch (error) {
      console.error('Error creating VM monitoring:', error);
      // Fallback to memory store
      const id = this.vmMonitoringCurrentId++;
      const vmMonitoring: VMMonitoring = { ...monitoring, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.vmMonitoringData.set(id, vmMonitoring);
      return vmMonitoring;
    }
  }

  async updateVMMonitoring(id: number, updateData: Partial<InsertVMMonitoring>): Promise<VMMonitoring | undefined> {
    if (this.isMemoryStorage) {
      const vmMonitoringIndex = this.vmMonitoringData.get(id);
      if (!vmMonitoringIndex) return undefined;
      const updatedVMMonitoring = { ...vmMonitoringIndex, ...updateData, updatedAt: new Date().toISOString() };
      this.vmMonitoringData.set(id, updatedVMMonitoring);
      return updatedVMMonitoring;
    }
    try {
      const vmMonitoring = await this.getVMMonitoringByVMId(id); // Assuming id is vmId here for the sake of the example, though it should be the monitoring entry id
      if (!vmMonitoring) return undefined;

      // Correcting the query to use the monitoring entry ID
      const updateQuery = `
        UPDATE vm_monitoring SET 
          vmName = ?, monitoringEnabled = ?, checkInterval = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.vmName !== undefined ? updateData.vmName : vmMonitoring.vmName,
        updateData.monitoringEnabled !== undefined ? updateData.monitoringEnabled : vmMonitoring.monitoringEnabled,
        updateData.checkInterval !== undefined ? updateData.checkInterval : vmMonitoring.checkInterval,
        new Date().toISOString(),
        id // Use the correct ID for the update
      ]);
      const updatedVMMonitoring = { ...vmMonitoring, ...updateData, updatedAt: new Date().toISOString() };
      this.vmMonitoringData.set(id, updatedVMMonitoring);
      return updatedVMMonitoring;
    } catch (error) {
      console.error(`Error updating VM monitoring with id ${id}:`, error);
      return undefined;
    }
  }

  // Discovered hosts operations
  async getDiscoveredHosts(): Promise<DiscoveredHost[]> {
    if (this.isMemoryStorage) {
      return Array.from(this.discoveredHostsData.values());
    }
    try {
      const rows = await this.db.all('SELECT * FROM discovered_hosts');
      return rows.map((row: any) => ({
        ...row,
        lastSeen: row.lastSeen ? new Date(row.lastSeen) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
      }));
    } catch (error) {
      console.error('Error fetching discovered hosts:', error);
      return Array.from(this.discoveredHostsData.values()); // Fallback
    }
  }

  async getDiscoveredHost(id: number): Promise<DiscoveredHost | undefined> {
    if (this.isMemoryStorage) {
      return this.discoveredHostsData.get(id);
    }
    try {
      const row = await this.db.get('SELECT * FROM discovered_hosts WHERE id = ?', [id]);
      if (!row) return undefined;
      return {
        ...row,
        lastSeen: row.lastSeen ? new Date(row.lastSeen) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
      };
    } catch (error) {
      console.error(`Error fetching discovered host with id ${id}:`, error);
      return this.discoveredHostsData.get(id); // Fallback
    }
  }

  async createDiscoveredHost(host: InsertDiscoveredHost): Promise<DiscoveredHost> {
    if (this.isMemoryStorage) {
      const id = this.discoveredHostCurrentId++;
      const discoveredHost: DiscoveredHost = {
        ...host,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.discoveredHostsData.set(id, discoveredHost);
      return discoveredHost;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO discovered_hosts (ipAddress, hostname, os, lastSeen) VALUES (?, ?, ?, ?)',
        [host.ipAddress, host.hostname, host.os, host.lastSeen]
      );
      const id = result.lastID;
      const discoveredHost: DiscoveredHost = { ...host, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.discoveredHostsData.set(id, discoveredHost);
      return discoveredHost;
    } catch (error) {
      console.error('Error creating discovered host:', error);
      // Fallback to memory store
      const id = this.discoveredHostCurrentId++;
      const discoveredHost: DiscoveredHost = { ...host, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.discoveredHostsData.set(id, discoveredHost);
      return discoveredHost;
    }
  }

  async updateDiscoveredHost(id: number, updateData: Partial<InsertDiscoveredHost>): Promise<DiscoveredHost | undefined> {
    if (this.isMemoryStorage) {
      const discoveredHost = this.discoveredHostsData.get(id);
      if (!discoveredHost) return undefined;
      const updatedDiscoveredHost = { ...discoveredHost, ...updateData, updatedAt: new Date().toISOString() };
      this.discoveredHostsData.set(id, updatedDiscoveredHost);
      return updatedDiscoveredHost;
    }
    try {
      const existingHost = await this.getDiscoveredHost(id);
      if (!existingHost) return undefined;

      const updateQuery = `
        UPDATE discovered_hosts SET 
          ipAddress = ?, hostname = ?, os = ?, lastSeen = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db.run(updateQuery, [
        updateData.ipAddress !== undefined ? updateData.ipAddress : existingHost.ipAddress,
        updateData.hostname !== undefined ? updateData.hostname : existingHost.hostname,
        updateData.os !== undefined ? updateData.os : existingHost.os,
        updateData.lastSeen !== undefined ? updateData.lastSeen : existingHost.lastSeen,
        new Date().toISOString(),
        id
      ]);
      const updatedDiscoveredHost: DiscoveredHost = { ...existingHost, ...updateData, updatedAt: new Date().toISOString() };
      this.discoveredHostsData.set(id, updatedDiscoveredHost);
      return updatedDiscoveredHost;
    } catch (error) {
      console.error(`Error updating discovered host with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteDiscoveredHost(id: number): Promise<boolean> {
    if (this.isMemoryStorage) {
      const initialLength = this.discoveredHostsData.size;
      this.discoveredHostsData.delete(id);
      return this.discoveredHostsData.size < initialLength;
    }
    try {
      const result = await this.db.run('DELETE FROM discovered_hosts WHERE id = ?', [id]);
      this.discoveredHostsData.delete(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting discovered host with id ${id}:`, error);
      return false;
    }
  }

  // JIRA Integration
  async saveJiraSettings(settings: any): Promise<void> {
    if (this.isMemoryStorage) {
      this.memoryDb.jiraSettings = settings;
      console.log('JIRA settings saved to memory:', settings);
      return;
    }
    try {
      const query = `
        INSERT INTO jira_settings (id, settings, created_at, updated_at) 
        VALUES (1, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET 
          settings = excluded.settings,
          updated_at = datetime('now')
      `;
      await this.db.run(query, [JSON.stringify(settings)]);
      console.log('JIRA settings saved to database:', settings);
    } catch (error) {
      console.error('Error saving JIRA settings:', error);
      // Fallback to memory storage
      this.memoryDb.jiraSettings = settings;
      console.log('JIRA settings saved to memory (fallback):', settings);
    }
  }

  async getJiraSettings(): Promise<any> {
    if (this.isMemoryStorage) {
      console.log('Getting JIRA settings from memory:', this.memoryDb.jiraSettings);
      return this.memoryDb.jiraSettings || null;
    }
    try {
      const query = 'SELECT settings FROM jira_settings WHERE id = 1';
      const row = await this.db.get(query);
      const settings = row ? JSON.parse(row.settings) : null;
      console.log('JIRA settings from database:', settings);
      return settings;
    } catch (error) {
      console.error('Error getting JIRA settings:', error);
      // Fallback to memory storage
      console.log('Getting JIRA settings from memory (fallback):', this.memoryDb.jiraSettings);
      return this.memoryDb.jiraSettings || null;
    }
  }

  // Issues
  async createIssue(issue: any): Promise<any> {
    this.issues.push(issue);
    return issue;
  }

  async getIssues(): Promise<any[]> {
    return this.issues;
  }

  // VM Approval History operations
  async getVmApprovalHistory(vmId: number): Promise<VmApprovalHistory[]> {
    if (this.isMemoryStorage) {
      const history = Array.from(this.vmApprovalHistoryData.values())
        .filter(h => h.vmId === vmId)
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
      return history;
    }
    try {
      if (!this.db) return [];
      const rows = await this.db.all('SELECT * FROM vm_approval_history WHERE vm_id = ? ORDER BY changed_at DESC', [vmId]);
      return rows.map((row: any) => ({
        ...row,
        changedAt: new Date(row.changed_at),
      }));
    } catch (error) {
      console.error('Error fetching VM approval history:', error);
      return Array.from(this.vmApprovalHistoryData.values())
        .filter(h => h.vmId === vmId)
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    }
  }

  async createVmApprovalHistory(insertHistory: InsertVmApprovalHistory): Promise<VmApprovalHistory> {
    if (this.isMemoryStorage) {
      const id = this.vmApprovalHistoryCurrentId++;
      const history: VmApprovalHistory = {
        ...insertHistory,
        id,
        changedAt: new Date(),
        createdAt: new Date(),
      };
      this.vmApprovalHistoryData.set(id, history);
      return history;
    }
    try {
      const result = await this.db.run(
        'INSERT INTO vm_approval_history (vm_id, old_approval_number, new_approval_number, changed_by, reason, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [insertHistory.vmId, insertHistory.oldApprovalNumber, insertHistory.newApprovalNumber, insertHistory.changedBy, insertHistory.reason, insertHistory.notes]
      );
      const id = result.lastID;
      const newHistory: VmApprovalHistory = { 
        ...insertHistory, 
        id, 
        changedAt: new Date(),
        createdAt: new Date(),
      };
      this.vmApprovalHistoryData.set(id, newHistory);
      return newHistory;
    } catch (error) {
      console.error('Error creating VM approval history:', error);
      const id = this.vmApprovalHistoryCurrentId++;
      const history: VmApprovalHistory = { 
        ...insertHistory, 
        id,
        changedAt: new Date(),
        createdAt: new Date(),
      };
      this.vmApprovalHistoryData.set(id, history);
      return history;
    }
  }

  // Encryption helper methods (pass-through to encryption module)
  encrypt(text: string | null | undefined): string | null {
    return encrypt(text);
  }

  decrypt(text: string | null | undefined): string | null {
    return decrypt(text);
  }

}

// Use the MemStorage for persistence (with better data handling)
export const storage = new MemStorage(mockDb); // Pass mockDb or actual db connection