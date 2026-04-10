import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  accuracyRate: real("accuracy_rate").notNull().default(100),
  trustScore: real("trust_score").notNull().default(50),
  rank: text("rank").notNull().default("newcomer"),
  rewardsEarned: real("rewards_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
