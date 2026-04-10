import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, parkingReportsTable, parkingZonesTable, usersTable } from "@workspace/db";
import {
  ListReportsResponse,
  CreateReportBody,
} from "@workspace/api-zod";
import { serializeDates, serializeMany } from "../lib/serialize";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  let reports;
  if (zoneId && !isNaN(zoneId)) {
    reports = await db.select().from(parkingReportsTable)
      .where(eq(parkingReportsTable.zoneId, zoneId))
      .orderBy(parkingReportsTable.createdAt)
      .limit(limit);
  } else {
    reports = await db.select().from(parkingReportsTable)
      .orderBy(parkingReportsTable.createdAt)
      .limit(limit);
  }

  res.json(ListReportsResponse.parse(serializeMany(reports)));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const pointsEarned = 3;

  const [report] = await db.insert(parkingReportsTable).values({
    ...parsed.data,
    isVerified: false,
    pointsEarned,
  }).returning();

  if (parsed.data.zoneId) {
    const reportType = parsed.data.reportType;
    const [zone] = await db.select().from(parkingZonesTable).where(eq(parkingZonesTable.id, parsed.data.zoneId));
    if (zone) {
      let newAvailable = zone.availableSpots;
      if (reportType === "leaving" || reportType === "available") {
        newAvailable = Math.min(zone.totalSpots, zone.availableSpots + 1);
      } else if (reportType === "arriving" || reportType === "occupied") {
        newAvailable = Math.max(0, zone.availableSpots - 1);
      }
      const occupancy = 1 - (newAvailable / zone.totalSpots);
      const demandLevel = occupancy > 0.7 ? "high" : occupancy > 0.4 ? "medium" : "low";
      await db.update(parkingZonesTable).set({
        availableSpots: newAvailable,
        demandLevel,
        confidenceScore: Math.min(95, zone.confidenceScore + 2),
      }).where(eq(parkingZonesTable.id, zone.id));
    }
  }

  if (parsed.data.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
    if (user) {
      const newTotal = user.totalReports + 1;
      const newPoints = user.totalPoints + pointsEarned;
      const newRank = newTotal >= 200 ? "legend" : newTotal >= 100 ? "expert" : newTotal >= 50 ? "trusted" : newTotal >= 10 ? "contributor" : "newcomer";
      await db.update(usersTable).set({
        totalPoints: newPoints,
        totalReports: newTotal,
        rank: newRank,
        rewardsEarned: user.rewardsEarned + (pointsEarned * 0.5),
      }).where(eq(usersTable.id, user.id));
    }
  }

  res.status(201).json(serializeDates(report));
});

export default router;
