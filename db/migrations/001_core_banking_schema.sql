-- Zebepay core banking schema for PostgreSQL-compatible deployments.
-- Buyers must adapt this migration to their licensed infrastructure and provider contracts.

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  kyc_tier TEXT NOT NULL,
  kyc_status TEXT NOT NULL,
  bvn_last4 TEXT,
  nin_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance_kobo BIGINT NOT NULL DEFAULT 0,
  available_balance_kobo BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_users (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE beneficiaries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, account_number, bank_code)
);

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  entry_type TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  balance_after_kobo BIGINT NOT NULL,
  narration TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_account_created_idx ON ledger_entries(account_id, created_at DESC);

CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  source_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  beneficiary_name TEXT NOT NULL,
  beneficiary_account_number TEXT NOT NULL,
  beneficiary_bank_code TEXT NOT NULL,
  narration TEXT NOT NULL,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_device_id TEXT,
  otp_challenge_id TEXT,
  status TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  reviewed_by TEXT REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX transfers_review_queue_idx ON transfers(status, risk_level, created_at DESC);

CREATE TABLE customer_devices (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  label TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, fingerprint)
);

CREATE TABLE otp_challenges (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  purpose TEXT NOT NULL,
  target_id TEXT,
  code_hash TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX otp_challenges_customer_idx ON otp_challenges(customer_id, purpose, created_at DESC);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  admin_user_id TEXT REFERENCES admin_users(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX notifications_customer_idx ON notifications(customer_id, created_at DESC);

CREATE TABLE kyc_review_cases (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL,
  submitted_tier TEXT NOT NULL,
  assigned_to TEXT REFERENCES admin_users(id),
  decision TEXT,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE account_controls (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_events_actor_idx ON audit_events(actor_id, created_at DESC);

CREATE TABLE funding_intents (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  virtual_account_number TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX funding_intents_customer_idx ON funding_intents(customer_id, created_at DESC);

CREATE TABLE payout_dispatches (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_account_id TEXT NOT NULL REFERENCES accounts(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  beneficiary_account_number TEXT NOT NULL,
  beneficiary_bank_code TEXT NOT NULL,
  status TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payout_dispatches_customer_idx ON payout_dispatches(customer_id, created_at DESC);

CREATE TABLE idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id),
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_webhook_deliveries (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX provider_webhook_deliveries_status_idx ON provider_webhook_deliveries(status, received_at DESC);

CREATE TABLE reconciliation_exceptions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  assigned_to TEXT REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX reconciliation_exceptions_status_idx ON reconciliation_exceptions(status, severity, created_at DESC);

CREATE TABLE incident_records (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_id TEXT REFERENCES admin_users(id),
  related_entity_type TEXT,
  related_entity_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX incident_records_status_idx ON incident_records(status, severity, created_at DESC);
