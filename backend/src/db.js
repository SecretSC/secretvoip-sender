import pg from "pg";
import bcrypt from "bcrypt";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Production-hardened pool:
// - `max` larger than bulk concurrency so a stuck bulk send can't starve
//   login/health/dashboard queries.
// - `connectionTimeoutMillis` so a request never waits forever for a free client.
// - `statement_timeout` / `idle_in_transaction_session_timeout` so a hung query
//   on the upstream-busy path can't pin a connection indefinitely.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 25),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
  idle_in_transaction_session_timeout: 10_000,
});
// Never let an unexpected pool/client error crash the process.
pool.on("error", (err) => {
  console.error("[pg pool error]", err?.message || err);
});
// Each newly-acquired client also needs an `error` listener — when PostgreSQL
// is restarted (`57P01 terminating connection due to administrator command`)
// the client emits an `error` event. Without a listener, Node throws
// "Unhandled 'error' event" and kills the process.
pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("[pg client error]", err?.code || "", err?.message || err);
  });
});

export async function runMigrations() {
  const schema = fs.readFileSync(path.join(__dirname, "..", "..", "db", "schema.sql"), "utf8");
  await pool.query(schema);
}

export async function ensureSeedAdmin() {
  const { rows } = await pool.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");
  if (rows.length) return;
  const email = process.env.ADMIN_EMAIL || "admin@secretvoip.com";
  const tmp = process.env.ADMIN_TEMP_PASSWORD || "ChangeMe!2026";
  const hash = await bcrypt.hash(tmp, 12);
  await pool.query(
    `INSERT INTO users (email, username, name, role, status, password_hash, must_change_password)
     VALUES ($1,$2,$3,'admin','active',$4,true)`,
    [email, "admin", "Super Admin", hash]
  );
  console.log("=================================================================");
  console.log(" Seeded super admin account");
  console.log(" Email:    ", email);
  console.log(" Password: ", tmp, "  (force-change on first login)");
  console.log("=================================================================");
}
