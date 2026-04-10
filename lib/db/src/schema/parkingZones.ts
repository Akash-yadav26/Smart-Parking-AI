import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingZonesTable = pgTable("parking_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  totalSpots: integer("total_spots").notNull(),
  availableSpots: integer("available_spots").notNull().default(0),
  demandLevel: text("demand_level").notNull().default("low"),
  zoneType: text("zone_type").notNull().default("street"),
  confidenceScore: real("confidence_score").notNull().default(75),
  pricePerHour: real("price_per_hour"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParkingZoneSchema = createInsertSchema(parkingZonesTable).omit({ id: true, createdAt: true });
export type InsertParkingZone = z.infer<typeof insertParkingZoneSchema>;
export type ParkingZone = typeof parkingZonesTable.$inferSelect;
