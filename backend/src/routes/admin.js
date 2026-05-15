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

// ---------- Error logs ----------
r.get("/errors", async (req, res, next) => {
  try {
    const params = [];
    let where = "WHERE 1=1";
    if (req.query.customer_id) { params.push(req.query.customer_id); where += ` AND customer_id = $${params.length}`; }
    if (req.query.source && req.query.source !== "all") { params.push(req.query.source); where += ` AND source = $${params.length}`; }
    if (req.query.resolved === "true")  { where += ` AND resolved = true`; }
    if (req.query.resolved === "false") { where += ` AND resolved = false`; }
    if (req.query.from) { params.push(req.query.from); where += ` AND created_at >= $${params.length}::date`; }
    if (req.query.to)   { params.push(req.query.to);   where += ` AND created_at <= ($${params.length}::date + interval '1 day')`; }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where += ` AND (error_message ILIKE $${params.length} OR action ILIKE $${params.length} OR recipient ILIKE $${params.length} OR customer_email ILIKE $${params.length})`;
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const { rows } = await pool.query(
      `SELECT * FROM error_logs ${where} ORDER BY created_at DESC LIMIT ${limit}`, params
    );
    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int n FROM error_logs ${where}`, params);
    const { rows: stats } = await pool.query(
      `SELECT COUNT(*)::int total,
              COUNT(*) FILTER (WHERE resolved=false)::int unresolved,
              COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int last24h
         FROM error_logs`
    );
    res.json({ data: rows, total: cnt[0].n, stats: stats[0] });
  } catch (e) { next(e); }
});

r.patch("/errors/:id", async (req, res, next) => {
  try {
    const patch = z.object({
      resolved: z.boolean().optional(),
      admin_notes: z.string().max(2000).optional(),
    }).parse(req.body);
    const fields = []; const values = []; let i = 1;
    for (const [k, v] of Object.entries(patch)) { fields.push(`${k}=$${i++}`); values.push(v); }
    if (!fields.length) return res.json({ ok: true });
    fields.push(`updated_at=now()`);
    values.push(req.params.id);
    await pool.query(`UPDATE error_logs SET ${fields.join(",")} WHERE id=$${i}`, values);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- Customer SMS history (read-only summary + rows) ----------
r.get("/customers/:id/history", async (req, res, next) => {
  try {
    const id = req.params.id;
    const params = [id];
    let where = `WHERE l.customer_id = $1`;
    if (req.query.from)   { params.push(req.query.from);   where += ` AND l.created_at >= $${params.length}::date`; }
    if (req.query.to)     { params.push(req.query.to);     where += ` AND l.created_at <= ($${params.length}::date + interval '1 day')`; }
    if (req.query.status && req.query.status !== "all") { params.push(req.query.status); where += ` AND l.status = $${params.length}`; }
    if (req.query.recipient) { params.push(`%${req.query.recipient}%`); where += ` AND l.recipient ILIKE $${params.length}`; }
    if (req.query.sender_id) { params.push(`%${req.query.sender_id}%`); where += ` AND l.sender_id ILIKE $${params.length}`; }
    if (req.query.route)     { params.push(`%${req.query.route}%`);     where += ` AND l.direction ILIKE $${params.length}`; }

    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const { rows } = await pool.query(
      `SELECT l.id, l.upstream_id, l.recipient, l.sender_id, l.segments,
              l.cost, l.provider_cost, l.customer_cost, l.margin,
              l.status, l.message, l.direction, l.created_at
         FROM sms_logs_cache l
         ${where}
         ORDER BY l.created_at DESC
         LIMIT ${limit}`, params
    );
    const { rows: sum } = await pool.query(
      `SELECT COUNT(*)::int total,
              COUNT(*) FILTER (WHERE status='sent')::int sent,
              COUNT(*) FILTER (WHERE status='delivered')::int delivered,
              COUNT(*) FILTER (WHERE status='failed')::int failed,
              COALESCE(SUM(customer_cost), SUM(cost))::numeric(12,4) charged_total,
              COALESCE(SUM(provider_cost), 0)::numeric(12,4)         provider_total,
              COALESCE(SUM(margin), 0)::numeric(12,4)                margin_total
         FROM sms_logs_cache l ${where}`, params
    );
    res.json({ data: rows, summary: sum[0] });
  } catch (e) { next(e); }
});

r.get("/customers/:id/history/export", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query(
      `SELECT l.created_at, l.recipient, l.sender_id, l.message, l.segments,
              l.status, l.provider_cost, l.customer_cost, l.cost, l.margin, l.direction
         FROM sms_logs_cache l WHERE l.customer_id=$1
         ORDER BY l.created_at DESC`, [id]
    );
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ["date","recipient","sender_id","message","segments","status","provider_cost","customer_cost","margin","direction"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([r.created_at, r.recipient, r.sender_id, r.message, r.segments, r.status,
        Number(r.provider_cost || 0).toFixed(4),
        Number(r.customer_cost ?? r.cost ?? 0).toFixed(4),
        Number(r.margin || 0).toFixed(4), r.direction].map(esc).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="customer-${id}-history.csv"`);
    res.send(lines.join("\n"));
  } catch (e) { next(e); }
});

export default r;
