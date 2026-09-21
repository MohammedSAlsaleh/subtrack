import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const DB_CHECK_RETRIES = Number(process.env["DB_CHECK_RETRIES"] ?? 3);
const DB_CHECK_RETRY_DELAY_MS = Number(
  process.env["DB_CHECK_RETRY_DELAY_MS"] ?? 2000,
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkDatabaseConnectivity(): Promise<void> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= DB_CHECK_RETRIES; attempt++) {
    let client;
    try {
      client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      logger.info({ attempt }, "Database connectivity check passed");
      return;
    } catch (err) {
      lastErr = err;
      if (client) {
        try {
          client.release();
        } catch {
          // ignore release errors
        }
      }

      if (attempt < DB_CHECK_RETRIES) {
        logger.warn(
          { err, attempt, retryDelayMs: DB_CHECK_RETRY_DELAY_MS },
          `Database connectivity check failed (attempt ${attempt}/${DB_CHECK_RETRIES}) — retrying in ${DB_CHECK_RETRY_DELAY_MS} ms`,
        );
        await sleep(DB_CHECK_RETRY_DELAY_MS);
      }
    }
  }

  logger.error(
    { err: lastErr, attempts: DB_CHECK_RETRIES },
    "Database connectivity check failed after all attempts — verify that DATABASE_URL is correct and the database is reachable",
  );
  process.exit(1);
}

async function start() {
  // Skip DB connectivity check in test environments so unit tests are unaffected.
  if (process.env["NODE_ENV"] !== "test") {
    await checkDatabaseConnectivity();
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();
