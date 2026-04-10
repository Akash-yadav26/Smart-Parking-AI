import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingReportsTable = pgTable("parking_reports", {
  id: serial("id").primaryKey(),
  spotId: integer("spot_id"),
  zoneId: integer("zone_id").notNull(),
  userId: integer("user_id"),
  reportType: text("report_type").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  pointsEarned: integer("points_earned").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParkingReportSchema = createInsertSchema(parkingReportsTable).omit({ id: true, createdAt: true });
export type InsertParkingReport = z.infer<typeof insertParkingReportSchema>;
export type ParkingReport = typeof parkingReportsTable.$inferSelect;
