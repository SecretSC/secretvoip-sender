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
    res.json({
      sent: +rows[0].total, delivered: +rows[0].delivered, failed: +rows[0].failed,
      routes: 4, recent: recent.rows.map(r => ({ ...r, date: r.created_at })),
    });
  } catch (e) { next(e); }
});

export default r;
