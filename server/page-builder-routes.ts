import type { Express, Request, Response } from "express";
import { db, pool } from "./db";
import { customPages } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { storage } from "./storage"; // Assuming storage is needed for getPageBySlug

export function registerPageBuilderRoutes(app: Express, requireAuth: any, requireAdmin: any) {

  // Get all custom pages
  app.get('/api/page-builder/pages', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM custom_pages WHERE is_active = true ORDER BY created_at DESC
      `);

      // Parse TEXT fields back to JSON
      const pages = result.rows.map(page => ({
        ...page,
        columns: typeof page.columns === 'string' ? JSON.parse(page.columns) : page.columns,
        filters: typeof page.filters === 'string' ? JSON.parse(page.filters) : page.filters,
        sortConfig: typeof page.sort_config === 'string' ? JSON.parse(page.sort_config) : page.sort_config,
        paginationConfig: typeof page.pagination_config === 'string' ? JSON.parse(page.pagination_config) : page.pagination_config
      }));

      res.json(pages);
    } catch (error: any) {
      console.error('Error fetching custom pages:', error);
      res.status(500).json({ message: 'Failed to fetch custom pages' });
    }
  });

  // Create new custom page
  app.post("/api/page-builder/pages", requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Page Builder: Received page creation request:', JSON.stringify(req.body, null, 2));

      if (!db) {
        console.error('Page Builder: Database not available');
        return res.status(503).json({ message: "Database not available" });
      }

      const { pageName, pageSlug, tableName, description, icon, columns, filters, paginationConfig, importExportEnabled } = req.body;

      // Validate required fields
      if (!pageName || !pageSlug || !tableName || !columns || !Array.isArray(columns)) {
        console.error('Page Builder: Missing required fields');
        return res.status(400).json({
          message: "Missing required fields: pageName, pageSlug, tableName, and columns array are required"
        });
      }

      if (columns.length === 0) {
        console.error('Page Builder: No columns provided');
        return res.status(400).json({
          message: "At least one column is required"
        });
      }

      // Validate table name to prevent SQL injection
      const tableNameRegex = /^[a-z][a-z0-9_]*$/;
      if (!tableNameRegex.test(tableName)) {
        return res.status(400).json({
          message: "Invalid table name. Use only lowercase letters, numbers, and underscores, starting with a letter."
        });
      }

      // Validate column names
      for (const col of columns) {
        if (!col.name || !tableNameRegex.test(col.name)) {
          return res.status(400).json({
            message: `Invalid column name: ${col.name || 'undefined'}. Use only lowercase letters, numbers, and underscores, starting with a letter.`
          });
        }
      }

      // Generate table creation SQL with proper type mapping
      const columnDefinitions = columns.map((col: any) => {
        let sqlType = "TEXT";
        switch (col.type) {
          case "number":
            sqlType = "INTEGER";
            break;
          case "boolean":
            sqlType = "BOOLEAN";
            break;
          case "date":
            sqlType = "TIMESTAMP";
            break;
          case "email":
          case "url":
            sqlType = "TEXT";
            break;
          case "json":
            sqlType = "JSONB";
            break;
          default:
            sqlType = "TEXT";
        }

        const nullable = col.required ? "NOT NULL" : "NULL";

        // Handle default values safely
        let defaultVal = "";
        if (col.defaultValue && col.defaultValue.trim() !== "") {
          if (col.type === "number") {
            const numValue = parseFloat(col.defaultValue);
            if (!isNaN(numValue)) {
              defaultVal = `DEFAULT ${numValue}`;
            }
          } else if (col.type === "boolean") {
            defaultVal = `DEFAULT ${col.defaultValue === 'true' || col.defaultValue === true}`;
          } else if (col.type === "date") {
            if (col.defaultValue.toLowerCase() === 'now()') {
              defaultVal = `DEFAULT NOW()`;
            } else {
              defaultVal = `DEFAULT '${col.defaultValue.replace(/'/g, "''")}'::TIMESTAMP`;
            }
          } else {
            // Escape single quotes for text values
            defaultVal = `DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
          }
        }

        return `"${col.name}" ${sqlType} ${nullable} ${defaultVal}`.trim();
      }).join(", ");

      // Create the table with proper escaping
      const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (id SERIAL PRIMARY KEY, ${columnDefinitions}, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`;
      console.log('Page Builder: Creating table with SQL:', createTableSQL);

      try {
        await db.execute(sql.raw(createTableSQL));
        console.log('Page Builder: Table creation command executed successfully');
      } catch (tableError: any) {
        console.error('Page Builder: Error creating table:', tableError);
        throw new Error(`Failed to create table: ${tableError.message}`);
      }

      // Verify table was created
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        );
      `);

      console.log('Page Builder: Table verification result:', tableCheck.rows[0]);

      if (!tableCheck.rows[0].exists) {
        throw new Error(`Table ${tableName} was not created - verification failed`);
      }

      // Verify columns were created
      const columnsCheck = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `);

      console.log('Page Builder: Created columns:', columnsCheck.rows);

      if (columnsCheck.rows.length === 0) {
        throw new Error(`Table ${tableName} exists but has no columns`);
      }

      // Prepare page configuration object for insertion
      const pageConfig = {
        pageName,
        pageSlug,
        tableName,
        description: description || null,
        icon: icon || 'FileText',
        columns: columns,
        filters: filters || [],
        sortConfig: req.body.sortConfig || { field: "id", direction: "asc" },
        paginationConfig: paginationConfig || { pageSize: 10, enabled: true },
        importExportEnabled: importExportEnabled !== false,
        createdBy: req.user?.id || null
      };

      console.log('Page Builder: Inserting page config:', {
        pageName: pageConfig.pageName,
        pageSlug: pageConfig.pageSlug,
        tableName: pageConfig.tableName,
        description: pageConfig.description,
        icon: pageConfig.icon,
        columns: JSON.stringify(pageConfig.columns),
        filters: JSON.stringify(pageConfig.filters),
        sortConfig: JSON.stringify(pageConfig.sortConfig),
        paginationConfig: JSON.stringify(pageConfig.paginationConfig),
        importExportEnabled: pageConfig.importExportEnabled,
        createdBy: req.user?.id || 1
      });

      // Store page configuration - column names must match the actual database schema
      // Store as TEXT, not JSONB
      const columnsText = JSON.stringify(columns);
      const filtersText = JSON.stringify(filters || []);
      const sortConfigText = JSON.stringify(req.body.sortConfig || { field: "id", direction: "asc" });
      const paginationConfigText = JSON.stringify(paginationConfig || { pageSize: 10, enabled: true });

      console.log('Page Builder: Inserting page config with TEXT columns');

      const result = await db.execute(sql`
        INSERT INTO custom_pages (
          page_name, page_slug, table_name, description, icon,
          columns, filters, sort_config, pagination_config,
          import_export_enabled, is_active, created_by, created_at, updated_at
        ) VALUES (
          ${pageName}, ${pageSlug}, ${tableName},
          ${description || null}, ${icon || 'FileText'},
          ${columnsText},
          ${filtersText},
          ${sortConfigText},
          ${paginationConfigText},
          ${importExportEnabled !== false},
          true,
          ${req.user?.id || 1},
          NOW(), NOW()
        ) RETURNING *
      `);

      const newPage = result.rows[0];
      console.log('Page Builder: Page created successfully:', newPage);

      // Parse JSON fields back for response
      const responseData = {
        ...newPage,
        columns: typeof newPage.columns === 'string' ? JSON.parse(newPage.columns) : newPage.columns,
        filters: typeof newPage.filters === 'string' ? JSON.parse(newPage.filters) : newPage.filters,
        sortConfig: typeof newPage.sortConfig === 'string' ? JSON.parse(newPage.sortConfig) : newPage.sortConfig,
        paginationConfig: typeof newPage.paginationConfig === 'string' ? JSON.parse(newPage.paginationConfig) : newPage.paginationConfig
      };

      return res.status(201).json(responseData);
    } catch (error: any) {
      console.error("Page Builder: Error creating custom page:", error);
      return res.status(500).json({
        message: "Failed to create custom page",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get page data
  app.get("/api/page-builder/pages/:slug/data", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { slug } = req.params;
      const { page = 1, pageSize = 10, sortField, sortDirection, filters } = req.query;

      const pageResult = await db.execute(sql`SELECT * FROM custom_pages WHERE page_slug = ${slug}`);
      const pageConfigRaw = pageResult.rows[0];

      if (!pageConfigRaw) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Map snake_case to camelCase and parse JSON fields
      const pageConfig = {
        id: pageConfigRaw.id,
        pageName: pageConfigRaw.page_name,
        pageSlug: pageConfigRaw.page_slug,
        tableName: pageConfigRaw.table_name,
        description: pageConfigRaw.description,
        icon: pageConfigRaw.icon,
        columns: typeof pageConfigRaw.columns === 'string' ? JSON.parse(pageConfigRaw.columns) : pageConfigRaw.columns,
        filters: typeof pageConfigRaw.filters === 'string' ? JSON.parse(pageConfigRaw.filters) : pageConfigRaw.filters,
        sortConfig: typeof pageConfigRaw.sort_config === 'string' ? JSON.parse(pageConfigRaw.sort_config) : pageConfigRaw.sort_config,
        paginationConfig: typeof pageConfigRaw.pagination_config === 'string' ? JSON.parse(pageConfigRaw.pagination_config) : pageConfigRaw.pagination_config
      };

      // Build query using parameterized queries to prevent SQL injection
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      // Build WHERE clause with parameterized values
      const whereClauses: string[] = [];
      const whereValues: any[] = [];

      if (filters && typeof filters === 'string') {
        try {
          const filterObj = JSON.parse(filters);
          Object.entries(filterObj).forEach(([key, value], index) => {
            // Validate column name exists in page config
            const columnExists = pageConfig.columns.some((col: any) => col.name === key);
            if (columnExists && value && value.toString().trim() !== '') {
              whereClauses.push(`"${key}" ILIKE $${index + 1}`);
              whereValues.push(`%${value}%`);
            }
          });
        } catch (e) {
          console.error("Invalid filters JSON:", e);
        }
      }

      // Validate sort field
      const sort = sortField || pageConfig.sortConfig?.field || 'id';
      const sortColumnExists = pageConfig.columns.some((col: any) => col.name === sort) || sort === 'id';
      const validatedSort = sortColumnExists ? sort : 'id';

      const direction = (sortDirection || pageConfig.sortConfig?.direction || 'asc').toUpperCase();
      const validDirection = direction === 'DESC' ? 'DESC' : 'ASC';

      // Build and execute query
      let queryStr = `SELECT * FROM "${pageConfig.tableName}"`;
      if (whereClauses.length > 0) {
        queryStr += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      queryStr += ` ORDER BY "${validatedSort}" ${validDirection}`;
      queryStr += ` LIMIT ${pageSizeNum} OFFSET ${offset}`;

      if (!pool) {
        return res.status(503).json({ message: "Database pool not available" });
      }

      const data = await pool.query(queryStr, whereValues);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM "${pageConfig.tableName}"`;
      if (whereClauses.length > 0) {
        countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      const countResult = await pool.query(countQuery, whereValues);
      const total = Number(countResult.rows[0].count);

      res.json({
        data: data.rows,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum)
        }
      });
    } catch (error: any) {
      console.error("Error fetching page data:", error);
      res.status(500).json({ message: "Failed to fetch page data", error: error.message });
    }
  });

  // Create record in custom page
  app.post("/api/page-builder/pages/:slug/data", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { slug } = req.params;
      const pageResult = await db.execute(sql`SELECT * FROM custom_pages WHERE page_slug = ${slug}`);
      const pageConfigRaw = pageResult.rows[0];

      if (!pageConfigRaw) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Map snake_case to camelCase and parse JSON fields
      const pageConfig = {
        id: pageConfigRaw.id,
        pageName: pageConfigRaw.page_name,
        pageSlug: pageConfigRaw.page_slug,
        tableName: pageConfigRaw.table_name,
        description: pageConfigRaw.description,
        icon: pageConfigRaw.icon,
        columns: typeof pageConfigRaw.columns === 'string' ? JSON.parse(pageConfigRaw.columns) : pageConfigRaw.columns,
        filters: typeof pageConfigRaw.filters === 'string' ? JSON.parse(pageConfigRaw.filters) : pageConfigRaw.filters,
        sortConfig: typeof pageConfigRaw.sort_config === 'string' ? JSON.parse(pageConfigRaw.sort_config) : pageConfigRaw.sort_config,
        paginationConfig: typeof pageConfigRaw.pagination_config === 'string' ? JSON.parse(pageConfigRaw.pagination_config) : pageConfigRaw.pagination_config
      };

      // Validate and filter columns
      const validColumns: string[] = [];
      const values: any[] = [];

      Object.entries(req.body).forEach(([key, value], index) => {
        const columnConfig = pageConfig.columns.find((col: any) => col.name === key);
        if (columnConfig) {
          validColumns.push(`"${key}"`);
          values.push(value);
        }
      });

      if (validColumns.length === 0) {
        return res.status(400).json({ message: "No valid columns provided" });
      }

      if (!pool) {
        return res.status(503).json({ message: "Database pool not available" });
      }

      // Build INSERT query with proper parameterized placeholders
      const columnList = validColumns.join(", ");
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const insertQuery = `INSERT INTO "${pageConfig.tableName}" (${columnList}) VALUES (${placeholders}) RETURNING *`;

      // Execute using pool.query directly with values array
      const result = await pool.query(insertQuery, values);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error creating record:", error);
      res.status(500).json({ message: "Failed to create record", error: error.message });
    }
  });

  // Update record in custom page
  app.patch("/api/page-builder/pages/:slug/data/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { slug, id } = req.params;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }

      const pageResult = await db.execute(sql`SELECT * FROM custom_pages WHERE page_slug = ${slug}`);
      const pageConfigRaw = pageResult.rows[0];

      if (!pageConfigRaw) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Map snake_case to camelCase and parse JSON fields
      const pageConfig = {
        tableName: pageConfigRaw.table_name,
        columns: typeof pageConfigRaw.columns === 'string' ? JSON.parse(pageConfigRaw.columns) : pageConfigRaw.columns
      };

      // Validate and build update clauses
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(req.body).forEach(([key, value]) => {
        const columnConfig = pageConfig.columns.find((col: any) => col.name === key);
        if (columnConfig) {
          setClauses.push(`"${key}" = $${values.length + 1}`);
          values.push(value);
        }
      });

      if (setClauses.length === 0) {
        return res.status(400).json({ message: "No valid columns to update" });
      }

      // Add record ID to values after all other values
      values.push(recordId);
      const idParamNumber = values.length;

      const queryStr = `
        UPDATE "${pageConfig.tableName}"
        SET ${setClauses.join(", ")}, updated_at = NOW()
        WHERE id = $${idParamNumber}
        RETURNING *
      `;

      if (!pool) {
        return res.status(503).json({ message: "Database pool not available" });
      }

      const result = await pool.query(queryStr, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Record not found" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Error updating record:", error);
      res.status(500).json({ message: "Failed to update record", error: error.message });
    }
  });

  // Delete record from custom page
  app.delete("/api/page-builder/pages/:slug/data/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { slug, id } = req.params;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }

      const pageResult = await db.execute(sql`SELECT * FROM custom_pages WHERE page_slug = ${slug}`);
      const pageConfigRaw = pageResult.rows[0];

      if (!pageConfigRaw) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Map snake_case to camelCase and parse JSON fields
      const pageConfig = {
        tableName: pageConfigRaw.table_name,
        columns: typeof pageConfigRaw.columns === 'string' ? JSON.parse(pageConfigRaw.columns) : pageConfigRaw.columns
      };

      if (!pool) {
        return res.status(503).json({ message: "Database pool not available" });
      }

      const result = await pool.query(
        `DELETE FROM "${pageConfig.tableName}" WHERE id = $1 RETURNING id`,
        [recordId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Record not found" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting record:", error);
      res.status(500).json({ message: "Failed to delete record", error: error.message });
    }
  });

  // Update custom page
  app.patch("/api/page-builder/pages/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { id } = req.params;
      const { pageName, pageSlug, description, icon, columns, filters, sortConfig, paginationConfig, importExportEnabled } = req.body;

      const result = await db.execute(sql`SELECT * FROM custom_pages WHERE id = ${Number(id)}`);
      const existingPageRaw = result.rows[0];

      if (!existingPageRaw) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Parse TEXT fields back to JSON for existing page
      const existingPage = {
        ...existingPageRaw,
        columns: typeof existingPageRaw.columns === 'string' ? JSON.parse(existingPageRaw.columns) : existingPageRaw.columns,
        filters: typeof existingPageRaw.filters === 'string' ? JSON.parse(existingPageRaw.filters) : existingPageRaw.filters,
        sortConfig: typeof existingPageRaw.sort_config === 'string' ? JSON.parse(existingPageRaw.sort_config) : existingPageRaw.sort_config,
        paginationConfig: typeof existingPageRaw.pagination_config === 'string' ? JSON.parse(existingPageRaw.pagination_config) : existingPageRaw.pagination_config
      };

      // Validate column names
      const tableNameRegex = /^[a-z][a-z0-9_]*$/;
      for (const col of columns) {
        if (!tableNameRegex.test(col.name)) {
          return res.status(400).json({
            message: `Invalid column name: ${col.name}. Use only lowercase letters, numbers, and underscores, starting with a letter.`
          });
        }
      }

      // Get existing column names and types
      const existingColumnsMap = new Map(existingPage.columns.map((col: any) => [col.name, col]));
      const newColumnsMap = new Map(columns.map((col: any) => [col.name, col]));

      // Detect renamed columns (same type and position but different name)
      const renamedColumns: Array<{ oldName: string; newName: string }> = [];
      const existingColArray = existingPage.columns;

      columns.forEach((newCol: any, index: number) => {
        if (index < existingColArray.length) {
          const oldCol = existingColArray[index];
          if (oldCol.name !== newCol.name &&
              oldCol.type === newCol.type &&
              !existingColumnsMap.has(newCol.name)) {
            renamedColumns.push({ oldName: oldCol.name, newName: newCol.name });
          }
        }
      });

      // Rename columns in database
      for (const { oldName, newName } of renamedColumns) {
        console.log(`Renaming column ${oldName} to ${newName} in table ${existingPage.tableName}`);
        await db.execute(sql.raw(`
          ALTER TABLE "${existingPage.tableName}"
          RENAME COLUMN "${oldName}" TO "${newName}"
        `));
      }

      // Add new columns (that weren't renamed)
      const renamedNewNames = new Set(renamedColumns.map(r => r.newName));
      const existingNames = new Set(existingPage.columns.map((col: any) => col.name));

      for (const col of columns) {
        // Skip if this is a renamed column or already exists
        if (renamedNewNames.has(col.name) || existingNames.has(col.name)) {
          continue;
        }

        let sqlType = "TEXT";
        switch (col.type) {
          case "number":
            sqlType = "INTEGER";
            break;
          case "boolean":
            sqlType = "BOOLEAN";
            break;
          case "date":
            sqlType = "TIMESTAMP";
            break;
          case "email":
          case "url":
            sqlType = "TEXT";
            break;
          case "json":
            sqlType = "JSONB";
            break;
          default:
            sqlType = "TEXT";
        }

        const nullable = col.required ? "NOT NULL" : "NULL";

        let defaultVal = "";
        if (col.defaultValue && col.defaultValue.trim() !== "") {
          if (col.type === "number") {
            const numValue = parseFloat(col.defaultValue);
            if (!isNaN(numValue)) {
              defaultVal = `DEFAULT ${numValue}`;
            }
          } else if (col.type === "boolean") {
            defaultVal = `DEFAULT ${col.defaultValue === 'true' || col.defaultValue === true}`;
          } else if (col.type === "date") {
            if (col.defaultValue.toLowerCase() === 'now()') {
              defaultVal = `DEFAULT NOW()`;
            } else {
              defaultVal = `DEFAULT '${col.defaultValue.replace(/'/g, "''")}'::TIMESTAMP`;
            }
          } else {
            defaultVal = `DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
          }
        }

        console.log(`Adding new column ${col.name} to table ${existingPage.tableName}`);
        await db.execute(sql.raw(`
          ALTER TABLE "${existingPage.tableName}"
          ADD COLUMN IF NOT EXISTS "${col.name}" ${sqlType} ${nullable} ${defaultVal}
        `.trim()));
      }

      // Convert to TEXT format for storage
      const columnsText = JSON.stringify(columns);
      const filtersText = JSON.stringify(filters || []);
      const sortConfigText = JSON.stringify(sortConfig || { field: "id", direction: "asc" });
      const paginationConfigText = JSON.stringify(paginationConfig || { pageSize: 10, enabled: true });

      // Update page configuration
      const updateResult = await db.execute(sql`
        UPDATE custom_pages
        SET
          page_name = ${pageName},
          page_slug = ${pageSlug},
          description = ${description || null},
          icon = ${icon || 'FileText'},
          columns = ${columnsText},
          filters = ${filtersText},
          sort_config = ${sortConfigText},
          pagination_config = ${paginationConfigText},
          import_export_enabled = ${importExportEnabled !== false},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `);

      const updatedPageRaw = updateResult.rows[0];

      // Parse back for response
      const updatedPage = {
        ...updatedPageRaw,
        columns: typeof updatedPageRaw.columns === 'string' ? JSON.parse(updatedPageRaw.columns) : updatedPageRaw.columns,
        filters: typeof updatedPageRaw.filters === 'string' ? JSON.parse(updatedPageRaw.filters) : updatedPageRaw.filters,
        sortConfig: typeof updatedPageRaw.sort_config === 'string' ? JSON.parse(updatedPageRaw.sort_config) : updatedPageRaw.sort_config,
        paginationConfig: typeof updatedPageRaw.pagination_config === 'string' ? JSON.parse(updatedPageRaw.pagination_config) : updatedPageRaw.pagination_config
      };

      res.json(updatedPage);
    } catch (error: any) {
      console.error("Error updating custom page:", error);
      res.status(500).json({ message: "Failed to update custom page", error: error.message });
    }
  });

  // Delete custom page
  app.delete("/api/page-builder/pages/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { id } = req.params;
      const result = await db.execute(sql`SELECT * FROM custom_pages WHERE id = ${Number(id)}`);
      const pageConfig = result.rows[0];

      if (!pageConfig) {
        return res.status(404).json({ message: "Page not found" });
      }

      // Drop the table using table_name column
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${pageConfig.table_name}"`));

      // Delete page config
      await db.execute(sql`DELETE FROM custom_pages WHERE id = ${Number(id)}`);

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting custom page:", error);
      res.status(500).json({ message: "Failed to delete custom page" });
    }
  });

  // Import records
  app.post("/api/page-builder/pages/:slug/records/import", requireAuth, async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ message: "Database not available" });
      }

      const { slug } = req.params;
      const { records } = req.body;

      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ message: "Invalid records data - expected array of records" });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: "No records to import" });
      }

      // Query the database for the page config
      const pageResult = await db.execute(sql`SELECT * FROM custom_pages WHERE page_slug = ${slug}`);
      const pageConfigRaw = pageResult.rows[0];

      if (!pageConfigRaw) {
        return res.status(404).json({ message: `Page not found: ${slug}` });
      }

      // Parse the page config
      const pageConfig = {
        tableName: pageConfigRaw.table_name,
        columns: typeof pageConfigRaw.columns === 'string' ? JSON.parse(pageConfigRaw.columns) : pageConfigRaw.columns
      };

      if (!pool) {
        return res.status(503).json({ message: "Database pool not available" });
      }

      let importedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Create a map of normalized column names to actual database column names
      const columnMap = new Map<string, string>();
      pageConfig.columns.forEach((col: any) => {
        // Normalize both the config column name and potential CSV variants
        const normalized = col.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        columnMap.set(normalized, col.name);
      });

      // Insert records into the database
      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];
          const mappedColumns: string[] = [];
          const values: any[] = [];

          // Map CSV columns to database columns
          Object.keys(record).forEach(csvColumn => {
            if (csvColumn.toLowerCase() === 'id') return; // Skip id column
            
            // Normalize the CSV column name
            const normalizedCsvColumn = csvColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Find matching database column
            const dbColumn = columnMap.get(normalizedCsvColumn);
            
            if (dbColumn) {
              mappedColumns.push(dbColumn);
              values.push(record[csvColumn]);
            } else {
              console.warn(`Row ${i + 1}: CSV column "${csvColumn}" does not match any database column`);
            }
          });

          if (mappedColumns.length === 0) {
            errors.push(`Row ${i + 1}: No valid columns found that match database schema`);
            errorCount++;
            continue;
          }

          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          const queryStr = `INSERT INTO "${pageConfig.tableName}" (${mappedColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

          await pool.query(queryStr, values);
          importedCount++;
        } catch (rowError: any) {
          console.error(`Error importing row ${i + 1}:`, rowError);
          errors.push(`Row ${i + 1}: ${rowError.message}`);
          errorCount++;
        }
      }

      res.json({ 
        message: `Import complete: ${importedCount} records imported, ${errorCount} failed`,
        imported: importedCount,
        failed: errorCount,
        errors: errors.slice(0, 10) // Return first 10 errors
      });
    } catch (error: any) {
      console.error("Error importing records:", error);
      res.status(500).json({ 
        message: error.message || "Failed to import records",
        error: error.toString()
      });
    }
  });
}