
import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom Pages schema
export const customPages = pgTable("custom_pages", {
  id: serial("id").primaryKey(),
  pageName: text("page_name").notNull().unique(),
  pageSlug: text("page_slug").notNull().unique(),
  tableName: text("table_name").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("FileText"),
  isActive: boolean("is_active").default(true),
  columns: text("columns").notNull(), // Store as TEXT to avoid JSON parsing issues
  filters: text("filters").default('[]'),
  sortConfig: text("sort_config").default('{"field":"id","direction":"asc"}'),
  paginationConfig: text("pagination_config").default('{"pageSize":10,"enabled":true}'),
  importExportEnabled: boolean("import_export_enabled").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PageColumn = {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "email" | "url" | "json";
  label: string;
  required: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  defaultValue?: string;
};

export type PageFilter = {
  field: string;
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "greaterThan" | "lessThan";
  value: string;
};

export type SortConfig = {
  field: string;
  direction: "asc" | "desc";
};

export type PaginationConfig = {
  pageSize: number;
  enabled: boolean;
};

export const insertCustomPageSchema = createInsertSchema(customPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CustomPage = typeof customPages.$inferSelect;
export type InsertCustomPage = z.infer<typeof insertCustomPageSchema>;
