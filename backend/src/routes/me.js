import { Router } from "express";
import { authRequired } from "../auth.js";
import { pool } from "../db.js";
import { z } from "zod";

const r = Router();
r.use(authRequired);

r.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) total,
              COUNT(*) FILTER (WHERE status='delivered') delivered,
              COUNT(*) FILTER (WHERE status='failed') failed
       FROM sms_logs_cache WHERE customer_id=$1`, [req.user.sub]);
    const recent = await pool.query("SELECT * FROM sms_logs_cache WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 6", [req.user.sub]);
    const bal = await pool.query(`SELECT COALESCE(balance_eur,0) AS balance_eur FROM customer_profiles WHERE user_id=$1`, [req.user.sub]);
    res.json({
      sent: +rows[0].total, delivered: +rows[0].delivered, failed: +rows[0].failed,
      routes: 4, recent: recent.rows.map(r => ({ ...r, date: r.created_at })),
      balance_eur: Number(bal.rows[0]?.balance_eur ?? 0),
    });
  } catch (e) { next(e); }
});

r.get("/wallet", async (req, res, next) => {
  try {
    const bal = await pool.query(`SELECT COALESCE(balance_eur,0) AS balance_eur FROM customer_profiles WHERE user_id=$1`, [req.user.sub]);
    const tx = await pool.query(
      `SELECT id, amount_eur, type, note, created_at
         FROM wallet_transactions WHERE customer_id=$1
         ORDER BY created_at DESC LIMIT 50`, [req.user.sub]);
    res.json({ balance_eur: Number(bal.rows[0]?.balance_eur ?? 0), transactions: tx.rows });
  } catch (e) { next(e); }
});

r.get("/templates", async (req, res, next) => {
  try {
    if (req.user.role !== "customer") return res.status(403).json({ message: "Customer only" });
    const { rows } = await pool.query(
      `SELECT id, name, sender_id, message, created_at, updated_at
         FROM sms_templates WHERE customer_id=$1 ORDER BY updated_at DESC`,
      [req.user.sub]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.post("/templates", async (req, res, next) => {
  try {
    if (req.user.role !== "customer") return res.status(403).json({ message: "Customer only" });
    const data = z.object({ name: z.string().min(1).max(80), sender_id: z.string().min(1).max(32), message: z.string().min(1).max(5000) }).parse(req.body);
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS n FROM sms_templates WHERE customer_id=$1`, [req.user.sub]);
    if (countRows[0].n >= 10) return res.status(400).json({ message: "Maximum 10 templates allowed" });
    const { rows } = await pool.query(
      `INSERT INTO sms_templates (customer_id, name, sender_id, message)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, sender_id, message, created_at, updated_at`,
      [req.user.sub, data.name, data.sender_id, data.message]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.patch("/templates/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "customer") return res.status(403).json({ message: "Customer only" });
    const data = z.object({ name: z.string().min(1).max(80), sender_id: z.string().min(1).max(32), message: z.string().min(1).max(5000) }).parse(req.body);
    const { rows } = await pool.query(
      `UPDATE sms_templates SET name=$1, sender_id=$2, message=$3, updated_at=now()
        WHERE id=$4 AND customer_id=$5
        RETURNING id, name, sender_id, message, created_at, updated_at`,
      [data.name, data.sender_id, data.message, req.params.id, req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ message: "Template not found" });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete("/templates/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "customer") return res.status(403).json({ message: "Customer only" });
    await pool.query(`DELETE FROM sms_templates WHERE id=$1 AND customer_id=$2`, [req.params.id, req.user.sub]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
