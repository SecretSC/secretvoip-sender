import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { z } from "zod";
import { authRequired, requireRole } from "../auth.js";
import { pool } from "../db.js";

const r = Router();
r.use(authRequired, requireRole("admin"));

r.get("/customers", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.name, u.status, u.created_at,
              COALESCE(cp.balance_eur, 0) AS balance_eur
         FROM users u
         LEFT JOIN customer_profiles cp ON cp.user_id = u.id
        WHERE u.role='customer'
        ORDER BY u.created_at DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// ---------- Wallet / manual top-up ----------
r.get("/customers/:id/wallet", async (req, res, next) => {
  try {
    const { rows: bal } = await pool.query(
      `SELECT COALESCE(balance_eur,0) AS balance_eur FROM customer_profiles WHERE user_id=$1`,
      [req.params.id]
    );
    const { rows: tx } = await pool.query(
      `SELECT id, amount_eur, type, note, created_by, created_at
         FROM wallet_transactions WHERE customer_id=$1
         ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ balance_eur: bal[0]?.balance_eur ?? 0, transactions: tx });
  } catch (e) { next(e); }
});

r.post("/customers/:id/topup", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const data = z.object({
      amount_eur: z.number().refine((n) => n !== 0, "Amount cannot be zero"),
      type: z.enum(["topup", "adjustment", "charge", "refund"]).default("topup"),
      note: z.string().max(500).optional(),
    }).parse(req.body);

    await client.query("BEGIN");
    // Make sure profile exists
    await client.query(
      `INSERT INTO customer_profiles (user_id, balance_eur)
       VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
      [req.params.id]
    );
    const { rows } = await client.query(
      `UPDATE customer_profiles
          SET balance_eur = balance_eur + $1
        WHERE user_id = $2
        RETURNING balance_eur`,
      [data.amount_eur, req.params.id]
    );
    await client.query(
      `INSERT INTO wallet_transactions (customer_id, amount_eur, type, note, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, data.amount_eur, data.type, data.note || null, req.user.email]
    );
    await client.query(
      `INSERT INTO audit_logs (actor, action, target, meta) VALUES ($1,'wallet.topup',$2,$3)`,
      [req.user.email, req.params.id, JSON.stringify({ amount: data.amount_eur, type: data.type, note: data.note })]
    );
    await client.query("COMMIT");
    res.json({ ok: true, balance_eur: rows[0].balance_eur });
  } catch (e) { await client.query("ROLLBACK").catch(() => {}); next(e); }
  finally { client.release(); }
});

r.post("/customers", async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1), email: z.string().email(), username: z.string().min(2),
      password: z.string().min(8), mustChangePassword: z.boolean().optional(),
    }).parse(req.body);
    const hash = await bcrypt.hash(data.password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, name, role, status, password_hash, must_change_password)
       VALUES ($1,$2,$3,'customer','active',$4,$5)
       RETURNING id, email, username, name, status, created_at`,
      [data.email, data.username, data.name, hash, data.mustChangePassword ?? true]
    );
    await pool.query(
      `INSERT INTO customer_profiles (user_id, balance_eur) VALUES ($1, 0)
       ON CONFLICT (user_id) DO NOTHING`, [rows[0].id]);
    await pool.query("INSERT INTO audit_logs (actor, action, target, meta) VALUES ($1,'user.create',$2,$3)",
      [req.user.email, rows[0].id, data.email]);
    res.json({ ...rows[0], balance_eur: 0 });
  } catch (e) { next(e); }
});

r.patch("/customers/:id", async (req, res, next) => {
  try {
    const patch = z.object({ status: z.enum(["active", "suspended"]).optional(), name: z.string().optional() }).parse(req.body);
    const fields = []; const values = []; let i = 1;
    for (const [k, v] of Object.entries(patch)) { fields.push(`${k}=$${i++}`); values.push(v); }
    if (!fields.length) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(",")} WHERE id=$${i}`, values);
    await pool.query("INSERT INTO audit_logs (actor, action, target, meta) VALUES ($1,'user.update',$2,$3)",
      [req.user.email, req.params.id, JSON.stringify(patch)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete("/customers/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM users WHERE id=$1 AND role='customer'", [req.params.id]);
    await pool.query("INSERT INTO audit_logs (actor, action, target) VALUES ($1,'user.delete',$2)", [req.user.email, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/customers/:id/reset-password", async (req, res, next) => {
  try {
    const tempPassword = "Tmp" + crypto.randomBytes(4).toString("hex") + "!";
    const hash = await bcrypt.hash(tempPassword, 12);
    await pool.query("UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2", [hash, req.params.id]);
    await pool.query("INSERT INTO audit_logs (actor, action, target) VALUES ($1,'user.password_reset',$2)", [req.user.email, req.params.id]);
    res.json({ tempPassword });
  } catch (e) { next(e); }
});

r.get("/audit", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, actor, action, target, meta, created_at AS at FROM audit_logs ORDER BY created_at DESC LIMIT 500");
    res.json(rows);
  } catch (e) { next(e); }
});

r.get("/stats", async (_req, res, next) => {
  try {
    const [{ rows: c }, { rows: s }, { rows: recent }] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='customer'"),
      pool.query(`SELECT COUNT(*) total,
                         COUNT(*) FILTER (WHERE status='delivered') delivered,
                         COUNT(*) FILTER (WHERE status='failed') failed FROM sms_logs_cache`),
      pool.query("SELECT * FROM sms_logs_cache ORDER BY created_at DESC LIMIT 6"),
    ]);
    res.json({
      customers: +c[0].count, total_sms: +s[0].total, delivered: +s[0].delivered, failed: +s[0].failed,
      routes: 4, recent: recent.map(r => ({ ...r, date: r.created_at })),
    });
  } catch (e) { next(e); }
});

export default r;
