import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { getDbStats, incResponses503 } from "../lib/dbRetry.js";

const router: IRouter = Router();

/**
 * GET /api/healthz
 * Lightweight liveness probe — no DB check. Always returns 200 while the
 * process is running. Used by the runtime to detect process crashes.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * GET /api/health
 * Readiness probe — checks whether the database is reachable.
 * Returns 200 { status:"ok", db:"reachable", stats:{…} } when healthy.
 * Returns 503 { status:"degraded", db:"unreachable", stats:{…} } when the DB
 * is down, so a load balancer can stop routing traffic to this instance.
 *
 * stats.transientErrors — transient DB errors detected since process start
 * stats.retries         — retry attempts fired since process start
 * stats.responses503    — 503 responses returned since process start
 */
router.get("/health", async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
    res.json({ status: "ok", db: "reachable", stats: getDbStats() });
  } catch {
    incResponses503();
    res.status(503).json({ status: "degraded", db: "unreachable", stats: getDbStats() });
  }
});

export default router;
