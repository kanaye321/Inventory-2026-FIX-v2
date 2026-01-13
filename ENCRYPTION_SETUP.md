
# PII Encryption Setup Guide

This guide explains how to set up and use the PII encryption feature in SRPH-MIS.

## ⚠️ Important: Encryption is Disabled by Default

By default, **encryption is turned OFF** and all PII data is stored in plain text. This allows you to get started quickly without configuration, but it's recommended to enable encryption for production environments.

## Overview

The system can encrypt all Personally Identifiable Information (PII) at rest using AES-256-GCM encryption. This includes:

- **User Data**: Email, first name, last name, department
- **Asset Data**: Serial numbers, MAC addresses, IP addresses
- **BitLocker Keys**: Serial numbers, identifiers, recovery keys
- **VM Inventory**: Requestor info, IP addresses
- **IAM Accounts**: Requestor information
- **Equipment**: Serial numbers
- **Monitor Inventory**: Asset numbers, serial numbers

**Note**: Knox IDs are intentionally **NOT encrypted** to allow for easy searching and reference.

## Setup Instructions

### 1. Generate Encryption Key

Generate a secure encryption key using the Secrets tool:

1. Open your Repl
2. Navigate to **Tools** → **Secrets**
3. Click **+ New Secret**
4. Set the key name as: `ENCRYPTION_KEY`
5. Generate a secure random value (32+ characters recommended)
6. Click **Add Secret**

**Example**: You can generate a key using Node.js:
```javascript
require('crypto').randomBytes(32).toString('base64')
```

### 2. Restart Your Application

After adding the encryption key, **restart your Repl** for the changes to take effect.

You should see this message in the console:
```
✅ ENCRYPTION ENABLED - Using configured ENCRYPTION_KEY
```

### 3. Encrypt Existing Data (Web Interface - Recommended)

The easiest way to encrypt existing data is through the web interface:

1. Log in as an administrator
2. Navigate to **Admin → Data Encryption**
3. Click **Encrypt All Data**
4. Enter your admin password when prompted
5. Wait for the encryption process to complete

### Alternative: Command Line Encryption

You can also encrypt data via command line:

```bash
npm run encrypt-data
```

Or run directly:
```bash
node -r esbuild-register server/encrypt-existing-data.ts
```

## Current Status: Encryption Disabled

When encryption is disabled (no `ENCRYPTION_KEY` set), you'll see this warning in the console:

```
╔════════════════════════════════════════════════════════════════╗
║  🔓 ENCRYPTION DISABLED - No ENCRYPTION_KEY configured         ║
║                                                                ║
║  All PII data will be stored in PLAIN TEXT                     ║
║                                                                ║
║  To enable encryption:                                         ║
║  1. Go to Tools → Secrets in Replit                           ║
║  2. Add a new secret named: ENCRYPTION_KEY                     ║
║  3. Set a strong random value (32+ characters)                 ║
║  4. Restart your application                                   ║
║  5. Use Admin → Data Encryption to encrypt existing data       ║
╚════════════════════════════════════════════════════════════════╝
```

## Decrypting Data

If you need to decrypt data (e.g., for migration or key rotation):

### Web Interface (Recommended)
1. Navigate to **Admin → Data Encryption**
2. Click **Decrypt All Data**
3. Enter your admin password
4. Confirm the operation

### Command Line
```bash
npm run decrypt-data
```

## Security Best Practices

1. **Enable encryption for production** - Don't leave PII in plain text
2. **Never commit the encryption key** to version control
3. **Store the key securely** in Replit Secrets or a secure key management service
4. **Rotate keys periodically** (every 90 days recommended)
5. **Backup encrypted data** before key rotation
6. **Limit access** to the encryption key to authorized personnel only

## How It Works

### When Encryption is Disabled (Default)
- Data is stored in plain text
- No encryption or decryption overhead
- Easy to search and debug
- **NOT recommended for production**

### When Encryption is Enabled
1. When PII is stored, it's encrypted using AES-256-GCM
2. Each field is encrypted with a unique IV (Initialization Vector)
3. An authentication tag ensures data integrity
4. Encrypted format: `iv:encrypted_data:auth_tag`

### Decryption Process
1. Data is automatically decrypted when retrieved
2. The system verifies the authentication tag
3. If verification fails, an error is thrown
4. Backward compatibility: Unencrypted data is returned as-is

## Encrypted Fields

### Users
- `email`
- `firstName`
- `lastName`
- `department`

### Assets
- `serialNumber`
- `macAddress`
- `ipAddress`

### BitLocker Keys
- `serialNumber`
- `identifier`
- `recoveryKey` (most critical)

### VM Inventory
- `requestor`
- `vmIp`
- `ipAddress`
- `macAddress`

### IAM Accounts
- `requestor`

### IT Equipment
- `serialNumber`

### Monitor Inventory
- `assetNumber`
- `serialNumber`

## Troubleshooting

### Console Shows "Encryption Disabled" Warning
This is **normal** and expected. Encryption is disabled by default. Follow the setup instructions above to enable it.

### Data Not Encrypting After Setting Key
1. Verify the `ENCRYPTION_KEY` secret is set correctly
2. **Restart the application** (required for changes to take effect)
3. Check console for "✅ ENCRYPTION ENABLED" message
4. Use the "Encrypt All Data" button in Admin → Data Encryption

### "Failed to decrypt data" Error
This usually means:
- The encryption key has changed
- Data was encrypted with a different key
- Database corruption

**Solution**: Restore the original `ENCRYPTION_KEY` or decrypt and re-encrypt with the new key.

## Migration Path

### From No Encryption to Encrypted
1. Set `ENCRYPTION_KEY` in Secrets
2. Restart application
3. Run encryption (Web UI or command line)
4. Verify encryption worked
5. Backup database

### From Encrypted to No Encryption
1. Navigate to Admin → Data Encryption
2. Click "Decrypt All Data"
3. Remove `ENCRYPTION_KEY` from Secrets
4. Restart application

## Performance Impact

- **Disabled**: No performance impact
- **Enabled**: Minimal impact (< 5ms per operation)
- Batch operations use optimized encryption
- Decryption is cached where possible
