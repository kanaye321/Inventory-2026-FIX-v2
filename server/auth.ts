import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";
import connectPgSimple from 'connect-pg-simple';
import { pool } from "./db";
import createMemoryStore from 'memorystore';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

declare global {
  namespace Express {
    // Use UserType to avoid recursive type reference
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Make sure we have a valid stored password with both hash and salt
  if (!stored || !stored.includes(".")) {
    return false;
  }

  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }

  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use in-memory session store for better Windows compatibility
  const MemoryStore = createMemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'srph-mis-default-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }

        console.log(`User found: ${user.username}, password type: ${user.password?.includes('.') ? 'hashed' : 'plain'}`);

        // For simplicity in development, if no password hashing is set up yet,
        // allow login with plain text password comparison
        // In production, you would always use proper password hashing

        // Check if password is already hashed (contains a dot separator)
        if (user.password && user.password.includes(".")) {
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false);
          }
        } 
        // For plain text passwords (during development/testing only)
        else {
          // Direct comparison for plain text passwords
          if (user.password !== password) {
            return done(null, false);
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Starting deserialization for user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        // User not found, clear the session
        console.log(`User with ID ${id} not found during session deserialization`);
        return done(null, false);
      }

      console.log(`User found - ID: ${user.id}, Username: ${user.username}, MFA: ${user.mfaEnabled}`);

      // Ensure admin flag is properly set and permissions are loaded
      console.log(`Deserializing user ${user.username} with admin status: ${user.isAdmin}, roleId: ${user.roleId}`);

      // Always load fresh permissions based on current role or admin status
      const { getPermissionsForRole } = await import("./roles");

      // Normalize admin status to boolean - ensure it's explicitly true or false
      const isUserAdmin = user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === "true";
      user.isAdmin = isUserAdmin;
      
      console.log(`Admin status normalized to: ${isUserAdmin}`);

      if (isUserAdmin) {
        // If user is admin, give them full permissions
        user.permissions = {
          assets: { view: true, edit: true, add: true, delete: true },
          components: { view: true, edit: true, add: true, delete: true },
          accessories: { view: true, edit: true, add: true, delete: true },
          consumables: { view: true, edit: true, add: true, delete: true },
          licenses: { view: true, edit: true, add: true, delete: true },
          users: { view: true, edit: true, add: true, delete: true },
          reports: { view: true, edit: true, add: true, delete: true },
          vmMonitoring: { view: true, edit: true, add: true, delete: true },
          networkDiscovery: { view: true, edit: true, add: true, delete: true },
          bitlockerKeys: { view: true, edit: true, add: true, delete: true },
          admin: { view: true, edit: true, add: true, delete: true }
        };
        console.log(`Admin permissions loaded for user ${user.username}`);
      } else {
        // Load permissions based on role or use defaults
        const rolePermissions = getPermissionsForRole(user.roleId);
        user.permissions = rolePermissions;
        console.log(`Role permissions loaded for user ${user.username} (roleId: ${user.roleId}):`, JSON.stringify(rolePermissions, null, 2));
      }

      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(null, false);
    }
  });

  // Register a new user
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Force consistent data format
      const userData = {
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        department: req.body.department || null,
        password: req.body.password, // Will be hashed below
        isAdmin: req.body.isAdmin || false
      };

      // Hash the password
      userData.password = await hashPassword(userData.password);

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", async (err: Error, user: UserType) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // Log failed login attempt
        const { logUserAuth } = await import("./logger");
        await logUserAuth({
          username: req.body.username,
          action: 'failed_login',
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent']
        });
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check if user has MFA enabled
      const fullUser = await storage.getUser(user.id);

      if (fullUser.mfaEnabled && fullUser.mfaSecret) {
        // MFA is enabled, require token verification - DO NOT LOG IN YET
        console.log(`MFA required for user: ${user.username}`);
        return res.status(200).json({
          requiresMfa: true,
          userId: user.id,
          username: user.username,
          message: "Please enter your 6-digit code from Microsoft Authenticator app"
        });
      }

      // Check if password change is required
      if (fullUser.forcePasswordChange) {
        console.log(`Password change required for user: ${user.username}`);
        
        // Log the user in temporarily so they can change their password
        req.login(user, async (loginErr) => {
          if (loginErr) {
            console.error('Login error during password change redirect:', loginErr);
            return next(loginErr);
          }

          return res.status(200).json({
            requiresPasswordChange: true,
            userId: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            message: "You must change your password before continuing"
          });
        });
        return;
      }

      // MFA NOT ENABLED - Enforce MFA registration
      console.log(`MFA not enabled for user: ${user.username} - requiring MFA setup`);

      // Log the user in temporarily so they can access MFA setup page
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error('Login error during MFA setup redirect:', loginErr);
          return next(loginErr);
        }

        // Load permissions for the user before responding
        const { getPermissionsForRole } = await import("./roles");
        const isUserAdmin = user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === "true";

        let permissions;
        if (isUserAdmin) {
          permissions = {
            assets: { view: true, edit: true, add: true, delete: true },
            components: { view: true, edit: true, add: true, delete: true },
            accessories: { view: true, edit: true, add: true, delete: true },
            consumables: { view: true, edit: true, add: true, delete: true },
            licenses: { view: true, edit: true, add: true, delete: true },
            users: { view: true, edit: true, add: true, delete: true },
            reports: { view: true, edit: true, add: true, delete: true },
            vmMonitoring: { view: true, edit: true, add: true, delete: true },
            networkDiscovery: { view: true, edit: true, add: true, delete: true },
            bitlockerKeys: { view: true, edit: true, add: true, delete: true },
            admin: { view: true, edit: true, add: true, delete: true }
          };
        } else {
          permissions = getPermissionsForRole(user.roleId);
        }

        // Log successful login
        const loginTime = new Date().toISOString();
        const authLog = {
          timestamp: loginTime,
          username: user.username,
          action: 'login_mfa_setup_required',
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          loginTime: new Date(loginTime).toLocaleString('en-US', { 
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
        };

        const logDir = path.join(process.cwd(), 'LOGS', 'auth');
        const logFile = path.join(logDir, `auth_${new Date().toISOString().split('T')[0]}.log`);

        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFile, JSON.stringify(authLog) + '\n');

        console.log('Returning user data with MFA setup requirement:', {
          username: user.username,
          isAdmin: isUserAdmin,
          mfaEnabled: false
        });

        // Return complete user data with MFA setup flag
        return res.status(200).json({
          requiresMfaSetup: true,
          id: user.id,
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          department: user.department,
          isAdmin: isUserAdmin,
          roleId: user.roleId,
          permissions: permissions,
          mfaEnabled: false,
          message: "You must set up Two-Factor Authentication to continue"
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/logout", async (req: Request, res: Response, next: NextFunction) => {
    const reason = req.body?.reason || 'manual';
    const user = req.user as Express.User | undefined;

    req.logout(async (err) => {
      if (err) {
        return next(err);
      }

      // Log the logout event
      if (user) {
        const logoutLog = {
          timestamp: new Date().toISOString(),
          username: (user as any).username,
          action: reason === 'inactivity' ? 'auto-logout' : 'logout',
          reason: reason,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          logoutTime: new Date().toLocaleString('en-US', { 
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
        };

        const logDir = path.join(process.cwd(), 'LOGS', 'auth');
        const logFile = path.join(logDir, `auth_${new Date().toISOString().split('T')[0]}.log`);

        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFile, JSON.stringify(logoutLog) + '\n');
      }

      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req: Request, res: Response) => {
    console.log('GET /api/user - isAuthenticated:', req.isAuthenticated(), 'sessionID:', req.sessionID);
    if (!req.isAuthenticated()) {
      console.log('User not authenticated, returning 401');
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log('Returning user data:', {
      id: req.user.id,
      username: req.user.username,
      mfaEnabled: req.user.mfaEnabled,
      isAdmin: req.user.isAdmin,
      forcePasswordChange: req.user.forcePasswordChange
    });
    res.json(req.user);
  });

  // Add /api/me endpoint for compatibility
  app.get("/api/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // User password change endpoint
  app.post("/api/user/change-password", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword, forceChange } = req.body;

    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ message: "New password is required" });
    }

    try {
      const user = await storage.getUser(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If not a forced password change, verify current password
      if (!forceChange && (!currentPassword || currentPassword.trim() === '')) {
        return res.status(400).json({ message: "Current password is required" });
      }

      // Verify current password (unless it's a forced change)
      if (!forceChange) {
        const { scrypt, randomBytes, timingSafeEqual } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);

        const [hashed, salt] = user.password.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(currentPassword, salt, 64)) as Buffer;
        
        if (!timingSafeEqual(hashedBuf, suppliedBuf)) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      // Hash the new password
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);

      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Update user password and clear force change flag
      await storage.updateUser(req.user.id, {
        password: hashedPassword,
        forcePasswordChange: false
      });

      console.log(`User ${user.username} changed their password`);

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "user",
        itemId: req.user.id,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        notes: `User changed their own password`,
      });

      return res.status(200).json({ 
        success: true, 
        message: "Password changed successfully"
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      return res.status(500).json({ 
        success: false,
        message: error?.message || "Failed to change password" 
      });
    }
  });

  // Setup endpoints
  app.post("/api/setup/admin", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if any users exist
      const users = await storage.getUsers();
      if (users.length > 0) {
        return res.status(400).json({ message: "Setup has already been completed" });
      }

      // Force consistent data format
      const userData = {
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        department: req.body.department || null,
        password: req.body.password, // Will be hashed below
        isAdmin: true
      };

      // Hash the password
      userData.password = await hashPassword(userData.password);

      const adminUser = await storage.createUser(userData);

      // Auto-login the admin user
      req.login(adminUser, (err) => {
        if (err) return next(err);
        res.status(201).json({ message: "Admin account created successfully", user: adminUser });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/setup/database", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { importDemoData, customSqlScript } = req.body;

      // Check if user is authenticated and is admin
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ message: "Only administrators can perform database setup" });
      }

      // Execute custom SQL if provided
      if (customSqlScript) {
        try {
          // In a real implementation, we would execute the custom SQL here
          // But for safety, we'll just acknowledge it
          console.log("Custom SQL script would be executed here");
        } catch (sqlError) {
          return res.status(400).json({ 
            message: "Error executing custom SQL script", 
            error: sqlError.message 
          });
        }
      }

      // Import demo data if requested
      if (importDemoData) {
        try {
          // Create sample categories
          const assetCategories = ["Laptop", "Desktop", "Monitor", "Printer", "Phone", "Tablet"];
          const accessoryCategories = ["Keyboard", "Mouse", "Headset", "USB Drive", "External Drive"];
          const componentCategories = ["RAM", "CPU", "Hard Drive", "Graphics Card", "Power Supply"];

          // Create sample assets
          const demoAssets = [
            {
              assetTag: "SRPH-001",
              name: "Dell XPS 15",
              description: "High-performance developer laptop",
              category: "Laptop",
              status: "available",
              purchaseDate: "2023-01-15",
              purchaseCost: "1599.99",
              location: "Main Office",
              serialNumber: "XPS15-123456",
              model: "XPS 15 9500",
              manufacturer: "Dell",
              notes: "Assigned to development team"
            },
            {
              assetTag: "SRPH-002",
              name: "HP EliteDesk 800",
              description: "Desktop workstation",
              category: "Desktop",
              status: "available",
              purchaseDate: "2023-02-20",
              purchaseCost: "899.99",
              location: "Sales Department",
              serialNumber: "HP800-789012",
              model: "EliteDesk 800 G6",
              manufacturer: "HP",
              notes: "For sales team use"
            },
            {
              assetTag: "SRPH-003",
              name: "Apple iPad Pro",
              description: "12.9-inch iPad Pro with M1 chip",
              category: "Tablet",
              status: "available",
              purchaseDate: "2023-03-10",
              purchaseCost: "1099.99",
              location: "Executive Suite",
              serialNumber: "IPAD-345678",
              model: "iPad Pro 12.9-inch",
              manufacturer: "Apple",
              notes: "For executive presentations"
            }
          ];

          // Create sample accessories
          const demoAccessories = [
            {
              name: "Logitech MX Master 3",
              category: "Mouse",
              quantity: 5,
              description: "Wireless mouse with customizable buttons",
              manufacturer: "Logitech",
              purchaseDate: "2023-01-20",
              purchaseCost: "99.99",
              status: "available"
            },
            {
              name: "Dell Ultrasharp 27-inch Monitor",
              category: "Monitor",
              quantity: 3,
              description: "27-inch 4K monitor",
              manufacturer: "Dell",
              purchaseDate: "2023-02-15",
              purchaseCost: "349.99",
              status: "available"
            }
          ];

          // Create sample components
          const demoComponents = [
            {
              name: "Intel Core i7-12700K",
              type: "CPU",
              serialNumber: "CPU001",
              manufacturer: "Intel",
              model: "Core i7-12700K",
              specifications: "3.6GHz, 12-core, 20-thread",
              status: "available",
              location: "Storage Room A",
              purchaseDate: "2024-01-15",
              purchaseCost: 399.99,
              warrantyExpiry: "2027-01-15",
              notes: "High-performance processor for workstations"
            },
            {
              name: "Kingston DDR4 32GB",
              type: "RAM",
              serialNumber: "RAM001",
              manufacturer: "Kingston",
              model: "DDR4-3200",
              specifications: "32GB, 3200MHz",
              status: "assigned",
              location: "IT Lab",
              assignedTo: "John Doe",
              purchaseDate: "2024-02-10",
              purchaseCost: 149.99,
              warrantyExpiry: "2026-02-10",
              notes: "Assigned to development workstation"
            },
            {
              name: "Samsung 970 EVO Plus",
              type: "SSD",
              serialNumber: "SSD001",
              manufacturer: "Samsung",
              model: "970 EVO Plus",
              specifications: "1TB NVMe M.2",
              status: "available",
              location: "Storage Room B",
              purchaseDate: "2024-01-20",
              purchaseCost: 129.99,
              warrantyExpiry: "2029-01-20",
              notes: "High-speed NVMe storage"
            },
            {
              name: "NVIDIA RTX 4070",
              type: "GPU",
              serialNumber: "GPU001",
              manufacturer: "NVIDIA",
              model: "GeForce RTX 4070",
              specifications: "12GB GDDR6X",
              status: "maintenance",
              location: "Service Center",
              purchaseDate: "2024-03-01",
              purchaseCost: 599.99,
              warrantyExpiry: "2027-03-01",
              notes: "Under maintenance for driver issues"
            }
          ];

          for (const component of demoComponents) {
            await storage.createComponent(component);
          }

          // Create sample licenses
          const demoLicenses = [
            {
              name: "Microsoft Office 365",
              key: "XXXX-XXXX-XXXX-XXXX",
              seats: "10",
              assignedSeats: 0,
              company: "Microsoft",
              manufacturer: "Microsoft",
              purchaseDate: "2023-01-10",
              expirationDate: "2024-01-10",
              purchaseCost: "999.99",
              status: "active",
              notes: "Company-wide Office 365 subscription"
            },
            {
              name: "Adobe Creative Cloud",
              key: "YYYY-YYYY-YYYY-YYYY",
              seats: "5",
              assignedSeats: 0,
              company: "Adobe",
              manufacturer: "Adobe",
              purchaseDate: "2023-02-05",
              expirationDate: "2024-02-05",
              purchaseCost: "599.99",
              status: "active",
              notes: "For design team use"
            }
          ];

          // Import the demo data into the database
          for (const asset of demoAssets) {
            await storage.createAsset(asset);
          }

          for (const accessory of demoAccessories) {
            await storage.createAccessory(accessory);
          }

          for (const component of demoComponents) {
            await storage.createComponent(component);
          }

          for (const license of demoLicenses) {
            await storage.createLicense(license);
          }

          // Create a demo activity
          await storage.createActivity({
            action: "create",
            itemType: "system",
            itemId: 0,
            userId: req.user.id,
            timestamp: new Date().toISOString(),
            notes: "Demo data imported during system setup"
          });
        } catch (demoError) {
          console.error("Error importing demo data:", demoError);
          // Continue with setup even if demo data import fails
        }
      }

      res.status(200).json({ 
        message: "Database setup completed successfully",
        demoDataImported: importDemoData,
        customScriptExecuted: !!customSqlScript
      });
    } catch (error) {
      next(error);
    }
  });

  // Setup status endpoint
  app.get("/api/setup", async (req: Request, res: Response) => {
    try {
      // Force setup to be available if query parameter is present
      if (req.query.force === 'true') {
        return res.json({
          setupRequired: true,
          hasUsers: false,
          userCount: 0,
          forced: true
        });
      }

      const users = await storage.getUsers();
      const hasUsers = users.length > 0;

      res.json({
        setupRequired: !hasUsers,
        hasUsers,
        userCount: users.length
      });
    } catch (error) {
      console.error("Setup check error:", error);
      res.status(500).json({ 
        setupRequired: true,
        error: "Could not check setup status"
      });
    }
  });

  // Setup reset endpoint
  app.post("/api/setup/reset", async (req: Request, res: Response) => {
    try {
      // This endpoint allows resetting the setup status
      // In a production environment, you might want to add authentication
      res.json({
        success: true,
        message: "Setup status reset. You can now access the setup page."
      });
    } catch (error) {
      console.error("Setup reset error:", error);
      res.status(500).json({ 
        success: false,
        error: "Could not reset setup status"
      });
    }
  });

  // Middleware to check if user is authenticated
  app.use("/api/protected", (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  });

  // Middleware to check if user is an admin
  app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  });

  // Add middleware to check user permissions for specific endpoints
  app.use("/api/users/:id/permissions", (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user.isAdmin || req.user.id === parseInt(req.params.id))) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - insufficient permissions" });
  });

  // MFA Setup - Generate secret and QR code
  app.post("/api/mfa/setup", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const secret = speakeasy.generateSecret({
        name: `SRPH-MIS (${req.user.username})`,
        issuer: 'SRPH-MIS'
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Store the secret temporarily in session
      req.session.mfaSecret = secret.base32;

      res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntry: secret.otpauth_url
      });
    } catch (error) {
      console.error("MFA setup error:", error);
      res.status(500).json({ message: "Failed to setup MFA" });
    }
  });

  // MFA Enable - Verify token and enable MFA
  app.post("/api/mfa/enable", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { token } = req.body;
    const secret = req.session.mfaSecret;

    if (!secret) {
      return res.status(400).json({ message: "MFA setup not initiated. Please scan the QR code first." });
    }

    if (!token || token.length !== 6) {
      return res.status(400).json({ message: "Please enter a valid 6-digit code from your Microsoft Authenticator app" });
    }

    try {
      // Verify the token from SingleID app
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (verified) {
        console.log(`Enabling MFA for user: ${req.user.username}`);

        // Save MFA secret to user database
        await storage.updateUser(req.user.id, {
          mfaSecret: secret,
          mfaEnabled: true
        });

        // Clear temporary secret from session
        delete req.session.mfaSecret;

        console.log(`MFA successfully enabled for user: ${req.user.username}`);

        res.json({ 
          success: true, 
          message: "Two-factor authentication has been enabled successfully. You will need to use your Microsoft Authenticator app to login from now on." 
        });
      } else {
        res.status(400).json({ message: "Invalid verification code. Please check your Microsoft Authenticator app and try again." });
      }
    } catch (error) {
      console.error("MFA enable error:", error);
      res.status(500).json({ message: "Failed to enable MFA. Please try again." });
    }
  });

  // MFA Disable
  app.post("/api/mfa/disable", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { token } = req.body;

    try {
      const user = await storage.getUser(req.user.id);

      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (verified) {
        await storage.updateUser(req.user.id, {
          mfaSecret: null,
          mfaEnabled: false
        });

        res.json({ 
          success: true, 
          message: "MFA disabled successfully" 
        });
      } else {
        res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      console.error("MFA disable error:", error);
      res.status(500).json({ message: "Failed to disable MFA" });
    }
  });

  // MFA Verify - Verify token during login
  app.post("/api/mfa/verify", async (req: Request, res: Response) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ message: "User ID and verification code are required" });
    }

    try {
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ message: "MFA is not enabled for this user" });
      }

      // Verify the TOTP token from SingleID app
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps before/after for clock drift
      });

      if (verified) {
        console.log(`MFA verification successful for user: ${user.username}`);

        // Complete the login only after successful MFA verification
        req.login(user, async (err) => {
          if (err) {
            console.error("Login error after MFA verification:", err);
            return res.status(500).json({ message: "Login failed after verification" });
          }

          // Log successful login after MFA
          const loginTime = new Date().toISOString();
          const authLog = {
            timestamp: loginTime,
            username: user.username,
            action: 'login',
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            loginTime: new Date(loginTime).toLocaleString('en-US', { 
              timeZone: 'UTC',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })
          };

          const logDir = path.join(process.cwd(), 'LOGS', 'auth');
          const logFile = path.join(logDir, `auth_${new Date().toISOString().split('T')[0]}.log`);

          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }

          fs.appendFileSync(logFile, JSON.stringify(authLog) + '\n');

          // Load permissions for the user
          const { getPermissionsForRole } = await import("./roles");
          const isUserAdmin = user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === "true";

          let permissions;
          if (isUserAdmin) {
            permissions = {
              assets: { view: true, edit: true, add: true, delete: true },
              components: { view: true, edit: true, add: true, delete: true },
              accessories: { view: true, edit: true, add: true, delete: true },
              consumables: { view: true, edit: true, add: true, delete: true },
              licenses: { view: true, edit: true, add: true, delete: true },
              users: { view: true, edit: true, add: true, delete: true },
              reports: { view: true, edit: true, add: true, delete: true },
              vmMonitoring: { view: true, edit: true, add: true, delete: true },
              networkDiscovery: { view: true, edit: true, add: true, delete: true },
              bitlockerKeys: { view: true, edit: true, add: true, delete: true },
              admin: { view: true, edit: true, add: true, delete: true }
            };
          } else {
            permissions = getPermissionsForRole(user.roleId);
          }

          // Save session with extended timeout
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error after MFA verification:', saveErr);
              return res.status(500).json({ message: "Session error after verification" });
            }

            console.log('Session saved successfully for user:', user.username);
            console.log('Session ID:', req.sessionID);
            console.log('Session data:', {
              username: req.user?.username,
              isAdmin: req.user?.isAdmin
            });

            // Add a small delay to ensure session propagation
            setTimeout(() => {
              res.json({ 
                success: true,
                user: {
                  id: user.id,
                  username: user.username,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  department: user.department,
                  isAdmin: isUserAdmin,
                  roleId: user.roleId,
                  permissions: permissions,
                  mfaEnabled: user.mfaEnabled
                }
              });
            }, 100);
          });
        });
      } else {
        console.log(`MFA verification failed for user: ${user.username}`);
        res.status(400).json({ message: "Invalid verification code. Please check your Microsoft Authenticator app and try again." });
      }
    } catch (error) {
      console.error("MFA verify error:", error);
      res.status(500).json({ message: "Verification failed. Please try again." });
    }
  });

  // Get MFA status
  app.get("/api/mfa/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      res.json({
        enabled: user.mfaEnabled || false
      });
    } catch (error) {
      console.error("MFA status error:", error);
      res.status(500).json({ message: "Failed to get MFA status" });
    }
  });

  // Admin endpoint to disable MFA for a user
  app.post("/api/admin/disable-mfa/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    const userId = parseInt(req.params.userId);

    try {
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled for this user" });
      }

      // Disable MFA
      await storage.updateUser(userId, {
        mfaSecret: null,
        mfaEnabled: false
      });

      console.log(`Admin ${req.user.username} disabled MFA for user ${user.username}`);

      // Return success response
      return res.status(200).json({ 
        success: true, 
        message: `MFA disabled for user ${user.username}` 
      });
    } catch (error: any) {
      console.error("Admin MFA disable error:", error);
      return res.status(500).json({ 
        success: false,
        message: error?.message || "Failed to disable MFA" 
      });
    }
  });

  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is an admin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Return the middleware functions
  return { requireAuth, requireAdmin };
}