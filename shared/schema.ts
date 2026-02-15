import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const uninstallRequests = pgTable("uninstall_requests", {
  id: varchar("id").primaryKey(),
  programName: text("program_name").notNull(),
  count: integer("count").notNull().default(1),
});

export const insertUninstallRequestSchema = createInsertSchema(uninstallRequests).omit({
  id: true,
});

export type InsertUninstallRequest = z.infer<typeof insertUninstallRequestSchema>;
export type UninstallRequest = typeof uninstallRequests.$inferSelect;
