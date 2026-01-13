import { db } from "./db";
import { sql } from "drizzle-orm";

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    );
  `);
  return result.rows[0]?.exists || false;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    );
  `);
  return result.rows[0]?.exists || false;
}

async function addColumn(tableName: string, columnName: string, definition: string) {
  await db.execute(sql.raw(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`));
  console.log(`✅ Added column ${columnName} to ${tableName}`);
}

export async function runMigrations() {
  try {
    console.log("🔄 Starting database migration...");

    // Create users table FIRST
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT UNIQUE,
        is_admin BOOLEAN DEFAULT FALSE,
        department TEXT,
        role_id INTEGER,
        mfa_secret TEXT,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        force_password_change BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '{"assets": {"view": true, "edit": false, "add": false}, "components": {"view": true, "edit": false, "add": false}, "accessories": {"view": true, "edit": false, "add": false}, "consumables": {"view": true, "edit": false, "add": false}, "licenses": {"view": true, "edit": false, "add": false}, "users": {"view": false, "edit": false, "add": false}, "reports": {"view": true, "edit": false, "add": false}, "vmMonitoring": {"view": true, "edit": false, "add": false}, "networkDiscovery": {"view": true, "edit": false, "add": false}, "bitlockerKeys": {"view": false, "edit": false, "add": false}, "admin": {"view": false, "edit": false, "add": false}}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table verified");

    // Create IAM Accounts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS iam_accounts (
        id SERIAL PRIMARY KEY,
        requestor TEXT NOT NULL,
        knox_id TEXT NOT NULL,
        name TEXT,
        user_knox_id TEXT,
        permission TEXT NOT NULL,
        duration_start_date TEXT,
        duration_end_date TEXT,
        cloud_platform TEXT NOT NULL,
        project_accounts TEXT,
        approval_id TEXT,
        remarks TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(knox_id, cloud_platform, project_accounts)
      )
    `);
    console.log("✅ IAM Accounts table verified");

    // All tables verification loop
    const allTables = [
      'assets', 'components', 'accessories', 'consumables', 'licenses',
      'license_assignments', 'consumable_assignments', 'activities', 'vm_inventory',
      'vms', 'monitor_inventory', 'bitlocker_keys', 'it_equipment', 'it_equipment_assignments',
      'system_settings', 'zabbix_settings', 'discovered_hosts', 'vm_monitoring',
      'vm_approval_history', 'azure_inventory', 'gcp_inventory', 'aws_inventory', 
      'custom_pages'
    ];

    for (const tableName of allTables) {
      if (!(await tableExists(tableName))) {
        console.log(`   ❌ ${tableName}: Table missing - Attempting to create...`);
        if (tableName === 'assets') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS assets (
              id SERIAL PRIMARY KEY,
              asset_tag TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              description TEXT,
              category TEXT NOT NULL,
              status TEXT NOT NULL,
              condition TEXT NOT NULL DEFAULT 'Good',
              purchase_date TEXT,
              purchase_cost TEXT,
              location TEXT,
              serial_number TEXT,
              model TEXT,
              manufacturer TEXT,
              notes TEXT,
              knox_id TEXT,
              ip_address TEXT,
              mac_address TEXT,
              os_type TEXT,
              assigned_to INTEGER REFERENCES users(id),
              checkout_date TEXT,
              expected_checkin_date TEXT,
              finance_updated BOOLEAN DEFAULT FALSE,
              department TEXT
            )
          `);
        } else if (tableName === 'components') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS components (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              category TEXT NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 0,
              status TEXT DEFAULT 'available',
              description TEXT,
              location TEXT,
              serial_number TEXT,
              model TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              purchase_cost TEXT,
              warranty_expiry TEXT,
              assigned_to TEXT,
              date_released TEXT,
              date_returned TEXT,
              released_by TEXT,
              returned_to TEXT,
              specifications TEXT,
              notes TEXT
            )
          `);
        } else if (tableName === 'accessories') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS accessories (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              status TEXT NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              description TEXT,
              location TEXT,
              serial_number TEXT,
              model TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              purchase_cost TEXT,
              assigned_to INTEGER REFERENCES users(id),
              knox_id TEXT,
              date_released TEXT,
              date_returned TEXT,
              released_by TEXT,
              returned_to TEXT,
              notes TEXT
            )
          `);
        } else if (tableName === 'consumables') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS consumables (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              status TEXT NOT NULL DEFAULT 'available',
              location TEXT,
              model_number TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              purchase_cost TEXT,
              notes TEXT
            )
          `);
        } else if (tableName === 'licenses') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS licenses (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              key TEXT NOT NULL,
              seats TEXT,
              assigned_seats INTEGER DEFAULT 0,
              company TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              expiration_date TEXT,
              purchase_cost TEXT,
              status TEXT NOT NULL,
              notes TEXT,
              assigned_to INTEGER REFERENCES users(id)
            )
          `);
        } else if (tableName === 'license_assignments') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS license_assignments (
              id SERIAL PRIMARY KEY,
              license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
              assigned_to TEXT NOT NULL,
              notes TEXT,
              assigned_date TEXT NOT NULL
            )
          `);
        } else if (tableName === 'consumable_assignments') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS consumable_assignments (
              id SERIAL PRIMARY KEY,
              consumable_id INTEGER NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
              assigned_to TEXT NOT NULL,
              serial_number TEXT,
              knox_id TEXT,
              quantity INTEGER NOT NULL DEFAULT 1,
              assigned_date TEXT NOT NULL,
              returned_date TEXT,
              status TEXT NOT NULL DEFAULT 'assigned',
              notes TEXT
            )
          `);
        } else if (tableName === 'activities') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS activities (
              id SERIAL PRIMARY KEY,
              action TEXT NOT NULL,
              item_type TEXT NOT NULL,
              item_id INTEGER NOT NULL,
              user_id INTEGER REFERENCES users(id),
              timestamp TEXT NOT NULL,
              notes TEXT
            )
          `);
        } else if (tableName === 'vms') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS vms (
              id SERIAL PRIMARY KEY,
              vm_name TEXT NOT NULL,
              host_name TEXT NOT NULL,
              guest_os TEXT NOT NULL,
              power_state TEXT NOT NULL DEFAULT 'stopped',
              cpu_count INTEGER DEFAULT 1,
              memory_mb INTEGER DEFAULT 1024,
              disk_gb INTEGER DEFAULT 20,
              ip_address TEXT,
              mac_address TEXT,
              vmware_tools TEXT,
              cluster TEXT,
              datastore TEXT,
              status TEXT NOT NULL DEFAULT 'available',
              assigned_to INTEGER REFERENCES users(id),
              location TEXT,
              serial_number TEXT,
              model TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              purchase_cost TEXT,
              department TEXT,
              description TEXT,
              created_date TEXT DEFAULT CURRENT_TIMESTAMP,
              last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
              notes TEXT
            )
          `);
        } else if (tableName === 'monitor_inventory') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS monitor_inventory (
              id SERIAL PRIMARY KEY,
              seat_number TEXT NOT NULL,
              knox_id TEXT,
              asset_number TEXT,
              serial_number TEXT,
              model TEXT,
              remarks TEXT,
              department TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `);
        } else if (tableName === 'bitlocker_keys') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS bitlocker_keys (
              id SERIAL PRIMARY KEY,
              serial_number TEXT NOT NULL,
              identifier TEXT NOT NULL,
              recovery_key TEXT NOT NULL,
              added_by_user TEXT,
              date_added TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `);
        } else if (tableName === 'it_equipment') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS it_equipment (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              total_quantity INTEGER,
              assigned_quantity INTEGER DEFAULT 0,
              model TEXT,
              location TEXT,
              date_acquired TEXT,
              knox_id TEXT,
              serial_number TEXT,
              date_release TEXT,
              remarks TEXT,
              status TEXT DEFAULT 'available',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
        } else if (tableName === 'it_equipment_assignments') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS it_equipment_assignments (
              id SERIAL PRIMARY KEY,
              equipment_id INTEGER NOT NULL REFERENCES it_equipment(id) ON DELETE CASCADE,
              assigned_to TEXT NOT NULL,
              knox_id TEXT,
              serial_number TEXT,
              quantity INTEGER NOT NULL DEFAULT 1,
              assigned_date TEXT NOT NULL,
              returned_date TEXT,
              status TEXT NOT NULL DEFAULT 'assigned',
              notes TEXT
            )
          `);
        } else if (tableName === 'system_settings') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS system_settings (
              id SERIAL PRIMARY KEY,
              site_name TEXT DEFAULT 'SRPH-MIS',
              company_name TEXT DEFAULT 'SRPH',
              auto_backup BOOLEAN DEFAULT FALSE,
              auto_optimize BOOLEAN DEFAULT FALSE,
              backup_time TEXT DEFAULT '03:00',
              optimize_time TEXT DEFAULT '04:00',
              retention_days INTEGER DEFAULT 30,
              email_notifications BOOLEAN DEFAULT TRUE,
              notify_on_iam_expiration BOOLEAN DEFAULT TRUE,
              notify_on_vm_expiration BOOLEAN DEFAULT TRUE,
              session_timeout INTEGER DEFAULT 1800,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
          `);
          await db.execute(sql`
            INSERT INTO system_settings (id, site_name, company_name) 
            VALUES (1, 'SRPH-MIS', 'SRPH')
            ON CONFLICT (id) DO NOTHING
          `);
        } else if (tableName === 'vm_inventory') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS vm_inventory (
              id SERIAL PRIMARY KEY,
              vm_id TEXT,
              vm_name TEXT NOT NULL,
              vm_status TEXT NOT NULL DEFAULT 'Active',
              vm_ip TEXT,
              vm_os TEXT,
              cpu_count INTEGER DEFAULT 0,
              memory_gb INTEGER DEFAULT 0,
              disk_capacity_gb INTEGER DEFAULT 0,
              requestor TEXT,
              knox_id TEXT,
              department TEXT,
              start_date TEXT,
              end_date TEXT,
              jira_number TEXT,
              approval_number TEXT,
              remarks TEXT,
              internet_access BOOLEAN DEFAULT FALSE,
              vm_os_version TEXT,
              hypervisor TEXT,
              host_name TEXT,
              host_ip TEXT,
              host_os TEXT,
              rack TEXT,
              deployed_by TEXT,
              "user" TEXT,
              jira_ticket TEXT,
              date_deleted TEXT,
              guest_os TEXT,
              power_state TEXT,
              memory_mb INTEGER,
              disk_gb INTEGER,
              ip_address TEXT,
              mac_address TEXT,
              vmware_tools TEXT,
              cluster TEXT,
              datastore TEXT,
              status TEXT DEFAULT 'available',
              assigned_to INTEGER,
              location TEXT,
              serial_number TEXT,
              model TEXT,
              manufacturer TEXT,
              purchase_date TEXT,
              purchase_cost TEXT,
              created_date TEXT DEFAULT CURRENT_TIMESTAMP,
              last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
              notes TEXT
            )
          `);
        } else if (tableName === 'vm_approval_history') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS vm_approval_history (
              id SERIAL PRIMARY KEY,
              vm_id INTEGER NOT NULL REFERENCES vm_inventory(id) ON DELETE CASCADE,
              old_approval_number TEXT,
              new_approval_number TEXT,
              changed_by INTEGER REFERENCES users(id),
              changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
              reason TEXT,
              notes TEXT,
              created_at TIMESTAMP DEFAULT NOW() NOT NULL
            )
          `);
        } else if (tableName === 'azure_inventory') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS azure_inventory (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              resource_group TEXT NOT NULL,
              location TEXT NOT NULL,
              subscriptions TEXT,
              status TEXT NOT NULL DEFAULT 'active',
              remarks TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
          `);
        } else if (tableName === 'gcp_inventory') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS gcp_inventory (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              resource_type TEXT NOT NULL,
              project_id TEXT NOT NULL,
              display_name TEXT NOT NULL,
              location TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active',
              remarks TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
          `);
        } else if (tableName === 'aws_inventory') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS aws_inventory (
              id SERIAL PRIMARY KEY,
              identifier TEXT NOT NULL,
              service TEXT NOT NULL,
              type TEXT NOT NULL,
              region TEXT NOT NULL,
              account_name TEXT NOT NULL,
              account_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active',
              remarks TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
          `);
        } else if (tableName === 'discovered_hosts') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS discovered_hosts (
              id SERIAL PRIMARY KEY,
              hostname TEXT,
              ip_address TEXT NOT NULL,
              mac_address TEXT,
              status TEXT NOT NULL DEFAULT 'new',
              last_seen TIMESTAMP DEFAULT NOW(),
              source TEXT NOT NULL DEFAULT 'zabbix',
              system_info JSON DEFAULT '{}',
              hardware_details JSON DEFAULT '{}',
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          `);
        } else if (tableName === 'vm_monitoring') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS vm_monitoring (
              id SERIAL PRIMARY KEY,
              vm_id INTEGER NOT NULL,
              hostname TEXT,
              ip_address TEXT,
              status TEXT,
              cpu_usage REAL,
              memory_usage REAL,
              disk_usage REAL,
              uptime INTEGER,
              network_status TEXT,
              os_name TEXT,
              cpu_cores INTEGER,
              total_memory BIGINT,
              total_disk BIGINT
            )
          `);
        } else if (tableName === 'custom_pages') {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS custom_pages (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              slug TEXT NOT NULL UNIQUE,
              content TEXT,
              is_published BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
      }

      if (await tableExists(tableName)) {
        console.log(`   ✅ ${tableName} verified`);
      }
    }

    console.log("🎉 Database migration and verification completed successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}