import { Router } from "express";
import { authRequired } from "../auth.js";
import { pool } from "../db.js";

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

export default r;
