import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { runMigrations, ensureSeedAdmin } from "./db.js";
import authRoutes from "./routes/auth.js";
import smsRoutes from "./routes/sms.js";
import adminRoutes from "./routes/admin.js";
import meRoutes from "./routes/me.js";
import { logError } from "./errorLogger.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.APP_URL || true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, max: 50 }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/me", meRoutes);

app.use((err, req, res, _next) => {
  console.error(err);
  // Persist every uncaught backend exception for the admin Errors page.
  // Wrapped so logging failure can never crash the request.
  try {
    logError({
      req,
      source: req?.originalUrl || "backend",
      action: `${req?.method || ""} ${req?.originalUrl || ""}`.trim(),
      error: err,
      status_code: err?.status || 500,
    })?.catch?.(() => {});
  } catch {}
  // Strip upstream brand from any error message that escapes to the client.
  const msg = String(err.message || "Server error")
    .replace(/ttsky/gi, "Sub")
    .replace(/skytelecom/gi, "Provider");
  res.status(err.status || 500).json({ message: msg });
});

const port = process.env.API_PORT || 3001;
runMigrations()
  .then(ensureSeedAdmin)
  .then(() => app.listen(port, () => console.log(`SecretVoIP SMS backend listening on :${port}`)))
  .catch((e) => { console.error(e); process.exit(1); });
