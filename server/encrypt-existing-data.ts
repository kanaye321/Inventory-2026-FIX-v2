
import { db } from "./db";
import * as schema from "@shared/schema";
import { encryptFields, PII_FIELDS } from "./encryption";
import { eq } from "drizzle-orm";

/**
 * Migration script to encrypt existing PII data in the database
 * Run this once after deploying the encryption feature
 */
export async function encryptExistingData() {
  if (!db) {
    console.error("❌ Database connection required for migration");
    throw new Error("Database connection required");
  }

  console.log("🔐 Starting PII encryption migration...");

  let totalEncrypted = 0;

  try {
    // Encrypt users
    console.log("Encrypting user data...");
    const users = await db.select().from(schema.users);
    let encryptedUserCount = 0;
    for (const user of users) {
      // Check if already encrypted (encrypted data has format: iv:encrypted:authTag)
      const isAlreadyEncrypted = user.email && user.email.split(':').length === 3;
      if (user.email && !isAlreadyEncrypted) {
        try {
          const encrypted = encryptFields(user, PII_FIELDS.user);
          await db.update(schema.users)
            .set({
              email: encrypted.email,
              firstName: encrypted.firstName,
              lastName: encrypted.lastName,
              department: encrypted.department
            })
            .where(eq(schema.users.id, user.id));
          encryptedUserCount++;
          totalEncrypted++;
        } catch (error) {
          console.error(`Failed to encrypt user ${user.id}:`, error);
        }
      }
    }
    console.log(`✅ Encrypted ${encryptedUserCount} of ${users.length} users`);

    // Encrypt assets
    console.log("Encrypting asset data...");
    const assets = await db.select().from(schema.assets);
    let encryptedAssetCount = 0;
    for (const asset of assets) {
      const isAlreadyEncrypted = asset.serialNumber && asset.serialNumber.split(':').length === 3;
      if (asset.serialNumber && !isAlreadyEncrypted) {
        try {
          const encrypted = encryptFields(asset, PII_FIELDS.asset);
          await db.update(schema.assets)
            .set({
              serialNumber: encrypted.serialNumber,
              macAddress: encrypted.macAddress,
              ipAddress: encrypted.ipAddress
            })
            .where(eq(schema.assets.id, asset.id));
          encryptedAssetCount++;
        } catch (error) {
          console.error(`Failed to encrypt asset ${asset.id}:`, error);
        }
      }
    }
    console.log(`✅ Encrypted ${encryptedAssetCount} of ${assets.length} assets`);

    // Encrypt BitLocker keys
    console.log("Encrypting BitLocker keys...");
    const keys = await db.select().from(schema.bitlockerKeys);
    for (const key of keys) {
      if (key.recoveryKey && !key.recoveryKey.includes(':')) {
        const encrypted = encryptFields(key, PII_FIELDS.bitlockerKey);
        await db.update(schema.bitlockerKeys)
          .set({
            serialNumber: encrypted.serialNumber,
            identifier: encrypted.identifier,
            recoveryKey: encrypted.recoveryKey
          })
          .where(eq(schema.bitlockerKeys.id, key.id));
      }
    }
    console.log(`✅ Encrypted ${keys.length} BitLocker keys`);

    // Encrypt VM Inventory
    console.log("Encrypting VM inventory...");
    const vmInventory = await db.select().from(schema.vmInventory);
    let encryptedVmCount = 0;
    for (const vm of vmInventory) {
      const isAlreadyEncrypted = vm.requestor && vm.requestor.split(':').length === 3;
      if (vm.requestor && !isAlreadyEncrypted) {
        const encrypted = encryptFields(vm, PII_FIELDS.vmInventory);
        await db.update(schema.vmInventory)
          .set({
            requestor: encrypted.requestor,
            vmIp: encrypted.vmIp,
            ipAddress: encrypted.ipAddress,
            macAddress: encrypted.macAddress
            // knoxId is NOT encrypted - left as plain text for searching
          })
          .where(eq(schema.vmInventory.id, vm.id));
        encryptedVmCount++;
        totalEncrypted++;
      }
    }
    console.log(`✅ Encrypted ${encryptedVmCount} of ${vmInventory.length} VM inventory items`);

    // Encrypt IAM Accounts
    console.log("Encrypting IAM accounts...");
    const iamAccounts = await db.select().from(schema.iamAccounts);
    for (const account of iamAccounts) {
      if (account.requestor && !account.requestor.includes(':')) {
        const encrypted = encryptFields(account, PII_FIELDS.iamAccount);
        await db.update(schema.iamAccounts)
          .set({
            requestor: encrypted.requestor
          })
          .where(eq(schema.iamAccounts.id, account.id));
      }
    }
    console.log(`✅ Encrypted ${iamAccounts.length} IAM accounts`);

    // Encrypt IT Equipment
    console.log("Encrypting IT equipment...");
    const itEquipment = await db.select().from(schema.itEquipment);
    for (const equipment of itEquipment) {
      if (equipment.serialNumber && !equipment.serialNumber.includes(':')) {
        const encrypted = encryptFields(equipment, PII_FIELDS.itEquipment);
        await db.update(schema.itEquipment)
          .set({
            serialNumber: encrypted.serialNumber
          })
          .where(eq(schema.itEquipment.id, equipment.id));
      }
    }
    console.log(`✅ Encrypted ${itEquipment.length} IT equipment items`);

    // Encrypt Monitor Inventory
    console.log("Encrypting monitor inventory...");
    const monitorInventory = await db.select().from(schema.monitorInventory);
    let encryptedMonitorCount = 0;
    for (const monitor of monitorInventory) {
      const isAlreadyEncrypted = monitor.serialNumber && monitor.serialNumber.split(':').length === 3;
      if (monitor.serialNumber && !isAlreadyEncrypted) {
        const encrypted = encryptFields(monitor, PII_FIELDS.monitor);
        await db.update(schema.monitorInventory)
          .set({
            assetNumber: encrypted.assetNumber,
            serialNumber: encrypted.serialNumber
            // knoxId is NOT encrypted - left as plain text for searching
          })
          .where(eq(schema.monitorInventory.id, monitor.id));
        encryptedMonitorCount++;
        totalEncrypted++;
      }
    }
    console.log(`✅ Encrypted ${encryptedMonitorCount} of ${monitorInventory.length} monitor inventory items`);

    console.log("✅ PII encryption migration completed successfully!");
    console.log(`📊 Total records encrypted: ${totalEncrypted}`);
    return totalEncrypted;
  } catch (error) {
    console.error("❌ Encryption migration failed:", error);
    throw error;
  }
}

// Run if executed directly
encryptExistingData()
  .then(() => {
    console.log("✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
