-- SecretVoIP SMS — PostgreSQL schema (idempotent)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT_LIKE TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','customer')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  password_hash   TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_sender  TEXT,
  notes           TEXT,
  balance_eur     NUMERIC(12,4) NOT NULL DEFAULT 0
);

-- Make sure the column exists on already-deployed databases
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS balance_eur NUMERIC(12,4) NOT NULL DEFAULT 0;

-- Manual top-up ledger (admin records every credit/debit, including SMS charges)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_eur      NUMERIC(12,4) NOT NULL,        -- positive = top-up, negative = adjustment/charge
  type            TEXT NOT NULL CHECK (type IN ('topup','adjustment','charge','refund')),
  note            TEXT,
  created_by      TEXT,                          -- admin email or 'system'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_customer_date ON wallet_transactions (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sms_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  payload         JSONB NOT NULL,
  response        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_logs_cache (
  id              BIGSERIAL PRIMARY KEY,
  upstream_id     BIGINT,
  customer_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient       TEXT NOT NULL,
  sender_id       TEXT,
  segments        INT DEFAULT 1,
  cost            NUMERIC(10,4) DEFAULT 0,        -- legacy: kept = customer_cost
  provider_cost   NUMERIC(10,4) DEFAULT 0,        -- what we paid upstream
  customer_cost   NUMERIC(10,4) DEFAULT 0,        -- what we charged the customer
  margin          NUMERIC(10,4) DEFAULT 0,        -- customer_cost - provider_cost
  status          TEXT,
  message         TEXT,
  direction       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- For previously-deployed databases:
ALTER TABLE sms_logs_cache ADD COLUMN IF NOT EXISTS provider_cost NUMERIC(10,4) DEFAULT 0;
ALTER TABLE sms_logs_cache ADD COLUMN IF NOT EXISTS customer_cost NUMERIC(10,4) DEFAULT 0;
ALTER TABLE sms_logs_cache ADD COLUMN IF NOT EXISTS margin        NUMERIC(10,4) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_logs_customer_date ON sms_logs_cache (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_recipient ON sms_logs_cache (recipient);

CREATE TABLE IF NOT EXISTS route_catalog (
  option_id       TEXT PRIMARY KEY,
  family          TEXT NOT NULL,
  label           TEXT NOT NULL,
  subtitle        TEXT
);

CREATE TABLE IF NOT EXISTS route_gamma_channels (
  option_id       TEXT PRIMARY KEY,
  country         TEXT NOT NULL,
  iso             TEXT,
  dial            TEXT,
  channel_name    TEXT NOT NULL,
  price           NUMERIC(10,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key             TEXT PRIMARY KEY,
  value           JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default reseller markup = 50% (1.5x). Admin can change it later.
INSERT INTO admin_settings (key, value)
VALUES ('reseller_markup', '{"percent": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  actor           TEXT,
  action          TEXT NOT NULL,
  target          TEXT,
  meta            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
  token           TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sessions (
  token           TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sender_id       TEXT NOT NULL,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_templates_customer_date ON sms_templates (customer_id, updated_at DESC);
