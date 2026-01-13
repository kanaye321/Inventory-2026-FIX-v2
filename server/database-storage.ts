import {
  users, assets, components, accessories, licenses, activities, consumables, licenseAssignments, consumableAssignments,
  itEquipment, itEquipmentAssignments,
  type User, type InsertUser,
  type Asset, type InsertAsset,
  type Activity, type InsertActivity,
  type License, type InsertLicense,
  type Accessory, type InsertAccessory,
  type Component, type InsertComponent,
  type Consumable, type InsertConsumable,
  type LicenseAssignment, type InsertLicenseAssignment,
  type ITEquipment, type InsertITEquipment,
  AssetStatus, LicenseStatus, AccessoryStatus, ConsumableStatus,
  // IAM Accounts import
  iamAccounts, type IamAccount, type InsertIamAccount,
  // Azure and GCP Inventory imports
  azureInventory, type AzureInventory, type InsertAzureInventory,
  gcpInventory, type GcpInventory, type InsertGcpInventory,
  // AWS Inventory imports
  awsInventory, awsHistoricalData,
} from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, sql, desc, like, or, and } from "drizzle-orm";
import type {
  InsertZabbixSettings, InsertZabbixSubnet, InsertDiscoveredHost, InsertVMMonitoring, InsertBitlockerKey
} from "@shared/schema";
import type {
  InsertUser, InsertAsset, InsertActivity, InsertLicense,
  InsertComponent, InsertAccessory, InsertConsumable,
  InsertLicenseAssignment, InsertConsumableAssignment
} from "@shared/schema";
import { encrypt, decrypt, encryptFields, decryptFields, PII_FIELDS, batchDecryptFields } from "./encryption";
import type { IStorage } from "./storage";

interface AssetStats {
  total: number;
  checkedOut: number;
  available: number;
  pending: number;
  overdue: number;
  archived: number;
}

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database tables...");

    // Test database connection first
    await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Database connection established/verified");
    console.log("📊 Using database:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

    // Import and run migrations
    const { runMigrations } = await import("./migrate");
    await runMigrations();

    // Check if iam_account_approval_history table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'iam_account_approval_history'
      );
    `);

    if (!tableExists.rows?.[0]?.exists) {
      console.warn("⚠️ The 'iam_account_approval_history' table does not exist. Please ensure it is created.");
      // Optionally, you could attempt to create it here if that's the desired behavior
      // await db.execute(sql`CREATE TABLE IF NOT EXISTS iam_account_approval_history (...)`);
    }

    return;

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(users);
      return result.map(user => ({
        ...user,
        password: undefined as any,
        mfaEnabled: user.mfaEnabled || false,
        mfaSecret: user.mfaSecret || null
      }));
    } catch (error) {
      console.error('Database error getting users:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!db) throw new Error("Database connection required");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    // Decrypt if it looks encrypted, regardless of ENCRYPTION_KEY being set (for legacy data)
    return user ? decryptFields(user, PII_FIELDS.user) : null;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error("Database connection required");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    // Decrypt if it looks encrypted, regardless of ENCRYPTION_KEY being set (for legacy data)
    return user ? decryptFields(user, PII_FIELDS.user) : null;
  }

  async createUser(userData: InsertUser) {
    if (!db) throw new Error("Database connection required");

    // Hash the password before storing
    const { scrypt, randomBytes } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);

    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(userData.password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;

    // Encrypt PII fields if ENCRYPTION_KEY is set
    const encryptedData = process.env.ENCRYPTION_KEY
      ? encryptFields(userData, PII_FIELDS.user)
      : userData;

    const [user] = await db.insert(schema.users).values({
      ...encryptedData,
      password: hashedPassword,
    }).returning();

    // Decrypt for return if ENCRYPTION_KEY is set
    return process.env.ENCRYPTION_KEY ? decryptFields(user, PII_FIELDS.user) : user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    // Get the current user if we need to return without updates
    if (Object.keys(updateData).length === 0) {
      return await this.getUser(id);
    }

    // Only encrypt PII fields if ENCRYPTION_KEY is set
    const encryptedUpdateData = process.env.ENCRYPTION_KEY
      ? encryptFields(updateData, PII_FIELDS.user)
      : updateData;

    const [updated] = await db.update(users)
      .set(encryptedUpdateData)
      .where(eq(users.id, id))
      .returning();

    // Decrypt for return if ENCRYPTION_KEY is set
    return updated ? (process.env.ENCRYPTION_KEY ? decryptFields(updated, PII_FIELDS.user) : updated) : undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Get user info before deletion for audit trail
      const userToDelete = await this.getUser(id);
      if (!userToDelete) {
        console.log(`User ${id} not found`);
        return false;
      }

      console.log(`Deleting user ${userToDelete.username} (ID: ${id}) from PostgreSQL database...`);

      // First, update activities to preserve audit trail - set userId to null and add deletion note
      await db.execute(sql`
        UPDATE activities 
        SET user_id = NULL, 
            notes = COALESCE(notes, '') || ' [User deleted: ' || ${userToDelete.username} || ']'
        WHERE user_id = ${id}
      `);

      console.log(`Updated activities to preserve audit trail for deleted user`);

      // Update assets to remove user assignments
      await db.execute(sql`
        UPDATE assets 
        SET assigned_to = NULL,
            status = 'available',
            checkout_date = NULL,
            expected_checkin_date = NULL
        WHERE assigned_to = ${id}
      `);

      console.log(`Updated assets to remove user assignments`);

      // Then delete the user
      const deleteResult = await db.delete(users)
        .where(eq(users.id, id));

      console.log(`Delete result for user ${id}:`, deleteResult);

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        console.log(`User ${userToDelete.username} deleted successfully from PostgreSQL database`);
        return true;
      }

      console.log(`No rows affected when deleting user ${id}`);
      return false;
    } catch (error) {
      console.error(`Error deleting user from PostgreSQL database:`, error);
      throw error;
    }
  }

  // Asset operations
  async getAssets(): Promise<Asset[]> {
    if (!db) throw new Error("Database connection required");
    const assets = await db.select().from(schema.assets);
    // Batch decrypt PII for all assets - optimized for performance
    return process.env.ENCRYPTION_KEY ? batchDecryptFields(assets, PII_FIELDS.asset) : assets;
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    if (!db) throw new Error("Database connection required");
    const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, id));
    // Only decrypt if ENCRYPTION_KEY is set
    return asset ? (process.env.ENCRYPTION_KEY ? decryptFields(asset, PII_FIELDS.asset) : asset) : null;
  }

  async getAssetByTag(assetTag: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.assetTag, assetTag));
    // We don't encrypt assetTag, so no decryption needed here.
    return asset;
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    if (!db) throw new Error("Database connection required");
    // Encrypt PII fields if ENCRYPTION_KEY is set
    const encryptedData = process.env.ENCRYPTION_KEY
      ? encryptFields(assetData, PII_FIELDS.asset)
      : assetData;
    const [asset] = await db.insert(schema.assets).values(encryptedData).returning();
    // Decrypt for return if ENCRYPTION_KEY is set
    return process.env.ENCRYPTION_KEY ? decryptFields(asset, PII_FIELDS.asset) : asset;
  }

  async updateAsset(id: number, updateData: Partial<InsertAsset>): Promise<Asset | undefined> {
    // Encrypt PII fields if ENCRYPTION_KEY is set
    const encryptedUpdateData = process.env.ENCRYPTION_KEY
      ? encryptFields(updateData, PII_FIELDS.asset)
      : updateData;

    const [updated] = await db.update(assets)
      .set(encryptedUpdateData)
      .where(eq(assets.id, id))
      .returning();
    // Decrypt for return if ENCRYPTION_KEY is set
    return updated ? (process.env.ENCRYPTION_KEY ? decryptFields(updated, PII_FIELDS.asset) : updated) : undefined;
  }

  async deleteAsset(id: number): Promise<boolean> {
    try {
      console.log(`Deleting asset with ID: ${id} from PostgreSQL database...`);

      // Get asset info before deletion for logging
      const assetToDelete = await this.getAsset(id);
      if (!assetToDelete) {
        console.log(`Asset ${id} not found`);
        return false;
      }

      console.log(`Deleting asset: ${assetToDelete.name} (${assetToDelete.assetTag})`);

      // Delete the asset from PostgreSQL
      const deleteResult = await db.delete(assets)
        .where(eq(assets.id, id));

      console.log(`Delete result for asset ${id}:`, deleteResult);

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        console.log(`Asset ${assetToDelete.name} deleted successfully from PostgreSQL database`);
        return true;
      }

      console.log(`No rows affected when deleting asset ${id}`);
      return false;
    } catch (error) {
      console.error(`Error deleting asset from PostgreSQL database:`, error);
      throw error;
    }
  }

  // Component operations
  async getComponents(): Promise<Component[]> {
    try {
      return await db.select().from(components);
    } catch (error) {
      console.error('Error fetching components:', error);
      return [];
    }
  }

  async getComponent(id: number): Promise<Component | undefined> {
    try {
      const [component] = await db.select().from(components).where(eq(components.id, id));
      return component;
    } catch (error) {
      console.error('Error fetching component:', error);
      return undefined;
    }
  }


  async createComponent(data: any) {
    try {
      // Ensure all required fields are present and properly typed
      const componentData = {
        name: data.name,
        type: data.type,
        category: data.category || 'General',
        serialNumber: data.serialNumber || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        specifications: data.specifications || null,
        status: data.status || 'available',
        location: data.location || null,
        assignedTo: data.assignedTo || null,
        purchaseDate: data.purchaseDate || null,
        purchaseCost: data.purchaseCost ? parseFloat(data.purchaseCost.toString()) : null,
        warrantyExpiry: data.warrantyExpiry || null,
        notes: data.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const [component] = await db.insert(schema.components).values(componentData).returning();
      return component;
    } catch (error) {
      console.error('Error creating component in database:', error);
      // If database fails, still try to create in memory storage as fallback
      throw error;
    }
  }

  async updateComponent(id: number, updateData: Partial<InsertComponent>): Promise<Component | undefined> {
    try {
      const [component] = await db.select().from(components).where(eq(components.id, id));
      if (!component) return undefined;

      // Convert quantity from string to number if needed
      if (typeof updateData.quantity === 'string') {
        updateData.quantity = parseInt(updateData.quantity);
      }

      const [updated] = await db.update(components)
        .set(updateData)
        .where(eq(components.id, id))
        .returning();

      if (updated) {
        // Create activity record
        await this.createActivity({
          action: "update",
          itemType: "component",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `Component "${component.name}" updated`,
        });
      }

      return updated;
    } catch (error) {
      console.error('Error updating component:', error);
      throw error;
    }
  }

  async deleteComponent(id: number): Promise<boolean> {
    try {
      console.log(`Deleting component with ID: ${id} from PostgreSQL database...`);

      const [component] = await db.select().from(components).where(eq(components.id, id));
      if (!component) {
        console.log(`Component ${id} not found`);
        return false;
      }

      console.log(`Deleting component: ${component.name}`);

      const deleteResult = await db.delete(components)
        .where(eq(components.id, id));

      console.log(`Delete result for component ${id}:`, deleteResult);

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        // Create activity record
        try {
          await this.createActivity({
            action: "delete",
            itemType: "component",
            itemId: id,
            userId: null,
            timestamp: new Date().toISOString(),
            notes: `Component "${component.name}" deleted`,
          });
        } catch (activityError) {
          console.warn("Failed to log component delete activity:", activityError);
        }

        console.log(`Component ${component.name} deleted successfully from PostgreSQL database`);
        return true;
      }

      console.log(`No rows affected when deleting component ${id}`);
      return false;
    } catch (error) {
      console.error('Error deleting component from PostgreSQL database:', error);
      return false;
    }
  }

  // Accessory operations
  async getAccessories(): Promise<Accessory[]> {
    return await db.select().from(accessories);
  }

  async getAccessory(id: number): Promise<Accessory | undefined> {
    const [accessory] = await db.select().from(accessories).where(eq(accessories.id, id));
    return accessory;
  }

  async createAccessory(insertAccessory: InsertAccessory): Promise<Accessory> {
    // Make sure quantity is a number
    const processedAccessory = {
      ...insertAccessory,
      quantity: typeof insertAccessory.quantity === 'string'
        ? parseInt(insertAccessory.quantity)
        : insertAccessory.quantity
    };

    const [accessory] = await db.insert(accessories).values(processedAccessory).returning();

    // Create activity record
    await this.createActivity({
      action: "create",
      itemType: "accessory",
      itemId: accessory.id,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `Accessory "${accessory.name}" created`,
    });

    return accessory;
  }

  async updateAccessory(id: number, updateData: Partial<InsertAccessory>): Promise<Accessory | undefined> {
    const [accessory] = await db.select().from(accessories).where(eq(accessories.id, id));
    if (!accessory) return undefined;

    // Convert quantity from string to number if needed
    if (typeof updateData.quantity === 'string') {
      updateData.quantity = parseInt(updateData.quantity);
    }

    const [updated] = await db.update(accessories)
      .set(updateData)
      .where(eq(accessories.id, id))
      .returning();

    if (updated) {
      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "accessory",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Accessory "${accessory.name}" updated`,
      });
    }

    return updated;
  }

  async deleteAccessory(id: number): Promise<boolean> {
    const [accessory] = await db.select().from(accessories).where(eq(accessories.id, id));
    if (!accessory) return false;

    const [deleted] = await db.delete(accessories)
      .where(eq(accessories.id, id))
      .returning();

    if (deleted) {
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

    return !!deleted;
  }

  // Consumable operations
  async getConsumables(): Promise<Consumable[]> {
    try {
      // Try database first
      const dbConsumables = await db.select().from(consumables);

      return dbConsumables;
    } catch (error) {
      console.error('Error fetching consumables from database:', error);
      return [];
    }
  }

  async getConsumable(id: number): Promise<Consumable | undefined> {
    try {
      const [consumable] = await db.select().from(consumables).where(eq(consumables.id, id));
      return consumable;
    } catch (error) {
      console.error('Error fetching consumable:', error);
      return undefined;
    }
  }

  async createConsumable(insertConsumable: InsertConsumable): Promise<Consumable> {
    try {
      // Make sure quantity is a number
      const processedConsumable = {
        ...insertConsumable,
        quantity: typeof insertConsumable.quantity === 'string'
          ? parseInt(insertConsumable.quantity)
          : insertConsumable.quantity || 1
      };

      const [consumable] = await db.insert(consumables).values(processedConsumable).returning();

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "consumable",
        itemId: consumable.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${consumable.name}" created`,
      });

      return consumable;
    } catch (error) {
      console.error('Error creating consumable:', error);
      throw error;
    }
  }

  async updateConsumable(id: number, updateData: Partial<InsertConsumable>): Promise<Consumable | undefined> {
    const [consumable] = await db.select().from(consumables).where(eq(consumables.id, id));
    if (!consumable) return undefined;

    // Convert quantity from string to number if needed
    if (typeof updateData.quantity === 'string') {
      updateData.quantity = parseInt(updateData.quantity);
    }

    const [updated] = await db.update(consumables)
      .set(updateData)
      .where(eq(consumables.id, id))
      .returning();

    if (updated) {
      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${consumable.name}" updated`,
      });
    }

    return updated;
  }

  async deleteConsumable(id: number): Promise<boolean> {
    try {
      const consumable = await this.getConsumable(id);
      if (!consumable) return false;

      await db.delete(consumables).where(eq(consumables.id, id));

      // Create activity record
      await this.createActivity({
        action: "delete",
        itemType: "consumable",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `Consumable "${consumable.name}" deleted`,
      });

      return true;
    } catch (error) {
      console.error('Error deleting consumable:', error);
      return false;
    }
  }

  async getConsumableAssignments(consumableId: number): Promise<any[]> {
    try {
      // First try to test the database connection
      await db.execute(sql`SELECT 1`);

      // Check if table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'consumable_assignments'
        );
      `);

      if (!tableExists.rows?.[0]?.exists) {
        console.log('Consumable assignments table does not exist, returning empty array');
        return [];
      }

      const assignments = await db.select()
        .from(schema.consumableAssignments)
        .where(eq(schema.consumableAssignments.consumableId, consumableId))
        .orderBy(desc(schema.consumableAssignments.assignedDate));
      return assignments;
    } catch (error) {
      console.error('Error fetching consumable assignments:', error);
      // Return empty array if database connection fails
      return [];
    }
  }

  async assignConsumable(consumableId: number, assignmentData: any): Promise<any> {
    try {
      // First check if consumable exists using the memory fallback
      let consumable;
      try {
        consumable = await this.getConsumable(consumableId);
      } catch (dbError) {
        console.error('Database error while checking consumable:', dbError);
      }

      if (!consumable) {
        throw new Error('Consumable not found');
      }

      // Try database assignment first
      try {
        // Test database connection
        await db.execute(sql`SELECT 1`);

        // Ensure consumable_assignments table exists
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS consumable_assignments (
            id SERIAL PRIMARY KEY,
            consumable_id INTEGER NOT NULL,
            assigned_to TEXT NOT NULL,
            serial_number TEXT,
            knox_id TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            assigned_date TEXT NOT NULL,
            returned_date TEXT,
            status TEXT NOT NULL DEFAULT 'assigned',
            notes TEXT,
            CONSTRAINT fk_consumable_assignment FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE
          );
        `);

        // Create assignment record
        const [assignment] = await db.insert(schema.consumableAssignments).values({
          consumableId,
          assignedTo: assignmentData.assignedTo,
          serialNumber: assignmentData.serialNumber || null,
          knoxId: assignmentData.knoxId || null,
          quantity: assignmentData.quantity || 1,
          assignedDate: new Date().toISOString(),
          status: 'assigned',
          notes: assignmentData.notes || null
        }).returning();

        // Create activity record
        try {
          await this.createActivity({
            action: "checkout",
            itemType: "consumable",
            itemId: consumableId,
            userId: null,
            timestamp: new Date().toISOString(),
            notes: `Consumable assigned to ${assignmentData.assignedTo}`,
          });
        } catch (activityError) {
          console.warn('Failed to create activity record:', activityError);
        }

        return assignment;
      } catch (dbError) {
        console.warn('Database assignment failed, using fallback mode:', dbError);

        // Fallback assignment mode
        const fallbackAssignment = {
          id: Date.now(),
          consumableId,
          assignedTo: assignmentData.assignedTo,
          serialNumber: assignmentData.serialNumber || null,
          knoxId: assignmentData.knoxId || null,
          quantity: assignmentData.quantity || 1,
          assignedDate: new Date().toISOString(),
          status: 'assigned',
          notes: assignmentData.notes || null
        };

        console.log('Assignment created in fallback mode:', fallbackAssignment);
        return fallbackAssignment;
      }
    } catch (error) {
      console.error('Error assigning consumable:', error);
      throw error;
    }
  }

  // License operations
  async getLicenses(): Promise<License[]> {
    return await db.select().from(licenses);
  }

  async getLicense(id: number): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    return license;
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      const [license] = await db.insert(licenses).values(insertLicense).returning();

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "license",
        itemId: license.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${license.name}" created`,
      });

      console.log(`✅ License "${license.name}" created in PostgreSQL database`);
      return license;
    } catch (error) {
      console.error('❌ Database error creating license:', error);
      throw new Error('Failed to create license: Database connection required');
    }
  }

  async updateLicense(id: number, updateData: Partial<InsertLicense>): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) return undefined;

    const [updated] = await db.update(licenses)
      .set(updateData)
      .where(eq(licenses.id, id))
      .returning();

    if (updated) {
      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "license",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `License "${license.name}" updated`,
      });
    }

    return updated;
  }

  async deleteLicense(id: number): Promise<boolean> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) return false;

    try {
      // First delete all license assignments related to this license
      await db.delete(licenseAssignments)
        .where(eq(licenseAssignments.licenseId, id));

      // Then delete the license
      const [deleted] = await db.delete(licenses)
        .where(eq(licenses.id, id))
        .returning();

      if (deleted) {
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

      return !!deleted;
    } catch (error) {
      console.error("Error deleting license:", error);
      throw error;
    }
  }

  // License assignment operations
  async getLicenseAssignments(licenseId: number): Promise<LicenseAssignment[]> {
    return await db.select()
      .from(licenseAssignments)
      .where(eq(licenseAssignments.licenseId, licenseId))
      .orderBy(licenseAssignments.assignedDate);
  }

  async createLicenseAssignment(insertAssignment: InsertLicenseAssignment): Promise<LicenseAssignment> {
    const [assignment] = await db
      .insert(licenseAssignments)
      .values(insertAssignment)
      .returning();

    // Create activity record
    await this.createActivity({
      action: "update",
      itemType: "license",
      itemId: insertAssignment.licenseId,
      userId: null,
      timestamp: new Date().toISOString(),
      notes: `License seat assigned to: ${insertAssignment.assignedTo}`,
    });

    return assignment;
  }

  // Checkout/checkin operations
  async checkoutAsset(assetId: number, userId: number, expectedCheckinDate?: string, customNotes?: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!asset || !user) return undefined;
    if (asset.status !== AssetStatus.AVAILABLE) return undefined;

    const today = new Date().toISOString().split("T")[0];

    const [updatedAsset] = await db.update(assets)
      .set({
        status: AssetStatus.DEPLOYED,
        assignedTo: userId,
        checkoutDate: today,
        expectedCheckinDate: expectedCheckinDate || null,
      })
      .where(eq(assets.id, assetId))
      .returning();

    if (updatedAsset) {
      // Create activity record
      await this.createActivity({
        action: "checkout",
        itemType: "asset",
        itemId: assetId,
        userId,
        timestamp: new Date().toISOString(),
        notes: customNotes || `Asset ${asset.name} (${asset.assetTag}) checked out to ${user.firstName} ${user.lastName}`,
      });
    }

    return updatedAsset;
  }

  async checkinAsset(assetId: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));

    if (!asset) return undefined;
    if (asset.status !== AssetStatus.DEPLOYED && asset.status !== AssetStatus.OVERDUE) return undefined;

    const [updatedAsset] = await db.update(assets)
      .set({
        status: AssetStatus.AVAILABLE,
        assignedTo: null,
        checkoutDate: null,
        expectedCheckinDate: null,
        knoxId: null, // Clear the Knox ID when checking in
      })
      .where(eq(assets.id, assetId))
      .returning();

    if (updatedAsset) {
      // Create activity record
      await this.createActivity({
        action: "checkin",
        itemType: "asset",
        itemId: assetId,
        userId: asset.assignedTo,
        timestamp: new Date().toISOString(),
        notes: `Asset ${asset.name} (${asset.assetTag}) checked in`,
      });
    }

    return updatedAsset;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    // Order by timestamp descending for newest first
    return await db.select()
      .from(activities)
      .orderBy(activities.timestamp);
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(activities.timestamp);
  }

  async getActivitiesByAsset(assetId: number): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .where(eq(activities.itemId, assetId))
      .orderBy(activities.timestamp);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Stats and summaries
  async getAssetStats(): Promise<AssetStats> {
    const allAssets = await db.select().from(assets);

    return {
      total: allAssets.length,
      checkedOut: allAssets.filter(asset => asset.status === AssetStatus.DEPLOYED).length,
      available: allAssets.filter(asset => asset.status === AssetStatus.AVAILABLE).length,
      pending: allAssets.filter(asset => asset.status === AssetStatus.PENDING).length,
      overdue: allAssets.filter(asset => asset.status === AssetStatus.OVERDUE).length,
      archived: allAssets.filter(asset => asset.status === AssetStatus.ARCHIVED).length,
    };
  }

  // Zabbix settings operations (stub implementations for now)
  async getZabbixSettings(): Promise<any> {
    return undefined;
  }

  async saveZabbixSettings(settings: any): Promise<any> {
    return settings;
  }

  // Zabbix subnet operations (stub implementations)
  async getZabbixSubnets(): Promise<any[]> {
    return [];
  }

  async getZabbixSubnet(id: number): Promise<any> {
    return undefined;
  }

  async createZabbixSubnet(subnet: any): Promise<any> {
    return subnet;
  }

  async deleteZabbixSubnet(id: number): Promise<boolean> {
    return true;
  }

  // VM monitoring operations (stub implementations)
  async getVMMonitoring(): Promise<any[]> {
    return [];
  }

  async getVMMonitoringByVMId(vmId: number): Promise<any> {
    return undefined;
  }

  async createVMMonitoring(monitoring: any): Promise<any> {
    return monitoring;
  }

  async updateVMMonitoring(id: number, monitoring: any): Promise<any> {
    return monitoring;
  }

  // Discovered hosts operations (stub implementations)
  async getDiscoveredHosts(): Promise<any[]> {
    return [];
  }

  async getDiscoveredHost(id: number): Promise<any> {
    return undefined;
  }

  async createDiscoveredHost(host: any): Promise<any> {
    return host;
  }

  async updateDiscoveredHost(id: number, host: any): Promise<any> {
    return host;
  }

  async deleteDiscoveredHost(id: number): Promise<boolean> {
    return true;
  }

  // BitLocker keys operations
  async getBitlockerKeys(): Promise<any[]> {
    if (!db) throw new Error("Database connection required");
    const keys = await db.select().from(schema.bitlockerKeys).orderBy(desc(schema.bitlockerKeys.dateAdded));
    // Batch decrypt PII for all keys if ENCRYPTION_KEY is set
    return process.env.ENCRYPTION_KEY ? batchDecryptFields(keys, PII_FIELDS.bitlockerKey) : keys;
  }

  async getBitlockerKey(id: number): Promise<any> {
    if (!db) throw new Error("Database connection required");
    const [key] = await db.select().from(schema.bitlockerKeys).where(eq(schema.bitlockerKeys.id, id));
    // Only decrypt if ENCRYPTION_KEY is set
    return key ? (process.env.ENCRYPTION_KEY ? decryptFields(key, PII_FIELDS.bitlockerKey) : key) : null;
  }

  async getBitlockerKeyBySerialNumber(serialNumber: string): Promise<any[]> {
    try {
      // Assuming serialNumber is not encrypted, or encrypted with a separate key/method
      // If it IS encrypted and needs decryption, adjust accordingly.
      return await db.select().from(schema.bitlockerKeys).where(eq(schema.bitlockerKeys.serialNumber, serialNumber));
    } catch (error) {
      console.error('❌ Database error fetching BitLocker keys by serial:', error);
      return [];
    }
  }

  async getBitlockerKeyByIdentifier(identifier: string): Promise<any[]> {
    try {
      // Assuming identifier is not encrypted, or encrypted with a separate key/method
      // If it IS encrypted and needs decryption, adjust accordingly.
      return await db.select().from(schema.bitlockerKeys).where(eq(schema.bitlockerKeys.identifier, identifier));
    } catch (error) {
      console.error('❌ Database error fetching BitLocker keys by identifier:', error);
      return [];
    }
  }

  async createBitlockerKey(data: any): Promise<any> {
    if (!db) throw new Error("Database connection required");

    // Encrypt all sensitive BitLocker fields if ENCRYPTION_KEY is set
    const encryptedData = process.env.ENCRYPTION_KEY
      ? encryptFields(data, PII_FIELDS.bitlockerKey)
      : data;

    const [key] = await db.insert(schema.bitlockerKeys).values({
      ...encryptedData,
      dateAdded: new Date(),
      updatedAt: new Date()
    }).returning();

    // Decrypt for return if ENCRYPTION_KEY is set
    return process.env.ENCRYPTION_KEY ? decryptFields(key, PII_FIELDS.bitlockerKey) : key;
  }

  async updateBitlockerKey(id: number, key: any): Promise<any> {
    try {
      // Encrypt PII fields before updating if ENCRYPTION_KEY is set
      const encryptedData = process.env.ENCRYPTION_KEY
        ? encryptFields(key, PII_FIELDS.bitlockerKey)
        : key;

      const [updated] = await db.update(schema.bitlockerKeys)
        .set({ ...encryptedData, updatedAt: new Date() })
        .where(eq(schema.bitlockerKeys.id, id))
        .returning();

      // Decrypt for return if ENCRYPTION_KEY is set
      return updated ? (process.env.ENCRYPTION_KEY ? decryptFields(updated, PII_FIELDS.bitlockerKey) : updated) : undefined;
    } catch (error) {
      console.error('❌ Database error updating BitLocker key:', error);
      throw new Error('Failed to update BitLocker key: Database connection required');
    }
  }

  async deleteBitlockerKey(id: number): Promise<boolean> {
    try {
      const [key] = await db.select().from(schema.bitlockerKeys).where(eq(schema.bitlockerKeys.id, id));
      if (!key) return false;

      await db.delete(schema.bitlockerKeys).where(eq(schema.bitlockerKeys.id, id));

      console.log(`✅ BitLocker key deleted from PostgreSQL database`);

      await this.createActivity({
        action: "delete",
        itemType: "bitlocker-key",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `BitLocker key for ${key.serialNumber} deleted`,
      });

      return true;
    } catch (error) {
      console.error('❌ Database error deleting BitLocker key:', error);
      return false;
    }
  }

  // VM Inventory operations - using PostgreSQL tables
  async getVmInventory(): Promise<any[]> {
    try {
      const vms = await db.select().from(schema.vmInventory);
      // Batch decrypt PII for all VMs - uses optimized batch processing if ENCRYPTION_KEY is set
      return process.env.ENCRYPTION_KEY ? batchDecryptFields(vms, PII_FIELDS.vmInventory) : vms;
    } catch (error) {
      console.error('Error fetching VM inventory:', error);
      return [];
    }
  }

  async getVmInventoryItem(id: number): Promise<any> {
    try {
      const [vm] = await db.select().from(schema.vmInventory).where(eq(schema.vmInventory.id, id));
      // Only decrypt if ENCRYPTION_KEY is set
      return vm ? (process.env.ENCRYPTION_KEY ? decryptFields(vm, PII_FIELDS.vmInventory) : vm) : undefined;
    } catch (error) {
      console.error('Error fetching VM inventory item:', error);
      return undefined;
    }
  }

  // Add method to get VMs (alias for VM inventory)
  async getVMs(): Promise<any[]> {
    return this.getVmInventory();
  }

  async getVM(id: number): Promise<any> {
    return this.getVmInventoryItem(id);
  }

  async createVM(vmData: any): Promise<any> {
    return this.createVmInventoryItem(vmData);
  }

  async updateVM(id: number, vmData: any): Promise<any> {
    return this.updateVmInventoryItem(id, vmData);
  }

  async deleteVM(id: number): Promise<boolean> {
    return this.deleteVmInventoryItem(id);
  }

  async createVmInventoryItem(vm: any): Promise<any> {
    try {
      // Encrypt PII fields before inserting if ENCRYPTION_KEY is set
      const encryptedData = process.env.ENCRYPTION_KEY
        ? encryptFields(vm, PII_FIELDS.vmInventory)
        : vm;

      const [newVM] = await db.insert(schema.vmInventory).values({
        startDate: encryptedData.startDate,
        endDate: encryptedData.endDate,
        hypervisor: encryptedData.hypervisor,
        hostName: encryptedData.hostName,
        hostModel: encryptedData.hostModel,
        hostIp: encryptedData.hostIp,
        hostOs: encryptedData.hostOs,
        rack: encryptedData.rack,
        vmId: encryptedData.vmId,
        vmName: encryptedData.vmName,
        vmStatus: encryptedData.vmStatus || encryptedData.powerState || 'stopped',
        vmIp: encryptedData.vmIp,
        internetAccess: encryptedData.internetAccess || false,
        vmOs: encryptedData.vmOs,
        vmOsVersion: encryptedData.vmOsVersion,
        deployedBy: encryptedData.deployedBy,
        user: encryptedData.user,
        department: encryptedData.department,
        jiraTicket: encryptedData.jiraTicket,
        remarks: encryptedData.remarks,
        dateDeleted: encryptedData.dateDeleted,
        // Legacy fields for compatibility
        guestOs: encryptedData.guestOs || encryptedData.vmOs,
        powerState: encryptedData.powerState || encryptedData.vmStatus || 'stopped',
        cpuCount: encryptedData.cpuCount,
        memoryMB: encryptedData.memoryMB,
        diskGB: encryptedData.diskGB,
        ipAddress: encryptedData.ipAddress || encryptedData.vmIp,
        macAddress: encryptedData.macAddress,
        vmwareTools: encryptedData.vmwareTools,
        cluster: encryptedData.cluster,
        datastore: encryptedData.datastore,
        status: encryptedData.status || 'available',
        assignedTo: encryptedData.assignedTo,
        location: encryptedData.location,
        serialNumber: encryptedData.serialNumber,
        model: encryptedData.model,
        manufacturer: encryptedData.manufacturer,
        purchaseDate: encryptedData.purchaseDate,
        purchaseCost: encryptedData.purchaseCost,
        createdDate: encryptedData.createdDate || new Date().toISOString(),
        lastModified: encryptedData.lastModified || new Date().toISOString(),
        notes: encryptedData.notes
      }).returning();

      // Decrypt for return if ENCRYPTION_KEY is set
      const decryptedVM = process.env.ENCRYPTION_KEY ? decryptFields(newVM, PII_FIELDS.vmInventory) : newVM;

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "vm",
        itemId: newVM.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `VM "${decryptedVM.vmName}" created`,
      });

      return decryptedVM;
    } catch (error) {
      console.error('Error creating VM inventory item:', error);
      throw error;
    }
  }

  async updateVmInventoryItem(id: number, vm: any): Promise<any> {
    try {
      const [existingVM] = await db.select().from(schema.vmInventory).where(eq(schema.vmInventory.id, id));
      if (!existingVM) return undefined;

      const updateData: any = {
        lastModified: new Date().toISOString()
      };

      // Map new VM inventory fields
      if (vm.startDate !== undefined) updateData.startDate = vm.startDate;
      if (vm.endDate !== undefined) updateData.endDate = vm.endDate;
      if (vm.hypervisor) updateData.hypervisor = vm.hypervisor;
      if (vm.hostName) updateData.hostName = vm.hostName;
      if (vm.hostModel) updateData.hostModel = vm.hostModel;
      if (vm.hostIp) updateData.hostIp = vm.hostIp;
      if (vm.hostOs) updateData.hostOs = vm.hostOs;
      if (vm.rack) updateData.rack = vm.rack;
      if (vm.vmId) updateData.vmId = vm.vmId;
      if (vm.vmName) updateData.vmName = vm.vmName;
      if (vm.vmStatus) updateData.vmStatus = vm.vmStatus;
      if (vm.vmIp !== undefined) updateData.vmIp = vm.vmIp;
      if (vm.internetAccess !== undefined) updateData.internetAccess = vm.internetAccess;
      if (vm.vmOs) updateData.vmOs = vm.vmOs;
      if (vm.vmOsVersion) updateData.vmOsVersion = vm.vmOsVersion;
      if (vm.deployedBy) updateData.deployedBy = vm.deployedBy;
      if (vm.user) updateData.user = vm.user;
      if (vm.department) updateData.department = vm.department;
      if (vm.jiraTicket) updateData.jiraTicket = vm.jiraTicket;
      if (vm.remarks !== undefined) updateData.remarks = vm.remarks;
      if (vm.dateDeleted) updateData.dateDeleted = vm.dateDeleted;
      if (vm.requestor !== undefined) updateData.requestor = vm.requestor;
      if (vm.knoxId !== undefined) updateData.knoxId = vm.knoxId;
      if (vm.jiraNumber !== undefined) updateData.jiraNumber = vm.jiraNumber;
      if (vm.approvalNumber !== undefined) updateData.approvalNumber = vm.approvalNumber;
      if (vm.cpuCount !== undefined) updateData.cpuCount = vm.cpuCount;
      if (vm.memoryGB !== undefined) updateData.memoryGB = vm.memoryGB;
      if (vm.diskCapacityGB !== undefined) updateData.diskCapacityGB = vm.diskCapacityGB;

      // Legacy fields for compatibility
      if (vm.guestOs) updateData.guestOs = vm.guestOs;
      if (vm.powerState) updateData.powerState = vm.powerState;
      if (vm.memoryMB) updateData.memoryMB = vm.memoryMB;
      if (vm.diskGB) updateData.diskGB = vm.diskGB;
      if (vm.ipAddress !== undefined) updateData.ipAddress = vm.ipAddress;
      if (vm.macAddress !== undefined) updateData.macAddress = vm.macAddress;
      if (vm.vmwareTools) updateData.vmwareTools = vm.vmwareTools;
      if (vm.cluster) updateData.cluster = vm.cluster;
      if (vm.datastore) updateData.datastore = vm.datastore;
      if (vm.status) updateData.status = vm.status;
      if (vm.assignedTo) updateData.assignedTo = vm.assignedTo;
      if (vm.location) updateData.location = vm.location;
      if (vm.serialNumber) updateData.serialNumber = vm.serialNumber;
      if (vm.model) updateData.model = vm.model;
      if (vm.manufacturer) updateData.manufacturer = vm.manufacturer;
      if (vm.purchaseDate) updateData.purchaseDate = vm.purchaseDate;
      if (vm.purchaseCost) updateData.purchaseCost = vm.purchaseCost;
      if (vm.notes) updateData.notes = vm.notes;

      // Encrypt PII fields before updating if ENCRYPTION_KEY is set
      const encryptedUpdateData = process.env.ENCRYPTION_KEY
        ? encryptFields(updateData, PII_FIELDS.vmInventory)
        : updateData;

      const [updatedVM] = await db.update(schema.vmInventory)
        .set(encryptedUpdateData)
        .where(eq(schema.vmInventory.id, id))
        .returning();

      // IMPORTANT: Always decrypt the full record before returning to client
      // This ensures encrypted data in the database is shown as plain text in the UI
      const decryptedVM = updatedVM ? (process.env.ENCRYPTION_KEY ? decryptFields(updatedVM, PII_FIELDS.vmInventory) : updatedVM) : undefined;

      // Create activity record
      await this.createActivity({
        action: "update",
        itemType: "vm",
        itemId: id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `VM "${decryptedVM?.vmName}" updated`,
      });

      return decryptedVM;
    } catch (error) {
      console.error('Error updating VM inventory item:', error);
      throw error;
    }
  }

  async deleteVmInventoryItem(id: number): Promise<boolean> {
    try {
      console.log(`Deleting VM with ID: ${id} from PostgreSQL database...`);

      // Get VM info before deletion
      const [vmToDelete] = await db.select().from(schema.vmInventory).where(eq(schema.vmInventory.id, id));
      if (!vmToDelete) {
        console.log(`VM ${id} not found`);
        return false;
      }

      console.log(`Deleting VM: ${vmToDelete.vmName}`);

      const deleteResult = await db.delete(schema.vmInventory).where(eq(schema.vmInventory.id, id));

      console.log(`Delete result for VM ${id}:`, deleteResult);

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        // Create activity record
        try {
          await this.createActivity({
            action: "delete",
            itemType: "vm",
            itemId: id,
            userId: null,
            timestamp: new Date().toISOString(),
            notes: `VM "${vmToDelete.vmName}" deleted`,
          });
        } catch (activityError) {
          console.warn("Failed to log VM delete activity:", activityError);
        }

        console.log(`VM ${vmToDelete.vmName} deleted successfully from PostgreSQL database`);
        return true;
      }

      console.log(`No rows affected when deleting VM ${id}`);
      return false;
    } catch (error) {
      console.error('Error deleting VM from PostgreSQL database:', error);
      return false;
    }
  }

  // IT Equipment operations
  async getITEquipment(): Promise<ITEquipment[]> {
    try {
      const equipment = await db.select().from(itEquipment);
      // Batch decrypt PII for all equipment if ENCRYPTION_KEY is set
      return process.env.ENCRYPTION_KEY ? batchDecryptFields(equipment, PII_FIELDS.itEquipment) : equipment;
    } catch (error) {
      console.error('Database error fetching IT equipment:', error);
      return [];
    }
  }

  async getITEquipmentById(id: number): Promise<ITEquipment | null> {
    const [equipment] = await db.select().from(itEquipment).where(eq(itEquipment.id, id));
    // Only decrypt if ENCRYPTION_KEY is set
    return equipment ? (process.env.ENCRYPTION_KEY ? decryptFields(equipment, PII_FIELDS.itEquipment) : equipment) : null;
  }

  async createITEquipment(data: InsertITEquipment): Promise<ITEquipment> {
    try {
      // Encrypt PII fields if ENCRYPTION_KEY is set
      const encryptedData = process.env.ENCRYPTION_KEY
        ? encryptFields(data, PII_FIELDS.itEquipment)
        : data;

      const [equipment] = await db.insert(itEquipment).values({
        ...encryptedData,
        assignedQuantity: 0,
        status: encryptedData.status || 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      // Decrypt for return if ENCRYPTION_KEY is set
      const decryptedEquipment = process.env.ENCRYPTION_KEY ? decryptFields(equipment, PII_FIELDS.itEquipment) : equipment;

      // Create activity record
      await this.createActivity({
        action: "create",
        itemType: "it-equipment",
        itemId: equipment.id,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment "${decryptedEquipment.name}" created`,
      });

      return decryptedEquipment;
    } catch (error) {
      console.error('Database error creating IT equipment:', error);
      throw error;
    }
  }

  async updateITEquipment(id: number, data: Partial<InsertITEquipment>): Promise<ITEquipment | null> {
    try {
      // Encrypt PII fields before updating if ENCRYPTION_KEY is set
      const encryptedData = process.env.ENCRYPTION_KEY
        ? encryptFields(data, PII_FIELDS.itEquipment)
        : data;

      const [equipment] = await db.update(itEquipment)
        .set({
          ...encryptedData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(itEquipment.id, id))
        .returning();

      if (equipment) {
        // Decrypt for return and activity if ENCRYPTION_KEY is set
        const decryptedEquipment = process.env.ENCRYPTION_KEY ? decryptFields(equipment, PII_FIELDS.itEquipment) : equipment;

        // Create activity record
        await this.createActivity({
          action: "update",
          itemType: "it-equipment",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `IT Equipment "${decryptedEquipment.name}" updated`,
        });

        return decryptedEquipment;
      }

      return null;
    } catch (error) {
      console.error('Database error updating IT equipment:', error);
      throw error;
    }
  }

  async deleteITEquipment(id: number): Promise<boolean> {
    try {
      const [equipment] = await db.select().from(itEquipment).where(eq(itEquipment.id, id));
      if (!equipment) return false;

      // Delete related assignments first
      await db.delete(itEquipmentAssignments).where(eq(itEquipmentAssignments.equipmentId, id));

      // Delete the equipment
      const result = await db.delete(itEquipment).where(eq(itEquipment.id, id));

      if (result.rowCount && result.rowCount > 0) {
        // Create activity record
        await this.createActivity({
          action: "delete",
          itemType: "it-equipment",
          itemId: id,
          userId: null,
          timestamp: new Date().toISOString(),
          notes: `IT Equipment "${equipment.name}" deleted`,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Database error deleting IT equipment:', error);
      return false;
    }
  }

  // IT Equipment Assignment methods
  async getITEquipmentAssignments(equipmentId: number): Promise<any[]> {
    try {
      return await db.select()
        .from(itEquipmentAssignments)
        .where(eq(itEquipmentAssignments.equipmentId, equipmentId))
        .orderBy(desc(itEquipmentAssignments.assignedDate));
    } catch (error) {
      console.error('Database error fetching IT equipment assignments:', error);
      return [];
    }
  }

  async assignITEquipment(equipmentId: number, assignmentData: any): Promise<any> {
    try {
      // Create assignment
      const [assignment] = await db.insert(itEquipmentAssignments).values({
        equipmentId,
        assignedTo: assignmentData.assignedTo,
        serialNumber: assignmentData.serialNumber || null,
        knoxId: assignmentData.knoxId || null,
        quantity: assignmentData.quantity || 1,
        assignedDate: new Date().toISOString(),
        status: 'assigned',
        notes: assignmentData.notes || null
      }).returning();

      // Update equipment assigned quantity
      await db.update(itEquipment)
        .set({
          assignedQuantity: sql`${itEquipment.assignedQuantity} + ${assignmentData.quantity || 1}`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(itEquipment.id, equipmentId));

      // Create activity record
      await this.createActivity({
        action: "checkout",
        itemType: "it-equipment",
        itemId: equipmentId,
        userId: null,
        timestamp: new Date().toISOString(),
        notes: `IT Equipment assigned to ${assignmentData.assignedTo} (Qty: ${assignmentData.quantity || 1})`,
      });

      return assignment;
    } catch (error) {
      console.error('Database error assigning IT equipment:', error);
      throw error;
    }
  }

  async bulkAssignITEquipment(equipmentId: number, assignments: any[]): Promise<any[]> {
    try {
      const createdAssignments = [];

      for (const assignmentData of assignments) {
        const assignment = await this.assignITEquipment(equipmentId, assignmentData);
        createdAssignments.push(assignment);
      }

      return createdAssignments;
    } catch (error) {
      console.error('Database error in bulk assignment:', error);
      throw error;
    }
  }

  async updateSettings(settings: any): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO system_settings (id, site_name, company_name, created_at, updated_at) 
        VALUES (1, ${settings.siteName || 'SRPH-MIS'}, ${settings.companyName || 'SRPH'}, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET 
          site_name = excluded.site_name,
          company_name = excluded.company_name,
          updated_at = datetime('now')
      `);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async getJiraSettings(): Promise<any> {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      // Create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS jira_settings (
          id SERIAL PRIMARY KEY,
          settings TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await db.execute(sql`SELECT settings FROM jira_settings WHERE id = 1`);

      if (result.rows && result.rows.length > 0) {
        try {
          const settings = JSON.parse(result.rows[0].settings as string);
          console.log('JIRA settings retrieved from database');
          return settings;
        } catch (parseError) {
          console.error('Error parsing JIRA settings JSON:', parseError);
          return null;
        }
      }

      console.log('No JIRA settings found in database');
      return null;
    } catch (error) {
      console.error('Error fetching JIRA settings:', error);
      throw new Error(`Failed to fetch JIRA settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveJiraSettings(settings: any): Promise<any> {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      // Create jira_settings table if it doesn't exist (PostgreSQL syntax)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS jira_settings (
          id SERIAL PRIMARY KEY,
          settings TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const settingsJson = JSON.stringify(settings);

      // Use PostgreSQL upsert syntax (INSERT ... ON CONFLICT)
      await db.execute(sql`
        INSERT INTO jira_settings (id, settings, updated_at) 
        VALUES (1, ${settingsJson}, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET 
          settings = EXCLUDED.settings,
          updated_at = CURRENT_TIMESTAMP
      `);

      console.log('JIRA settings saved successfully to database');

      // Return the saved settings
      return settings;
    } catch (error) {
      console.error('Error saving JIRA settings:', error);
      throw new Error(`Failed to save JIRA settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createIssue(issue: any): Promise<any> {
    // For now, store as activity - in real implementation, create issues table
    const activity = {
      id: Date.now(),
      type: 'issue_reported',
      description: `Issue reported: ${issue.title}`,
      userId: 1,
      itemId: null, // Assuming issue is not tied to a specific item initially
      itemType: null, // Assuming issue is not tied to a specific item type initially
      action: 'report', // Define a relevant action for reporting an issue
      category: 'system', // Default category for system issues
      metadata: JSON.stringify(issue), // Store the full issue details in metadata
      timestamp: new Date().toISOString(),
    };

    if (this.db) {
      await this.db.insert(activities).values(activity);
    } else {
      // Fallback or throw error if db is not available
      console.error("Database connection not available for createIssue");
      throw new Error("Database connection required");
    }
    return issue;
  }

  async getIssues(): Promise<any[]> {
    // Retrieve from activities table where type is 'issue_reported'
    if (this.db) {
      const result = await this.db.select()
        .from(activities)
        .where(eq(activities.type, 'issue_reported'))
        .orderBy(desc(activities.timestamp)); // Order by newest first
      return result.map(activity => {
        try {
          // Parse the metadata to get the issue details
          return JSON.parse(activity.metadata || '{}');
        } catch (e) {
          console.error("Error parsing metadata for issue:", e);
          return {}; // Return empty object if parsing fails
        }
      });
    } else {
      console.error("Database connection not available for getIssues");
      return [];
    }
  }

  // IAM Accounts methods
  async getIamAccounts(): Promise<IamAccount[]> {
    if (!db) {
      console.error('Database not available - using memory storage for IAM accounts');
      // If memoryStorage is not initialized or available, return empty array or throw error
      if (!this.memoryStorage) throw new Error('Memory storage not available');
      return this.memoryStorage.getIamAccounts();
    }

    try {
      const accounts = await db.select().from(schema.iamAccounts);

      // Debug: Log first account's raw data
      if (accounts.length > 0) {
        console.log(`📧 [DB-DEBUG] First IAM account raw from DB:`, JSON.stringify(accounts[0], null, 2));
        console.log(`📧 [DB-DEBUG] userKnoxId field:`, accounts[0].userKnoxId);
        console.log(`📧 [DB-DEBUG] userKnoxId type:`, typeof accounts[0].userKnoxId);
      }

      const decrypted = batchDecryptFields(accounts, PII_FIELDS.iamAccount);

      // Debug: Log first account after decryption
      if (decrypted.length > 0) {
        console.log(`📧 [DB-DEBUG] First IAM account after decryption:`, JSON.stringify(decrypted[0], null, 2));
        console.log(`📧 [DB-DEBUG] userKnoxId after decryption:`, decrypted[0].userKnoxId);
      }

      return decrypted;
    } catch (error) {
      console.error('Database error in getIamAccounts, falling back to memory:', error);
      // If memoryStorage is not initialized or available, return empty array or throw error
      if (!this.memoryStorage) throw new Error('Memory storage not available');
      return this.memoryStorage.getIamAccounts();
    }
  }

  async getIamAccount(id: number): Promise<IamAccount | undefined> {
    const [account] = await db.select().from(iamAccounts).where(eq(iamAccounts.id, id));
    if (!account) return undefined;

    // Decrypt and map database fields to match the expected interface (only if ENCRYPTION_KEY is set)
    const decryptedAccount = process.env.ENCRYPTION_KEY
      ? decryptFields(account, PII_FIELDS.iamAccount)
      : account;

    return {
      id: decryptedAccount.id,
      requestor: decryptedAccount.requestor,
      knoxId: decryptedAccount.knoxId,
      permission: decryptedAccount.permission,
      durationStartDate: decryptedAccount.durationStartDate,
      durationEndDate: decryptedAccount.durationEndDate,
      cloudPlatform: decryptedAccount.cloudPlatform,
      projectAccounts: decryptedAccount.projectAccounts,
      approvalId: decryptedAccount.approvalId,
      remarks: decryptedAccount.remarks,
      status: decryptedAccount.status,
      createdAt: decryptedAccount.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: decryptedAccount.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  async createIamAccount(data: Omit<IamAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<IamAccount> {
    if (!db) {
      throw new Error('Database connection required for IAM accounts');
    }

    const newAccount = {
      requestor: data.requestor || null,
      knoxId: data.knoxId || null,
      name: data.name || null,
      userKnoxId: data.userKnoxId || null,
      permission: data.permission || null,
      durationStartDate: data.durationStartDate || null,
      durationEndDate: data.durationEndDate || null,
      cloudPlatform: data.cloudPlatform || null,
      projectAccounts: data.projectAccounts || null,
      approvalId: data.approvalId || null,
      remarks: data.remarks || null,
      status: data.status || 'active'
    };

    console.log('Creating IAM account with name:', newAccount.name);

    // Encrypt PII fields before inserting (only if ENCRYPTION_KEY is set)
    const encryptedData = process.env.ENCRYPTION_KEY
      ? encryptFields(newAccount, PII_FIELDS.iamAccount)
      : newAccount;

    // Insert - database will auto-generate timestamps
    const [account] = await db.insert(iamAccounts).values(encryptedData).returning();

    // Decrypt before returning to client (only if ENCRYPTION_KEY is set)
    const decryptedAccount = process.env.ENCRYPTION_KEY
      ? decryptFields(account, PII_FIELDS.iamAccount)
      : account;

    // Properly format timestamps - handle both Date objects and strings
    const formatTimestamp = (timestamp: any): string => {
      if (!timestamp) return new Date().toISOString();
      if (timestamp instanceof Date) return timestamp.toISOString();
      if (typeof timestamp === 'string') return timestamp;
      return new Date().toISOString();
    };

    return {
      ...decryptedAccount,
      createdAt: formatTimestamp(decryptedAccount.createdAt),
      updatedAt: formatTimestamp(decryptedAccount.updatedAt)
    };
  }

  async updateIamAccount(id: number, data: Partial<IamAccount>): Promise<IamAccount | undefined> {
    if (!db) {
      throw new Error('Database connection required for IAM accounts');
    }

    // Only include fields that were actually provided
    const updateData: any = {};
    if (data.requestor !== undefined) updateData.requestor = data.requestor;
    if (data.knoxId !== undefined) updateData.knoxId = data.knoxId;
    if (data.permission !== undefined) updateData.permission = data.permission;
    if (data.durationStartDate !== undefined) updateData.durationStartDate = data.durationStartDate;
    if (data.durationEndDate !== undefined) updateData.durationEndDate = data.durationEndDate;
    if (data.cloudPlatform !== undefined) updateData.cloudPlatform = data.cloudPlatform;
    if (data.projectAccounts !== undefined) updateData.projectAccounts = data.projectAccounts;
    if (data.approvalId !== undefined) updateData.approvalId = data.approvalId;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.status !== undefined) updateData.status = data.status;

    // Encrypt PII fields before updating (only if ENCRYPTION_KEY is set)
    const dataToStore = process.env.ENCRYPTION_KEY
      ? encryptFields(updateData, PII_FIELDS.iamAccount)
      : updateData;

    // Update - database will auto-update timestamp
    const [updatedAccount] = await db
      .update(iamAccounts)
      .set(dataToStore)
      .where(eq(iamAccounts.id, id))
      .returning();

    if (!updatedAccount) return undefined;

    // Decrypt before returning (only if ENCRYPTION_KEY is set)
    const decryptedAccount = process.env.ENCRYPTION_KEY
      ? decryptFields(updatedAccount, PII_FIELDS.iamAccount)
      : updatedAccount;

    // Properly format timestamps - handle both Date objects and strings
    const formatTimestamp = (timestamp: any): string => {
      if (!timestamp) return new Date().toISOString();
      if (timestamp instanceof Date) return timestamp.toISOString();
      if (typeof timestamp === 'string') return timestamp;
      return new Date().toISOString();
    };

    return {
      id: decryptedAccount.id,
      requestor: decryptedAccount.requestor,
      knoxId: decryptedAccount.knoxId,
      permission: decryptedAccount.permission,
      durationStartDate: decryptedAccount.durationStartDate,
      durationEndDate: decryptedAccount.durationEndDate,
      cloudPlatform: decryptedAccount.cloudPlatform,
      projectAccounts: decryptedAccount.projectAccounts,
      approvalId: decryptedAccount.approvalId,
      remarks: decryptedAccount.remarks,
      status: decryptedAccount.status,
      createdAt: formatTimestamp(decryptedAccount.createdAt),
      updatedAt: formatTimestamp(decryptedAccount.updatedAt)
    };
  }

  async deleteIamAccount(id: number): Promise<boolean> {
    if (!db) {
      throw new Error('Database connection required for IAM accounts');
    }
    const result = await db.delete(iamAccounts).where(eq(iamAccounts.id, id));
    return result.rowCount > 0;
  }

  async importIamAccounts(accounts: Partial<IamAccount>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!db) {
      throw new Error('Database connection required for IAM accounts');
    }
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const account of accounts) {
      try {
        // Prepare account data without timestamp fields
        const accountData = {
          requestor: account.requestor || null,
          knoxId: account.knoxId || null,
          name: account.name || null,
          userKnoxId: account.userKnoxId || null,
          permission: account.permission || null,
          durationStartDate: account.durationStartDate || null,
          durationEndDate: account.durationEndDate || null,
          cloudPlatform: account.cloudPlatform || null,
          projectAccounts: account.projectAccounts || null,
          approvalId: account.approvalId || null,
          remarks: account.remarks || null,
          status: account.status || 'active'
        };

        console.log('Importing IAM account - userKnoxId raw value:', JSON.stringify(account.userKnoxId));
        console.log('Importing IAM account - accountData.userKnoxId:', JSON.stringify(accountData.userKnoxId));
        await this.createIamAccount(accountData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${error.message}`);
      }
    }

    return results;
  }

  // Azure Inventory Methods
  async getAzureInventory(): Promise<AzureInventory[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(azureInventory);
  }

  async createAzureInventory(data: InsertAzureInventory): Promise<AzureInventory> {
    if (!db) throw new Error("Database connection required");
    const [resource] = await db.insert(azureInventory).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return resource;
  }

  async updateAzureInventory(id: number, data: Partial<InsertAzureInventory>): Promise<AzureInventory | undefined> {
    if (!db) throw new Error("Database connection required");
    const [resource] = await db.update(azureInventory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(azureInventory.id, id))
      .returning();
    return resource;
  }

  async deleteAzureInventory(id: number): Promise<boolean> {
    if (!db) throw new Error("Database connection required");
    const result = await db.delete(azureInventory).where(eq(azureInventory.id, id));
    return result.rowCount > 0;
  }

  // Azure Historical Data Methods
  async getAzureHistoricalData(): Promise<any[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(schema.azureHistoricalData).orderBy(desc(schema.azureHistoricalData.createdAt));
  }

  async createAzureHistoricalData(data: any): Promise<any> {
    if (!db) throw new Error("Database connection required");
    const [record] = await db.insert(schema.azureHistoricalData).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return record;
  }

  // GCP Historical Data Methods
  async getGcpHistoricalData(): Promise<any[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(schema.gcpHistoricalData).orderBy(desc(schema.gcpHistoricalData.createdAt));
  }

  async createGcpHistoricalData(data: any): Promise<any> {
    if (!db) throw new Error("Database connection required");
    const [record] = await db.insert(schema.gcpHistoricalData).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return record;
  }

  // GCP Inventory Methods
  async getGcpInventory(): Promise<GcpInventory[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(gcpInventory);
  }

  async createGcpInventory(data: InsertGcpInventory): Promise<GcpInventory> {
    if (!db) throw new Error("Database connection required");
    const [resource] = await db.insert(gcpInventory).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return resource;
  }

  async updateGcpInventory(id: number, data: Partial<InsertGcpInventory>): Promise<GcpInventory | undefined> {
    if (!db) throw new Error("Database connection required");
    const [resource] = await db.update(gcpInventory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gcpInventory.id, id))
      .returning();
    return resource;
  }

  async deleteGcpInventory(id: number): Promise<boolean> {
    if (!db) throw new Error("Database connection required");
    const result = await db.delete(gcpInventory).where(eq(gcpInventory.id, id));
    return result.rowCount > 0;
  }

  // AWS Inventory Methods
  async getAwsInventory(): Promise<any[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(awsInventory).orderBy(desc(awsInventory.createdAt));
  }

  async createAwsInventory(data: any): Promise<any> {
    if (!db) throw new Error("Database connection required");

    const resourceData = {
      identifier: data.identifier,
      service: data.service,
      type: data.type,
      region: data.region,
      accountName: data.accountName,
      accountId: data.accountId,
      status: data.status || 'active',
      remarks: data.remarks || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [resource] = await db.insert(awsInventory).values(resourceData).returning();

    return resource;
  }

  async updateAwsInventory(id: number, data: any): Promise<any> {
    if (!db) throw new Error("Database connection required");
    const [resource] = await db.update(awsInventory)
      .set({
        identifier: data.identifier,
        service: data.service,
        type: data.type,
        region: data.region,
        accountName: data.accountName,
        accountId: data.accountId,
        status: data.status,
        remarks: data.remarks || null,
        updatedAt: new Date(),
      })
      .where(eq(awsInventory.id, id))
      .returning();
    return resource;
  }

  async deleteAwsInventory(id: number): Promise<void> {
    if (!db) throw new Error("Database connection required");
    await db.delete(awsInventory).where(eq(awsInventory.id, id));
  }

  async importAwsInventory(resources: any[]): Promise<{ successful: number; failed: number; updated: number; deleted: number }> {
    if (!db) throw new Error("Database connection required");
    const monthYear = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    let successful = 0;
    let failed = 0;
    let updated = 0;
    let deleted = 0;

    const existingResources = await db.select().from(awsInventory);
    const importedIdentifiers = new Set(resources.map(r => r.identifier));

    for (const resource of resources) {
      try {
        const existing = existingResources.find(r => r.identifier === resource.identifier);

        if (existing) {
          await db.update(awsInventory)
            .set({
              service: resource.service,
              type: resource.type,
              region: resource.region,
              accountName: resource.accountName,
              accountId: resource.accountId,
              status: resource.status || 'active',
              remarks: resource.remarks || null,
              updatedAt: new Date(),
            })
            .where(eq(awsInventory.id, existing.id));

          await db.insert(awsHistoricalData).values({
            monthYear,
            changeType: 'updated',
            name: resource.identifier || 'Unknown',
            identifier: resource.identifier || 'N/A',
            service: resource.service || 'N/A',
            type: resource.type || 'N/A',
            region: resource.region || 'N/A',
            accountName: resource.accountName || 'N/A',
            accountId: resource.accountId || 'N/A',
            status: resource.status || 'active',
            remarks: resource.remarks || null,
          });

          updated++;
        } else {
          await db.insert(awsInventory).values({
            identifier: resource.identifier || 'N/A',
            service: resource.service || 'N/A',
            type: resource.type || 'N/A',
            region: resource.region || 'N/A',
            accountName: resource.accountName || 'N/A',
            accountId: resource.accountId || 'N/A',
            status: resource.status || 'active',
            remarks: resource.remarks || null,
          });

          await db.insert(awsHistoricalData).values({
            monthYear,
            changeType: 'imported',
            identifier: resource.identifier || 'N/A',
            service: resource.service || 'N/A',
            type: resource.type || 'N/A',
            region: resource.region || 'N/A',
            accountName: resource.accountName || 'N/A',
            accountId: resource.accountId || 'N/A',
            status: resource.status || 'active',
            remarks: resource.remarks || null,
          });
        }
        successful++;
      } catch (error) {
        console.error('Error importing AWS resource:', error);
        failed++;
      }
    }

    for (const existing of existingResources) {
      if (!importedIdentifiers.has(existing.identifier)) {
        await db.insert(awsHistoricalData).values({
          monthYear,
          changeType: 'deleted',
          identifier: existing.identifier || 'N/A',
          service: existing.service || 'N/A',
          type: existing.type || 'N/A',
          region: existing.region || 'N/A',
          accountName: existing.accountName || 'N/A',
          accountId: existing.accountId || 'N/A',
          status: existing.status || 'deleted',
          remarks: existing.remarks || null,
        });
        deleted++;
      }
    }

    return { successful, failed, updated, deleted };
  }

  async getAwsInventoryHistorical(): Promise<any[]> {
    if (!db) throw new Error("Database connection required");
    return await db.select().from(awsHistoricalData).orderBy(desc(awsHistoricalData.createdAt));
  }

  async getPageBySlug(slug: string): Promise<any | undefined> {
    const page = await db.select()
      .from(schema.customPages)
      .where(eq(schema.customPages.pageSlug, slug))
      .limit(1);

    return page[0] || undefined;
  }

  // Encryption helper methods
  encrypt(text: string | null | undefined): string | null {
    return encrypt(text);
  }

  decrypt(text: string | null | undefined): string | null {
    return decrypt(text);
  }

  // Method to create an activity log with optional metadata
  async logActivity(
    userId: number,
    itemType: string,
    itemId: number | null,
    action: string,
    category: 'asset' | 'user' | 'system' = 'system',
    metadata?: any
  ): Promise<void> {
    await db.insert(activities).values({
      userId,
      itemType,
      itemId,
      action,
      timestamp: new Date().toISOString(),
      category,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  }
}

// Removed duplicate initializeDatabase function - using the one from the DatabaseStorage class above