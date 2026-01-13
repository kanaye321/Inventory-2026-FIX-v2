
import { db } from "./db";
import * as schema from "@shared/schema";
import { decryptFields, PII_FIELDS } from "./encryption";
import { eq } from "drizzle-orm";

/**
 * Script to decrypt existing encrypted PII data in the database
 * This reverses the encryption and stores data in plain text
 * WARNING: Only use this if you want to remove encryption from your data
 */
async function decryptExistingData() {
  if (!db) {
    console.error("❌ Database connection required for decryption");
    return;
  }

  console.log("🔓 Starting PII decryption process...");
  console.log("⚠️  This will convert encrypted data back to plain text");

  try {
    // Decrypt users
    console.log("Decrypting user data...");
    const users = await db.select().from(schema.users);
    let decryptedUserCount = 0;
    for (const user of users) {
      // Check if data is encrypted (encrypted data has format: iv:encrypted:authTag)
      const isEncrypted = user.email && user.email.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(user, PII_FIELDS.user);
          await db.update(schema.users)
            .set({
              email: decrypted.email,
              firstName: decrypted.firstName,
              lastName: decrypted.lastName,
              department: decrypted.department
            })
            .where(eq(schema.users.id, user.id));
          decryptedUserCount++;
        } catch (error) {
          console.error(`Failed to decrypt user ${user.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedUserCount} of ${users.length} users`);

    // Decrypt assets
    console.log("Decrypting asset data...");
    const assets = await db.select().from(schema.assets);
    let decryptedAssetCount = 0;
    for (const asset of assets) {
      const isEncrypted = asset.serialNumber && asset.serialNumber.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(asset, PII_FIELDS.asset);
          await db.update(schema.assets)
            .set({
              serialNumber: decrypted.serialNumber,
              macAddress: decrypted.macAddress,
              ipAddress: decrypted.ipAddress
            })
            .where(eq(schema.assets.id, asset.id));
          decryptedAssetCount++;
        } catch (error) {
          console.error(`Failed to decrypt asset ${asset.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedAssetCount} of ${assets.length} assets`);

    // Decrypt BitLocker keys
    console.log("Decrypting BitLocker keys...");
    const keys = await db.select().from(schema.bitlockerKeys);
    let decryptedKeyCount = 0;
    for (const key of keys) {
      const isEncrypted = key.recoveryKey && key.recoveryKey.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(key, PII_FIELDS.bitlockerKey);
          await db.update(schema.bitlockerKeys)
            .set({
              serialNumber: decrypted.serialNumber,
              identifier: decrypted.identifier,
              recoveryKey: decrypted.recoveryKey
            })
            .where(eq(schema.bitlockerKeys.id, key.id));
          decryptedKeyCount++;
        } catch (error) {
          console.error(`Failed to decrypt BitLocker key ${key.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedKeyCount} of ${keys.length} BitLocker keys`);

    // Decrypt VM Inventory
    console.log("Decrypting VM inventory...");
    const vmInventory = await db.select().from(schema.vmInventory);
    let decryptedVmCount = 0;
    for (const vm of vmInventory) {
      const isEncrypted = vm.requestor && vm.requestor.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(vm, PII_FIELDS.vmInventory);
          await db.update(schema.vmInventory)
            .set({
              requestor: decrypted.requestor,
              vmIp: decrypted.vmIp,
              ipAddress: decrypted.ipAddress,
              macAddress: decrypted.macAddress
              // knoxId is NOT encrypted - skip it
            })
            .where(eq(schema.vmInventory.id, vm.id));
          decryptedVmCount++;
        } catch (error) {
          console.error(`Failed to decrypt VM ${vm.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedVmCount} of ${vmInventory.length} VM inventory items`);

    // Decrypt IAM Accounts
    console.log("Decrypting IAM accounts...");
    const iamAccounts = await db.select().from(schema.iamAccounts);
    let decryptedIamCount = 0;
    for (const account of iamAccounts) {
      const isEncrypted = account.knoxId && account.knoxId.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(account, PII_FIELDS.iamAccount);
          await db.update(schema.iamAccounts)
            .set({
              knoxId: decrypted.knoxId,
              requestor: decrypted.requestor
            })
            .where(eq(schema.iamAccounts.id, account.id));
          decryptedIamCount++;
        } catch (error) {
          console.error(`Failed to decrypt IAM account ${account.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedIamCount} of ${iamAccounts.length} IAM accounts`);

    // Decrypt IT Equipment
    console.log("Decrypting IT equipment...");
    const itEquipment = await db.select().from(schema.itEquipment);
    let decryptedEquipmentCount = 0;
    for (const equipment of itEquipment) {
      const isEncrypted = equipment.serialNumber && equipment.serialNumber.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(equipment, PII_FIELDS.itEquipment);
          await db.update(schema.itEquipment)
            .set({
              knoxId: decrypted.knoxId,
              serialNumber: decrypted.serialNumber
            })
            .where(eq(schema.itEquipment.id, equipment.id));
          decryptedEquipmentCount++;
        } catch (error) {
          console.error(`Failed to decrypt IT equipment ${equipment.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedEquipmentCount} of ${itEquipment.length} IT equipment items`);

    // Decrypt Monitor Inventory
    console.log("Decrypting monitor inventory...");
    const monitorInventory = await db.select().from(schema.monitorInventory);
    let decryptedMonitorCount = 0;
    for (const monitor of monitorInventory) {
      const isEncrypted = monitor.serialNumber && monitor.serialNumber.split(':').length === 3;
      if (isEncrypted) {
        try {
          const decrypted = decryptFields(monitor, PII_FIELDS.monitor);
          await db.update(schema.monitorInventory)
            .set({
              assetNumber: decrypted.assetNumber,
              serialNumber: decrypted.serialNumber
              // knoxId is NOT encrypted - skip it
            })
            .where(eq(schema.monitorInventory.id, monitor.id));
          decryptedMonitorCount++;
        } catch (error) {
          console.error(`Failed to decrypt monitor ${monitor.id}:`, error);
        }
      }
    }
    console.log(`✅ Decrypted ${decryptedMonitorCount} of ${monitorInventory.length} monitor inventory items`);

    console.log("✅ PII decryption completed successfully!");
    console.log("📋 All encrypted data has been converted back to plain text");
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    throw error;
  }
}

// Run if executed directly
decryptExistingData()
  .then(() => {
    console.log("✅ Decryption completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Decryption failed:", error);
    process.exit(1);
  });
