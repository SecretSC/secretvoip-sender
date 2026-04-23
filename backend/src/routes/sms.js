import { Router } from "express";
import { authRequired } from "../auth.js";
import { upstream } from "../upstream.js";
import { pool } from "../db.js";

const r = Router();
r.use(authRequired);

r.get("/available-routes", async (req, res, next) => {
  try {
    const expand = req.query.expand === "gamma";
    res.json(await upstream.routes(expand));
  } catch (e) { next(e); }
});

r.post("/send", async (req, res, next) => {
  try {
    const result = await upstream.send(req.body);
    // Cache locally for our own logs page
    if (Array.isArray(result.messages)) {
      for (const m of result.messages) {
        await pool.query(
          `INSERT INTO sms_logs_cache (upstream_id, customer_id, recipient, sender_id, segments, cost, status, message, direction)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [m.id, req.user.sub, m.recipient, req.body.sender_id || null,
           result.segments || 1, result.total_cost / Math.max(1, result.messages.length),
           m.status, req.body.message || null, "Auto-routed"]
        );
      }
    }
    await pool.query("INSERT INTO audit_logs (actor, action, target, meta) VALUES ($1,'sms.send',$2,$3)",
      [req.user.email, String((req.body.to || []).length || 1), JSON.stringify({ route: req.body.route_option_id })]);
    res.json(result);
  } catch (e) { next(e); }
});

r.get("/logs", async (req, res, next) => {
  try {
    // Prefer upstream logs if available; fall back to local cache.
    try {
      const qs = new URLSearchParams(req.query).toString();
      const u = await upstream.logs(qs);
      return res.json(u);
    } catch {
      const { rows } = await pool.query(
        `SELECT id, upstream_id, recipient, sender_id, segments, cost, status, message, direction, created_at
         FROM sms_logs_cache WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [req.user.sub]
      );
      res.json({ data: rows.map(r => ({ ...r, date: r.created_at })), page: 1, limit: 100, has_more: false });
    }
  } catch (e) { next(e); }
});

export default r;
