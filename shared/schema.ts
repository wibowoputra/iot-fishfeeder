import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  time: text("time").notNull(), // HH:mm format
  enabled: boolean("enabled").default(true).notNull(),
  days: text("days").array(), // ["Mon", "Tue", ...] - optional for now
});

export const feedLogs = pgTable("feed_logs", {
  id: serial("id").primaryKey(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  status: text("status").notNull(), // "SUCCESS", "FAILED", "PENDING"
  type: text("type").notNull(), // "SCHEDULED", "MANUAL"
  message: text("message"),
});

// Zod Schemas
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertFeedLogSchema = createInsertSchema(feedLogs).omit({ id: true, triggeredAt: true });

// Types
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type FeedLog = typeof feedLogs.$inferSelect;
export type InsertFeedLog = z.infer<typeof insertFeedLogSchema>;

// DTOs
export const updateScheduleSchema = insertScheduleSchema.partial();
