/**
 * Canonical SQL injection payload list shared across all route test files.
 *
 * Adding a payload here automatically exercises it against every user-supplied
 * field in every endpoint — auth and premium alike.
 *
 * Categories covered:
 *  1. Classic tautology   – attempts to make a WHERE clause always-true so
 *                           authentication succeeds without a real password.
 *  2. UNION exfiltration  – attempts to append a SELECT that leaks table data.
 *  3. Stacked queries     – attempts to execute a second statement (e.g. DROP).
 *  4. Comment bypass      – uses -- or /* to nullify the rest of the query.
 *  5. Boolean-blind       – probes for truth/false differences in response.
 *  6. Null byte           – embeds \x00 to truncate strings in some drivers.
 *  7. Oversized input     – 10 000-character string to trigger truncation errors.
 *
 * Why Drizzle ORM prevents these:
 *   Drizzle always uses parameterised queries — user input is bound as a
 *   parameter value, never interpolated into the SQL string.  The database
 *   driver (node-postgres) then treats the entire value as a literal, so no
 *   payload can alter the query structure.
 */

export const SQLI_PAYLOADS: string[] = [
  // ── 1. Classic tautology ──────────────────────────────────────────────────
  "' OR '1'='1",
  "' OR '1'='1'--",
  "1' OR 1=1--",
  "' OR 1=1--",
  '" OR "1"="1',
  "') OR ('1'='1",

  // ── 2. UNION exfiltration ─────────────────────────────────────────────────
  "' UNION SELECT null--",
  "' UNION SELECT null, null--",
  "' UNION SELECT null, null, null--",
  "' UNION SELECT table_name FROM information_schema.tables--",
  "' UNION ALL SELECT username, password FROM users--",

  // ── 3. Stacked / batched queries ──────────────────────────────────────────
  "'; DROP TABLE server_users;--",
  "'; DELETE FROM server_users WHERE '1'='1",
  "'; INSERT INTO server_users VALUES ('x','x','x');--",
  "'; UPDATE server_users SET password_hash='x' WHERE '1'='1';--",

  // ── 4. Comment bypass ─────────────────────────────────────────────────────
  "admin'--",
  "admin'/*",
  "admin' #",
  "' OR 1=1/*",
  "--",
  "/**/",

  // ── 5. Boolean-blind ─────────────────────────────────────────────────────
  "' AND 1=1--",
  "' AND 1=2--",
  "' AND 'a'='a",
  "' AND 'a'='b",
  "1 AND 1=1",
  "1 AND 1=2",

  // ── 6. Null byte ─────────────────────────────────────────────────────────
  "admin\x00",
  "test@example.com\x00injected",
  "\x00",

  // ── 7. Oversized input ───────────────────────────────────────────────────
  "A".repeat(10_000),
  `${"' OR '1'='1".repeat(500)}`,
];
