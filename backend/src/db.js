import pg from "pg";
import bcrypt from "bcrypt";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
