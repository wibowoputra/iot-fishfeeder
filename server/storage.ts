import { db } from "./db";
import {
  schedules, feedLogs,
  type Schedule, type InsertSchedule,
  type FeedLog, type InsertFeedLog
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Schedules
  getSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Logs
  getFeedLogs(): Promise<FeedLog[]>;
  createFeedLog(log: InsertFeedLog): Promise<FeedLog>;
}

export class DatabaseStorage implements IStorage {
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.time);
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(insertSchedule)
      .returning();
    return schedule;
  }

  async updateSchedule(id: number, update: Partial<InsertSchedule>): Promise<Schedule> {
    const [schedule] = await db
      .update(schedules)
      .set(update)
      .where(eq(schedules.id, id))
      .returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getFeedLogs(): Promise<FeedLog[]> {
    return await db.select().from(feedLogs).orderBy(desc(feedLogs.triggeredAt)).limit(50);
  }

  async createFeedLog(insertLog: InsertFeedLog): Promise<FeedLog> {
    const [log] = await db
      .insert(feedLogs)
      .values(insertLog)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
