/**
 * Integration test: bad DATABASE_URL causes startup to exit with code 1.
 *
 * This test spawns the real server entry-point (src/index.ts) as a child
 * process, deliberately supplying an unreachable DATABASE_URL.  It verifies
 * that the process:
 *   1. exits with code 1, and
 *   2. emits a log message that names DATABASE_URL as the likely culprit.
 *
 * NODE_ENV is intentionally set to "development" for the child process so
 * that the startup DB connectivity check is NOT skipped (the check is
 * bypassed only when NODE_ENV === "test").
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Resolve paths relative to this file so the test works regardless of cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiServerRoot = path.resolve(__dirname, "../..");
const entryPoint = path.resolve(apiServerRoot, "src/index.ts");
const tsxBin = path.resolve(apiServerRoot, "node_modules/.bin/tsx");

/**
 * Spawns `tsx src/index.ts` with a deliberately broken DATABASE_URL and
 * collects all stdout + stderr output.  Returns the exit code and combined
 * output once the process terminates.
 */
function spawnWithBadDbUrl(): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(tsxBin, [entryPoint], {
      env: {
        ...process.env,
        // Port is required by index.ts; any unused port is fine.
        PORT: "19999",
        // An unreachable host (port 1 is almost universally refused).
        DATABASE_URL: "postgresql://bad:bad@127.0.0.1:1/nonexistent",
        // Must NOT be "test" — the connectivity check is skipped in test mode.
        NODE_ENV: "development",
        // Disable pino-pretty so output is plain JSON, easier to search.
        FORCE_COLOR: "0",
      },
      // Capture both streams; pino writes to stdout by default.
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => chunks.push(chunk));

    child.on("close", (code) => {
      resolve({ code, output: Buffer.concat(chunks).toString("utf8") });
    });
  });
}

describe("startup with bad DATABASE_URL", () => {
  it(
    "exits with code 1 and logs a message naming DATABASE_URL",
    async () => {
      const { code, output } = await spawnWithBadDbUrl();

      // The process must bail out with a non-zero exit code.
      expect(code).toBe(1);

      // The error log must point the operator at DATABASE_URL so they know
      // where to look.  The exact message from index.ts is:
      //   "Database connectivity check failed — verify that DATABASE_URL is
      //    correct and the database is reachable"
      expect(output).toMatch(/DATABASE_URL/);
    },
    // Allow up to 20 s for the TCP connection attempt to be refused and the
    // process to exit; on a loaded machine the OS may queue the RST briefly.
    20_000,
  );
});
