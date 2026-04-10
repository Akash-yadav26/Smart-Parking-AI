import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingSpotsTable = pgTable("parking_spots", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull(),
  spotNumber: text("spot_number").notNull(),
  status: text("status").notNull().default("unknown"),
  lastReportedAt: timestamp("last_reported_at", { withTimezone: true }),
  confidenceScore: real("confidence_score").notNull().default(50),
  reportCount: integer("report_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParkingSpotSchema = createInsertSchema(parkingSpotsTable).omit({ id: true, createdAt: true });
export type InsertParkingSpot = z.infer<typeof insertParkingSpotSchema>;
export type ParkingSpot = typeof parkingSpotsTable.$inferSelect;
