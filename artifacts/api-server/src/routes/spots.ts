import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, parkingSpotsTable } from "@workspace/db";
import {
  ListSpotsResponse,
  GetSpotResponse,
  CreateSpotBody,
  UpdateSpotBody,
  UpdateSpotResponse,
} from "@workspace/api-zod";
import { serializeDates, serializeMany } from "../lib/serialize";

const router: IRouter = Router();

router.get("/spots", async (req, res): Promise<void> => {
  const zoneId = req.query.zoneId ? parseInt(req.query.zoneId as string, 10) : undefined;
  const available = req.query.available === "true";

  let spots;
  if (zoneId && !isNaN(zoneId)) {
    spots = await db.select().from(parkingSpotsTable).where(eq(parkingSpotsTable.zoneId, zoneId));
  } else if (req.query.available !== undefined && available) {
    spots = await db.select().from(parkingSpotsTable).where(eq(parkingSpotsTable.status, "available"));
  } else {
    spots = await db.select().from(parkingSpotsTable);
  }

  res.json(ListSpotsResponse.parse(serializeMany(spots)));
});

router.post("/spots", async (req, res): Promise<void> => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [spot] = await db.insert(parkingSpotsTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "unknown",
    confidenceScore: 50,
    reportCount: 0,
  }).returning();
  res.status(201).json(GetSpotResponse.parse(serializeDates(spot)));
});

router.get("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [spot] = await db.select().from(parkingSpotsTable).where(eq(parkingSpotsTable.id, id));
  if (!spot) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }
  res.json(GetSpotResponse.parse(serializeDates(spot)));
});

router.patch("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [spot] = await db
    .update(parkingSpotsTable)
    .set({ ...parsed.data, lastReportedAt: new Date() })
    .where(eq(parkingSpotsTable.id, id))
    .returning();
  if (!spot) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }
  res.json(UpdateSpotResponse.parse(serializeDates(spot)));
});

export default router;
