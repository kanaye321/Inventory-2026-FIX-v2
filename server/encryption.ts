
import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get or generate encryption key from environment
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn('╔════════════════════════════════════════════════════════════════╗');
    console.warn('║  🔓 ENCRYPTION DISABLED - No ENCRYPTION_KEY configured         ║');
    console.warn('║                                                                ║');
    console.warn('║  All PII data will be stored in PLAIN TEXT                     ║');
    console.warn('║                                                                ║');
    console.warn('║  To enable encryption:                                         ║');
    console.warn('║  1. Go to Tools → Secrets in Replit                           ║');
    console.warn('║  2. Add a new secret named: ENCRYPTION_KEY                     ║');
    console.warn('║  3. Set a strong random value (32+ characters)                 ║');
    console.warn('║  4. Restart your application                                   ║');
    console.warn('║  5. Use Admin → Data Encryption to encrypt existing data       ║');
    console.warn('╚════════════════════════════════════════════════════════════════╝');
    // Generate a consistent key from a seed for development (NOT FOR PRODUCTION)
    return crypto.pbkdf2Sync('default-development-key', 'srph-mis-salt', ITERATIONS, KEY_LENGTH, 'sha512');
  }
  
  console.log('✅ ENCRYPTION ENABLED - Using configured ENCRYPTION_KEY');
  // Derive key from environment variable - use same salt for consistency
  return crypto.pbkdf2Sync(envKey, 'srph-mis-salt', ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:encrypted:authTag (or plain text if encryption disabled)
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  // If no encryption key is set, do not encrypt.
  // Return plain text if encryption is disabled.
  if (!process.env.ENCRYPTION_KEY) {
    return text;
  }

  // If data is already encrypted, don't re-encrypt it
  if (text.includes(':') && text.split(':').length === 3) {
    return text;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string in format: iv:encrypted:authTag
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || encryptedText.trim() === '') {
    return null;
  }

  try {
    // Check if data is already in plain text (backward compatibility)
    if (!encryptedText.includes(':')) {
      console.warn('⚠️ Data appears to be unencrypted, returning as-is');
      return encryptedText;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.warn('⚠️ Invalid encrypted data format, returning as-is');
      return encryptedText;
    }

    const [ivHex, encrypted, authTagHex] = parts;
    
    // Validate hex strings before attempting decryption
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(ivHex) || !hexRegex.test(encrypted) || !hexRegex.test(authTagHex)) {
      console.warn('⚠️ Invalid hex format in encrypted data, returning as-is');
      return encryptedText;
    }
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    // Log detailed error for debugging
    console.error('Decryption error details:', {
      message: error.message,
      code: error.code,
      encryptedTextLength: encryptedText?.length,
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY
    });
    
    // Return the original encrypted text instead of throwing
    // This prevents the app from breaking when encryption key is wrong
    console.warn('⚠️ Unable to decrypt data, returning encrypted value. This may indicate encryption key mismatch.');
    return encryptedText;
  }
}

/**
 * Encrypt an object's sensitive fields
 * @param data - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const encrypted = { ...data };
  
  // If encryption is disabled, decrypt any encrypted fields and return plain text
  if (!process.env.ENCRYPTION_KEY) {
    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        const value = encrypted[field] as string;
        // If the value is encrypted, decrypt it
        if (value.includes(':') && value.split(':').length === 3) {
          try {
            encrypted[field] = decrypt(value) as any;
          } catch (error) {
            // If decryption fails, keep the original value
            console.warn(`Failed to decrypt field ${String(field)}, keeping original value`);
          }
        }
      }
    }
    return encrypted;
  }
  
  // Encryption is enabled, encrypt plain text fields (skip already encrypted ones)
  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string) as any;
    }
  }
  
  return encrypted;
}

/**
 * Decrypt an object's sensitive fields
 * @param data - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const decrypted = { ...data };
  
  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        const decryptedValue = decrypt(decrypted[field] as string);
        // Only update if decryption succeeded and returned a different value
        if (decryptedValue !== null && decryptedValue !== decrypted[field]) {
          decrypted[field] = decryptedValue as any;
        }
      } catch (error: any) {
        // If decryption fails, keep original value (might be unencrypted)
        console.warn(`Failed to decrypt field ${String(field)}:`, error?.message || 'Unknown error');
      }
    }
  }
  
  return decrypted;
}

/**
 * Batch decrypt multiple records for better performance
 * @param records - Array of records to decrypt
 * @param fields - Array of field names to decrypt
 * @returns Array of records with decrypted fields
 */
export function batchDecryptFields<T extends Record<string, any>>(
  records: T[],
  fields: (keyof T)[]
): T[] {
  if (!records || records.length === 0) return records;
  
  // Process in chunks of 100 for better performance
  const chunkSize = 100;
  const results: T[] = [];
  
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const decryptedChunk = chunk.map(record => {
      const decrypted = { ...record };
      for (const field of fields) {
        if (decrypted[field] && typeof decrypted[field] === 'string') {
          try {
            decrypted[field] = decrypt(decrypted[field] as string) as any;
          } catch (error) {
            // Keep original value if decryption fails
            console.warn(`Batch decrypt failed for field ${String(field)}`);
          }
        }
      }
      return decrypted;
    });
    results.push(...decryptedChunk);
  }
  
  return results;
}

/**
 * Hash sensitive data (one-way, for comparison purposes)
 * @param text - Text to hash
 * @returns Hashed string
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure random encryption key
 * @returns Base64 encoded encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

// PII field definitions for different entities
// NOTE: knoxId is intentionally NOT encrypted to allow for easy searching
export const PII_FIELDS = {
  user: ['email', 'firstName', 'lastName', 'department'],
  asset: ['serialNumber', 'macAddress', 'ipAddress'],
  bitlockerKey: ['serialNumber', 'identifier', 'recoveryKey'],
  consumable: ['serialNumber', 'modelNumber'],
  accessory: ['serialNumber'],
  component: ['serialNumber'],
  license: ['key'],
  vmInventory: ['requestor', 'vmIp', 'ipAddress', 'macAddress'],
  iamAccount: ['requestor'],
  itEquipment: ['serialNumber'],
  monitor: ['assetNumber', 'serialNumber']
} as const;
