import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, parkingZonesTable } from "@workspace/db";
import {
  ListZonesResponse,
  GetZoneResponse,
  CreateZoneBody,
} from "@workspace/api-zod";
import { serializeDates, serializeMany } from "../lib/serialize";

const router: IRouter = Router();

router.get("/zones", async (req, res): Promise<void> => {
  const zones = await db.select().from(parkingZonesTable).orderBy(parkingZonesTable.id);
  res.json(ListZonesResponse.parse(serializeMany(zones)));
});

router.post("/zones", async (req, res): Promise<void> => {
  const parsed = CreateZoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [zone] = await db.insert(parkingZonesTable).values({
    ...parsed.data,
    availableSpots: parsed.data.totalSpots,
    demandLevel: "low",
    confidenceScore: 75,
  }).returning();
  res.status(201).json(GetZoneResponse.parse(serializeDates(zone)));
});

router.get("/zones/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [zone] = await db.select().from(parkingZonesTable).where(eq(parkingZonesTable.id, id));
  if (!zone) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }
  res.json(GetZoneResponse.parse(serializeDates(zone)));
});

export default router;
