import { Router } from "express";
import { authRequired } from "../auth.js";
import { upstream } from "../upstream.js";
import { pool } from "../db.js";

const r = Router();
r.use(authRequired);

// ---- Single source of truth for pricing ----
//
// Provider (upstream) base prices for the FLAT routes. These are NOT exposed
// to the customer — we always multiply by the reseller markup before display.
// Gamma prices come from the upstream API per channel.
const FLAT_PROVIDER_PRICE_EUR = {
  alpha: 0.06,
  beta: 0.06,
  epsilon: 0.06,
};

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

async function providerPriceFor(optionId) {
  if (!optionId) return null;
  const id = String(optionId).toLowerCase();
  if (id === "alpha") return FLAT_PROVIDER_PRICE_EUR.alpha;
  if (id === "beta") return FLAT_PROVIDER_PRICE_EUR.beta;
  if (id === "epsilon" || id.startsWith("epsilon-")) return FLAT_PROVIDER_PRICE_EUR.epsilon;

  if (id.startsWith("gamma-")) {
    try {
      const data = await upstream.routes(true);
      const list = Array.isArray(data?.gamma_options)
        ? data.gamma_options
        : Object.values(data?.gamma_by_country || {}).flat();
      const hit = list.find((c) => String(c.option_id || "").toLowerCase() === id);
      if (hit && Number.isFinite(Number(hit.price))) return Number(hit.price);
    } catch {}
  }
  return null;
}

// Public: markup multiplier + flat route customer prices
r.get("/markup", async (_req, res, next) => {
  try {
    const mult = await getMarkupMultiplier();
    res.json({
      multiplier: mult,
      percent: +((mult - 1) * 100).toFixed(2),
      flat_routes: {
        alpha:   +(FLAT_PROVIDER_PRICE_EUR.alpha   * mult).toFixed(4),
        beta:    +(FLAT_PROVIDER_PRICE_EUR.beta    * mult).toFixed(4),
        epsilon: +(FLAT_PROVIDER_PRICE_EUR.epsilon * mult).toFixed(4),
      },
    });
  } catch (e) { next(e); }
});

r.get("/available-routes", async (req, res, next) => {
  try {
    const expand = req.query.expand === "gamma";
    const data = await upstream.routes(expand);
    const mult = await getMarkupMultiplier();

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

    res.json({
      ...data,
      markup_multiplier: mult,
      flat_routes: {
        alpha:   { customer_price: markPrice(FLAT_PROVIDER_PRICE_EUR.alpha),   provider_price: wantsRaw ? FLAT_PROVIDER_PRICE_EUR.alpha   : undefined },
        beta:    { customer_price: markPrice(FLAT_PROVIDER_PRICE_EUR.beta),    provider_price: wantsRaw ? FLAT_PROVIDER_PRICE_EUR.beta    : undefined },
        epsilon: { customer_price: markPrice(FLAT_PROVIDER_PRICE_EUR.epsilon), provider_price: wantsRaw ? FLAT_PROVIDER_PRICE_EUR.epsilon : undefined },
      },
    });
  } catch (e) { next(e); }
});

r.post("/send", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const isCustomer = req.user.role === "customer";
    const mult = await getMarkupMultiplier();

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

    const result = await upstream.send(req.body);

    const recipientsCount = Array.isArray(result.messages) ? result.messages.length : 1;
    const segments = Number(result.segments || 1);

    // Provider price: prefer our own catalog, fall back to upstream total
    let providerPer = await providerPriceFor(req.body.route_option_id);
    let providerTotal;
    if (providerPer != null) {
      providerPer = +(providerPer * segments).toFixed(4);
      providerTotal = +(providerPer * recipientsCount).toFixed(4);
    } else {
      providerTotal = Number(result.total_cost || 0);
      providerPer = recipientsCount > 0 ? +(providerTotal / recipientsCount).toFixed(4) : 0;
    }
    const customerPer = +(providerPer * mult).toFixed(4);
    const customerTotal = +(customerPer * recipientsCount).toFixed(4);
    const marginPer    = +(customerPer - providerPer).toFixed(4);

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
            customerPer,
            providerPer, customerPer, marginPer,
            m.status, req.body.message || null, "Auto-routed",
          ]
        );
      }
    }

    let newBalance = null;
    if (isCustomer && customerTotal > 0) {
      await client.query("BEGIN");
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

    res.json({
      ...result,
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

// Route tester: send one real SMS per selected route
r.post("/test", async (req, res, next) => {
  try {
    const { to, message, routes: testedRoutes = [] } = req.body || {};
    if (!to) return res.status(400).json({ message: "Missing destination number" });
    if (!Array.isArray(testedRoutes) || testedRoutes.length === 0) {
      return res.status(400).json({ message: "Pick at least one route to test" });
    }

    const mult = await getMarkupMultiplier();
    const results = [];

    for (const routeId of testedRoutes) {
      const startedAt = Date.now();
      try {
        const r = await upstream.send({
          to,
          message: message || "SecretVoIP route test",
          sender_id: req.body.sender_id || "SecretVoIP",
          route_option_id: routeId,
        });
        const latency_ms = Date.now() - startedAt;
        const provider = (await providerPriceFor(routeId)) ?? Number(r.total_cost || 0);
        const customer = +(provider * mult).toFixed(4);
        results.push({
          route: routeId,
          status: r.status || "sent",
          latency_ms,
          cost: customer,
          provider_cost: req.user.role === "admin" ? provider : undefined,
          margin: req.user.role === "admin" ? +(customer - provider).toFixed(4) : undefined,
          message_id: r.messages?.[0]?.id,
        });
      } catch (e) {
        results.push({
          route: routeId,
          status: "failed",
          latency_ms: Date.now() - startedAt,
          cost: 0,
          error: e?.message || "Upstream error",
        });
      }
    }
    res.json({ status: "tested", results });
  } catch (e) { next(e); }
});

r.get("/logs", async (req, res, next) => {
  try {
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
