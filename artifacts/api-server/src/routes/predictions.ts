import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, parkingZonesTable } from "@workspace/db";
import {
  ListPredictionsResponse,
  GetBestArrivalTimeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getPredictionForZone(zone: { id: number; name: string; zoneType: string; totalSpots: number }, hour: number, dayOfWeek: string): number {
  const isWeekend = ["Saturday", "Sunday"].includes(dayOfWeek);
  let base = 70;

  if (zone.zoneType === "office") {
    if (!isWeekend && hour >= 9 && hour <= 11) base = 15;
    else if (!isWeekend && hour >= 12 && hour <= 13) base = 30;
    else if (!isWeekend && hour >= 17 && hour <= 19) base = 20;
    else if (!isWeekend && hour >= 8 && hour <= 18) base = 40;
    else base = 80;
  } else if (zone.zoneType === "mall") {
    if (hour >= 11 && hour <= 14) base = 30;
    else if (hour >= 15 && hour <= 20) base = 25;
    else if (hour >= 21 && hour <= 23) base = 75;
    else base = 85;
  } else if (zone.zoneType === "street") {
    if (!isWeekend && hour >= 9 && hour <= 18) base = 35;
    else if (hour >= 19 && hour <= 22) base = 45;
    else base = 75;
  } else if (zone.zoneType === "residential") {
    if (!isWeekend && hour >= 8 && hour <= 18) base = 80;
    else base = 30;
  } else {
    if (hour >= 10 && hour <= 20) base = 45;
    else base = 75;
  }

  const noise = (Math.sin(zone.id * 7 + hour * 3) * 10);
  return Math.max(5, Math.min(98, Math.round(base + noise)));
}

router.get("/predictions", async (req, res): Promise<void> => {
  const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string, 10) : undefined;
  const dayOfWeek = (req.query.dayOfWeek as string) || new Date().toLocaleDateString("en-US", { weekday: "long" });

  let zones;
  if (zoneId && !isNaN(zoneId)) {
    zones = await db.select().from(parkingZonesTable).where(eq(parkingZonesTable.id, zoneId));
  } else {
    zones = await db.select().from(parkingZonesTable);
  }

  const predictions = [];
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  for (const zone of zones) {
    for (const hour of hours) {
      const prob = getPredictionForZone(zone, hour, dayOfWeek);
      const confidence = prob > 60 ? "high" : prob > 35 ? "medium" : "low";
      const label = hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
      predictions.push({
        zoneId: zone.id,
        zoneName: zone.name,
        timeSlot: label,
        availabilityProbability: prob,
        predictedAvailableSpots: Math.round((prob / 100) * zone.totalSpots),
        confidence,
        dayOfWeek,
      });
    }
  }

  res.json(ListPredictionsResponse.parse(predictions));
});

router.get("/predictions/best-time", async (req, res): Promise<void> => {
  const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string, 10) : undefined;
  if (!zoneId || isNaN(zoneId)) {
    res.status(400).json({ error: "zoneId is required" });
    return;
  }

  const dayOfWeek = (req.query.date as string) || new Date().toLocaleDateString("en-US", { weekday: "long" });

  const [zone] = await db.select().from(parkingZonesTable).where(eq(parkingZonesTable.id, zoneId));
  if (!zone) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }

  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const timeProbabilities = hours.map(h => ({
    hour: h,
    prob: getPredictionForZone(zone, h, dayOfWeek),
    label: h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`,
  }));

  const sorted = [...timeProbabilities].sort((a, b) => b.prob - a.prob);
  const best = sorted[0];
  const alternatives = sorted.slice(1, 4).map(t => ({ time: t.label, probability: t.prob }));

  const tips: Record<string, string> = {
    office: "Office zones fill up fast between 9–11 AM. Early morning or post-lunch arrivals are best.",
    mall: "Malls peak during weekend afternoons. Weekday mornings or late evenings are ideal.",
    street: "Street parking is most available during off-peak hours — before 9 AM or after 8 PM.",
    residential: "Residential zones are emptiest on weekday mornings when residents are at work.",
    mixed: "Mixed zones have moderate demand throughout the day. Avoid peak lunch hours.",
  };

  res.json(GetBestArrivalTimeResponse.parse({
    zoneId: zone.id,
    bestTime: best.label,
    probabilityAtBestTime: best.prob,
    alternativeTimes: alternatives,
    tip: tips[zone.zoneType] ?? "Check back for real-time updates as conditions change.",
  }));
});

export default router;
