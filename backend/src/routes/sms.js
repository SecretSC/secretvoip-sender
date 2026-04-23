import { Router } from "express";
import { authRequired } from "../auth.js";
import { upstream } from "../upstream.js";
import { pool } from "../db.js";

const r = Router();
r.use(authRequired);

// Get current reseller markup (e.g. 1.5 for 50%). Defaults to 50% if not set.
async function getMarkupMultiplier() {
  try {
    const { rows } = await pool.query(
      `SELECT value FROM admin_settings WHERE key='reseller_markup' LIMIT 1`
    );
    const pct = Number(rows[0]?.value?.percent);
    if (Number.isFinite(pct) && pct >= 0) return 1 + pct / 100;
  } catch {}
  return 1.5;
}

r.get("/markup", async (_req, res, next) => {
  try {
    const mult = await getMarkupMultiplier();
    res.json({ multiplier: mult, percent: +((mult - 1) * 100).toFixed(2) });
  } catch (e) { next(e); }
});

r.get("/available-routes", async (req, res, next) => {
  try {
    const expand = req.query.expand === "gamma";
    const data = await upstream.routes(expand);
    const mult = await getMarkupMultiplier();

    // Apply customer markup to all visible prices for non-admin callers.
    // Admin can pass ?raw=1 to also see provider prices alongside.
    const isAdmin = req.user?.role === "admin";
    const wantsRaw = isAdmin && req.query.raw === "1";

    const markPrice = (p) => +(Number(p || 0) * mult).toFixed(4);

    if (data?.gamma_by_country && typeof data.gamma_by_country === "object") {
      for (const country of Object.keys(data.gamma_by_country)) {
        data.gamma_by_country[country] = (data.gamma_by_country[country] || []).map((c) => ({
          ...c,
          provider_price: wantsRaw ? Number(c.price || 0) : undefined,
          price: markPrice(c.price),
        }));
      }
    }
    if (Array.isArray(data?.gamma_options)) {
      data.gamma_options = data.gamma_options.map((c) => ({
        ...c,
        provider_price: wantsRaw ? Number(c.price || 0) : undefined,
        price: markPrice(c.price),
      }));
    }
    res.json({ ...data, markup_multiplier: mult });
  } catch (e) { next(e); }
});

r.post("/send", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const isCustomer = req.user.role === "customer";
    const mult = await getMarkupMultiplier();

    // ---- 1) Pre-flight: check customer balance (customers only) ----
    if (isCustomer) {
      const { rows: balRows } = await pool.query(
        `SELECT COALESCE(balance_eur, 0) AS balance_eur
           FROM customer_profiles WHERE user_id=$1`,
        [req.user.sub]
      );
      const currentBalance = Number(balRows[0]?.balance_eur ?? 0);
      if (currentBalance <= 0) {
        return res.status(402).json({
          message: "Insufficient balance. Please top up your wallet to send SMS.",
          balance_eur: currentBalance,
        });
      }
    }

    // ---- 2) Forward to upstream ----
    const result = await upstream.send(req.body);

    const recipientsCount = Array.isArray(result.messages) ? result.messages.length : 1;
    const providerTotal = Number(result.total_cost || 0);
    const customerTotal = +(providerTotal * mult).toFixed(4);
    const segments = Number(result.segments || 1);

    // Per-message split (so each log row carries its share)
    const providerPer = recipientsCount > 0 ? +(providerTotal / recipientsCount).toFixed(4) : 0;
    const customerPer = recipientsCount > 0 ? +(customerTotal / recipientsCount).toFixed(4) : 0;
    const marginPer   = +(customerPer - providerPer).toFixed(4);

    // ---- 3) Insert log rows ----
    if (Array.isArray(result.messages)) {
      for (const m of result.messages) {
        await client.query(
          `INSERT INTO sms_logs_cache
             (upstream_id, customer_id, recipient, sender_id, segments,
              cost, provider_cost, customer_cost, margin,
              status, message, direction)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            m.id, req.user.sub, m.recipient, req.body.sender_id || null,
            segments,
            customerPer,           // legacy "cost" column = what customer paid
            providerPer, customerPer, marginPer,
            m.status, req.body.message || null, "Auto-routed",
          ]
        );
      }
    }

    // ---- 4) Charge the customer wallet (customers only, successful sends only) ----
    let newBalance = null;
    if (isCustomer && customerTotal > 0) {
      await client.query("BEGIN");
      // Make sure the profile row exists
      await client.query(
        `INSERT INTO customer_profiles (user_id, balance_eur)
         VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
        [req.user.sub]
      );
      const { rows: upd } = await client.query(
        `UPDATE customer_profiles
            SET balance_eur = balance_eur - $1
          WHERE user_id = $2
          RETURNING balance_eur`,
        [customerTotal, req.user.sub]
      );
      newBalance = Number(upd[0]?.balance_eur ?? 0);
      await client.query(
        `INSERT INTO wallet_transactions
           (customer_id, amount_eur, type, note, created_by)
         VALUES ($1, $2, 'charge', $3, 'system')`,
        [
          req.user.sub,
          -customerTotal,
          `SMS send · ${recipientsCount} recipient${recipientsCount === 1 ? "" : "s"} · route ${req.body.route_option_id || "auto"}`,
        ]
      );
      await client.query("COMMIT");
    }

    await pool.query(
      "INSERT INTO audit_logs (actor, action, target, meta) VALUES ($1,'sms.send',$2,$3)",
      [
        req.user.email, String((req.body.to || []).length || recipientsCount || 1),
        JSON.stringify({
          route: req.body.route_option_id,
          provider_cost: providerTotal,
          customer_cost: customerTotal,
          margin: +(customerTotal - providerTotal).toFixed(4),
        }),
      ]
    );

    // ---- 5) Respond with customer-facing numbers + accurate balance ----
    res.json({
      ...result,
      // Override upstream cost so customer never sees provider price
      total_cost: customerTotal,
      provider_cost: req.user.role === "admin" ? providerTotal : undefined,
      margin: req.user.role === "admin" ? +(customerTotal - providerTotal).toFixed(4) : undefined,
      wallet_balance: isCustomer ? newBalance : Number(result.wallet_balance || 0),
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

r.get("/logs", async (req, res, next) => {
  try {
    // Always serve from local cache so we control pricing visibility
    // (upstream logs would leak the provider cost to customers).
    const isAdmin = req.user.role === "admin";
    const params = [];
    let where = "WHERE 1=1";
    if (!isAdmin) {
      params.push(req.user.sub);
      where += ` AND customer_id = $${params.length}`;
    } else if (req.query.customer_id) {
      params.push(req.query.customer_id);
      where += ` AND customer_id = $${params.length}`;
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where += ` AND recipient ILIKE $${params.length}`;
    }
    if (req.query.status && req.query.status !== "all") {
      params.push(req.query.status);
      where += ` AND status = $${params.length}`;
    }
    if (req.query.from) {
      params.push(req.query.from);
      where += ` AND created_at >= $${params.length}::date`;
    }
    if (req.query.to) {
      params.push(req.query.to);
      where += ` AND created_at <= ($${params.length}::date + interval '1 day')`;
    }

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT id, upstream_id, recipient, sender_id, segments,
              cost, provider_cost, customer_cost, margin,
              status, message, direction, customer_id, created_at
         FROM sms_logs_cache
         ${where}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM sms_logs_cache ${where}`, params
    );

    // Customers must never see provider cost / margin
    const data = rows.map((r) => {
      const base = {
        id: r.id,
        date: r.created_at,
        recipient: r.recipient,
        sender_id: r.sender_id,
        segments: Number(r.segments || 0),
        status: r.status,
        message: r.message,
        direction: r.direction,
        cost: Number(r.customer_cost ?? r.cost ?? 0),
      };
      if (isAdmin) {
        return {
          ...base,
          customer_id: r.customer_id,
          provider_cost: Number(r.provider_cost || 0),
          customer_cost: Number(r.customer_cost ?? r.cost ?? 0),
          margin: Number(r.margin || 0),
        };
      }
      return base;
    });

    res.json({
      data, page, limit,
      total: cnt[0].n,
      has_more: offset + data.length < cnt[0].n,
    });
  } catch (e) { next(e); }
});

export default r;
