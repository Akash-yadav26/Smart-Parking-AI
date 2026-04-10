import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, parkingZonesTable, parkingSpotsTable, parkingReportsTable, usersTable } from "@workspace/db";
import {
  GetHeatmapResponse,
  GetAnalyticsSummaryResponse,
  GetPeakHoursResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/heatmap", async (req, res): Promise<void> => {
  const timeOfDay = (req.query.timeOfDay as string) || "morning";
  const dayOfWeek = (req.query.dayOfWeek as string) || new Date().toLocaleDateString("en-US", { weekday: "long" });

  const zones = await db.select().from(parkingZonesTable);

  const hourMap: Record<string, number> = { morning: 9, afternoon: 14, evening: 18, night: 21 };
  const hour = hourMap[timeOfDay] ?? 12;

  const heatmap = zones.map(zone => {
    const isWeekend = ["Saturday", "Sunday"].includes(dayOfWeek);
    let occupancyRate: number;

    if (zone.zoneType === "office") {
      if (!isWeekend && hour >= 9 && hour <= 17) occupancyRate = 85;
      else occupancyRate = 25;
    } else if (zone.zoneType === "mall") {
      if (hour >= 11 && hour <= 20) occupancyRate = 75;
      else occupancyRate = 20;
    } else if (zone.zoneType === "street") {
      if (hour >= 9 && hour <= 18) occupancyRate = 65;
      else occupancyRate = 40;
    } else if (zone.zoneType === "residential") {
      if (!isWeekend && hour >= 8 && hour <= 18) occupancyRate = 25;
      else occupancyRate = 70;
    } else {
      occupancyRate = 55;
    }

    const noise = Math.abs(Math.sin(zone.id * 13 + hour)) * 15;
    occupancyRate = Math.max(5, Math.min(95, Math.round(occupancyRate + noise - 7)));
    const demandLevel = occupancyRate > 65 ? "high" : occupancyRate > 35 ? "medium" : "low";

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      lat: zone.lat,
      lng: zone.lng,
      demandLevel,
      occupancyRate,
      timeOfDay,
      dayOfWeek,
    };
  });

  res.json(GetHeatmapResponse.parse(heatmap));
});

router.get("/analytics/summary", async (req, res): Promise<void> => {
  const zones = await db.select().from(parkingZonesTable);
  const users = await db.select().from(usersTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reportsToday = await db.select().from(parkingReportsTable)
    .where(sql`${parkingReportsTable.createdAt} >= ${today}`);

  const totalSpots = zones.reduce((s, z) => s + z.totalSpots, 0);
  const totalAvailableSpots = zones.reduce((s, z) => s + z.availableSpots, 0);
  const avgConfidence = zones.length > 0 ? zones.reduce((s, z) => s + z.confidenceScore, 0) / zones.length : 0;
  const highDemand = zones.filter(z => z.demandLevel === "high").length;
  const lowDemand = zones.filter(z => z.demandLevel === "low").length;

  res.json(GetAnalyticsSummaryResponse.parse({
    totalZones: zones.length,
    totalSpots,
    totalAvailableSpots,
    totalReportsToday: reportsToday.length,
    totalActiveUsers: users.length,
    averageConfidenceScore: Math.round(avgConfidence),
    highDemandZones: highDemand,
    lowDemandZones: lowDemand,
  }));
});

router.get("/analytics/peak-hours", async (req, res): Promise<void> => {
  const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string, 10) : undefined;

  let zone;
  if (zoneId && !isNaN(zoneId)) {
    const zones = await db.select().from(parkingZonesTable).where(eq(parkingZonesTable.id, zoneId));
    zone = zones[0];
  } else {
    const zones = await db.select().from(parkingZonesTable).limit(1);
    zone = zones[0];
  }

  if (!zone) {
    res.json(GetPeakHoursResponse.parse([]));
    return;
  }

  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const peakHours = hours.map(h => {
    let occupancyRate: number;
    const zoneType = zone.zoneType;

    if (zoneType === "office") {
      if (h >= 9 && h <= 11) occupancyRate = 90;
      else if (h >= 12 && h <= 13) occupancyRate = 65;
      else if (h >= 17 && h <= 19) occupancyRate = 85;
      else if (h >= 8 && h <= 18) occupancyRate = 55;
      else occupancyRate = 15;
    } else if (zoneType === "mall") {
      if (h >= 11 && h <= 14) occupancyRate = 80;
      else if (h >= 15 && h <= 20) occupancyRate = 85;
      else if (h >= 21 && h <= 22) occupancyRate = 55;
      else occupancyRate = 15;
    } else {
      if (h >= 9 && h <= 18) occupancyRate = 60;
      else if (h >= 19 && h <= 22) occupancyRate = 45;
      else occupancyRate = 20;
    }

    const noise = Math.abs(Math.sin(zone.id * 5 + h * 2)) * 10;
    occupancyRate = Math.max(5, Math.min(95, Math.round(occupancyRate + noise - 5)));
    const demandLevel = occupancyRate > 65 ? "high" : occupancyRate > 35 ? "medium" : "low";
    const label = h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;

    return { hour: h, label, occupancyRate, demandLevel, zoneId: zone.id };
  });

  res.json(GetPeakHoursResponse.parse(peakHours));
});

export default router;
