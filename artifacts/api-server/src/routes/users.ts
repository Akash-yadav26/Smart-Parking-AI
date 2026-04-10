import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUserResponse,
  CreateUserBody,
  GetLeaderboardResponse,
} from "@workspace/api-zod";
import { serializeDates, serializeMany } from "../lib/serialize";

const router: IRouter = Router();

router.get("/users/leaderboard", async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const users = await db.select().from(usersTable)
    .orderBy(desc(usersTable.totalPoints))
    .limit(limit);

  const leaderboard = users.map((u, idx) => ({
    rank: idx + 1,
    userId: u.id,
    username: u.username,
    totalPoints: u.totalPoints,
    totalReports: u.totalReports,
    accuracyRate: u.accuracyRate,
    badge: u.rank,
  }));

  res.json(GetLeaderboardResponse.parse(leaderboard));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (existing.length > 0) {
    res.json(GetUserResponse.parse(serializeDates(existing[0])));
    return;
  }
  const [user] = await db.insert(usersTable).values({
    ...parsed.data,
    totalPoints: 0,
    totalReports: 0,
    accuracyRate: 100,
    trustScore: 50,
    rank: "newcomer",
    rewardsEarned: 0,
  }).returning();
  res.status(201).json(GetUserResponse.parse(serializeDates(user)));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse(serializeDates(user)));
});

export default router;
