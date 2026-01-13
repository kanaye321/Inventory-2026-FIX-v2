
import type { Express, Request, Response } from "express";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { storage } from "./storage";
import { decryptFields, batchDecryptFields, PII_FIELDS, encryptFields } from "./encryption";

export function registerMonitorInventoryRoutes(app: Express, requireAuth: any) {
  // Get all monitors
  app.get('/api/monitor-inventory', requireAuth, async (req: Request, res: Response) => {
    if (!db) {
      return res.status(503).json({
        message: 'Database connection unavailable'
      });
    }

    try {
      const monitors = await db.select().from(schema.monitorInventory);
      // Decrypt PII fields before sending to client
      const decryptedMonitors = batchDecryptFields(monitors, PII_FIELDS.monitor);
      res.json(decryptedMonitors);
    } catch (error) {
      console.error('Error fetching monitors:', error);
      res.status(500).json({
        message: 'Failed to fetch monitors'
      });
    }
  });

  // Get monitor by ID
  app.get("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      const [monitor] = await db.select()
        .from(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      res.json(monitor);
    } catch (error) {
      console.error("Error fetching monitor:", error);
      res.status(500).json({ message: "Failed to fetch monitor" });
    }
  });

  // Create monitor
  app.post("/api/monitor-inventory", requireAuth, async (req: Request, res: Response) => {
    try {
      const monitorData = req.body;
      console.log('Creating monitor with data:', monitorData);

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields - only seatNumber is required
      if (!monitorData.seatNumber || monitorData.seatNumber.trim() === '') {
        return res.status(400).json({
          message: "Seat number is required"
        });
      }

      const newMonitor = {
        seatNumber: monitorData.seatNumber.trim(),
        knoxId: monitorData.knoxId?.trim() || null,
        assetNumber: monitorData.assetNumber?.trim() || null,
        serialNumber: monitorData.serialNumber?.trim() || null,
        model: monitorData.model?.trim() || null,
        remarks: monitorData.remarks?.trim() || null,
        department: monitorData.department?.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const [monitor] = await db.insert(schema.monitorInventory)
        .values(newMonitor)
        .returning();

      // Log activity
      await storage.createActivity({
        action: "create",
        itemType: "monitor",
        itemId: monitor.id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Monitor for seat ${monitor.seatNumber} created`,
      });

      console.log('Monitor created successfully:', monitor);
      res.status(201).json(monitor);
    } catch (error: any) {
      console.error("Error creating monitor:", error);
      res.status(500).json({
        message: "Failed to create monitor",
        error: error.message
      });
    }
  });

  // Update monitor
  app.patch("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const monitorData = req.body;

      if (!db) {
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Validate required fields
      if (monitorData.seatNumber && monitorData.seatNumber.trim() === '') {
        return res.status(400).json({
          message: "Seat number cannot be empty"
        });
      }

      // Update data preparation
      const updateData: { [key: string]: any } = { 
        updatedAt: new Date().toISOString() 
      };

      // Add fields
      if (monitorData.seatNumber !== undefined) updateData.seatNumber = monitorData.seatNumber.trim();
      if (monitorData.knoxId !== undefined) updateData.knoxId = monitorData.knoxId?.trim() || null;
      if (monitorData.assetNumber !== undefined) updateData.assetNumber = monitorData.assetNumber?.trim() || null;
      if (monitorData.serialNumber !== undefined) updateData.serialNumber = monitorData.serialNumber?.trim() || null;
      if (monitorData.model !== undefined) updateData.model = monitorData.model?.trim() || null;
      if (monitorData.remarks !== undefined) updateData.remarks = monitorData.remarks?.trim() || null;
      if (monitorData.department !== undefined) updateData.department = monitorData.department?.trim() || null;

      // Encrypt PII fields before saving
      const encryptedUpdateData = encryptFields(updateData, PII_FIELDS.monitor);

      const [monitor] = await db.update(schema.monitorInventory)
        .set(encryptedUpdateData)
        .where(eq(schema.monitorInventory.id, id))
        .returning();

      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      // Log activity
      await storage.createActivity({
        action: "update",
        itemType: "monitor",
        itemId: id,
        userId: req.user?.id || 1,
        timestamp: new Date().toISOString(),
        notes: `Monitor for seat ${monitor.seatNumber} updated`,
      });

      res.json(monitor);
    } catch (error: any) {
      console.error("Error updating monitor:", error);
      res.status(500).json({
        message: "Failed to update monitor",
        error: error.message
      });
    }
  });

  // Delete monitor
  app.delete("/api/monitor-inventory/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE request received for monitor ID: ${id}`);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid monitor ID" });
      }

      if (!db) {
        console.error("Database not available for deletion");
        return res.status(503).json({
          message: "Database not available"
        });
      }

      // Get monitor info before deletion
      const [monitor] = await db.select()
        .from(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      if (!monitor) {
        console.log(`Monitor with ID ${id} not found`);
        return res.status(404).json({ message: "Monitor not found" });
      }

      console.log(`Deleting monitor: ${JSON.stringify(monitor)}`);

      // Perform the actual deletion from PostgreSQL
      const deleteResult = await db.delete(schema.monitorInventory)
        .where(eq(schema.monitorInventory.id, id));

      console.log(`Delete result:`, deleteResult);

      // Log activity
      try {
        await storage.createActivity({
          action: "delete",
          itemType: "monitor",
          itemId: id,
          userId: req.user?.id || 1,
          timestamp: new Date().toISOString(),
          notes: `Monitor for seat ${monitor.seatNumber} deleted`,
        });
      } catch (activityError) {
        console.warn("Failed to log delete activity:", activityError);
      }

      console.log(`Monitor with ID ${id} successfully deleted from PostgreSQL`);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting monitor from PostgreSQL:", error);
      res.status(500).json({
        message: "Failed to delete monitor from database",
        error: error.message
      });
    }
  });

  // Import monitors from CSV
  app.post("/api/monitor-inventory/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { monitors } = req.body;

      if (!Array.isArray(monitors) || monitors.length === 0) {
        return res.status(400).json({ message: "No monitor data provided" });
      }

      const results = {
        total: monitors.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < monitors.length; i++) {
        try {
          const monitor = monitors[i];

          // Clean the monitor data - convert empty strings to null
          const cleanMonitor: any = {};
          Object.keys(monitor).forEach(key => {
            const value = monitor[key];
            cleanMonitor[key] = (value === '' || value === null || value === undefined) ? null : value;
          });

          // Insert new monitor only
          await db.insert(schema.monitorInventory).values(cleanMonitor);
          results.successful++;
        } catch (error: any) {
          results.failed++;
          const errorMsg = error?.message || String(error);
          results.errors.push(`Row ${i + 1}: ${errorMsg}`);
          console.error(`Monitor import error on row ${i + 1}:`, error);
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Monitor inventory import error:", error);
      res.status(500).json({ message: error?.message || "Import failed" });
    }
  });
}
