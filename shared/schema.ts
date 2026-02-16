import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
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

// Death Counter Schema
export const bosses = pgTable("bosses", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  isBeaten: boolean("is_beaten").notNull().default(false),
  deathCount: integer("death_count").notNull().default(0),
  finalDeathCount: integer("final_death_count"),
});

export const insertBossSchema = createInsertSchema(bosses).omit({
  id: true,
});

export type Boss = typeof bosses.$inferSelect;
export type InsertBoss = z.infer<typeof insertBossSchema>;
