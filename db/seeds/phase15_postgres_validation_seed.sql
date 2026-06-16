-- Phase 15 PostgreSQL validation seed for local buyer smoke testing.
-- Apply after db/migrations/001_core_banking_schema.sql on a disposable validation database.

INSERT INTO customers (
  id, first_name, last_name, phone, email, kyc_tier, kyc_status, bvn_last4, nin_last4, created_at
)
VALUES (
  'cus_001', 'Adaeze', 'Okafor', '+2348012345678', 'adaeze@example.com',
  'tier_2', 'approved', '4821', '1742', now()
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  kyc_tier = EXCLUDED.kyc_tier,
  kyc_status = EXCLUDED.kyc_status,
  bvn_last4 = EXCLUDED.bvn_last4,
  nin_last4 = EXCLUDED.nin_last4;

INSERT INTO accounts (
  id, customer_id, account_number, account_name, currency, balance_kobo, available_balance_kobo, status, created_at
)
VALUES (
  'acct_001', 'cus_001', '1023456789', 'Adaeze Okafor', 'NGN',
  245000000, 245000000, 'active', now()
)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  account_number = EXCLUDED.account_number,
  account_name = EXCLUDED.account_name,
  currency = EXCLUDED.currency,
  balance_kobo = GREATEST(accounts.balance_kobo, EXCLUDED.balance_kobo),
  available_balance_kobo = GREATEST(accounts.available_balance_kobo, EXCLUDED.available_balance_kobo),
  status = 'active';

INSERT INTO customer_users (
  id, customer_id, email, phone, password_hash, active, created_at
)
VALUES (
  'cu_001', 'cus_001', 'adaeze@example.com', '+2348012345678',
  '4de0ea97a2ebb392022ceda99c2781783e7831085fe38eae67036bfee1059c76',
  true, now()
)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  active = true;

INSERT INTO admin_users (
  id, name, email, role, password_hash, active, created_at
)
VALUES
  (
    'adm_001', 'Operations Manager', 'ops@zebepay.example', 'operations_manager',
    '17164a9a6a4ca1c7f3dbd181e230eafd606eced173754326f98c90d40b527338',
    true, now()
  ),
  (
    'adm_002', 'Compliance Officer', 'compliance@zebepay.example', 'compliance_officer',
    '30549e52e5187197192e062087326929311e776dbde08aa7829854072b02e2cb',
    true, now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  active = true;

INSERT INTO beneficiaries (
  id, customer_id, name, account_number, bank_code, bank_name, status, created_at
)
VALUES (
  'ben_001', 'cus_001', 'Chinedu Okeke', '0123456789',
  '000027', 'Standard Chartered Bank Nigeria', 'active', now()
)
ON CONFLICT (customer_id, account_number, bank_code) DO UPDATE SET
  name = EXCLUDED.name,
  bank_name = EXCLUDED.bank_name,
  status = 'active';

INSERT INTO ledger_entries (
  id, transaction_id, account_id, entry_type, amount_kobo, balance_after_kobo, narration, created_at
)
VALUES (
  'led_001', 'seed_opening_balance', 'acct_001', 'credit',
  245000000, 245000000, 'Opening balance', now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_devices (
  id, customer_id, label, fingerprint, trusted, last_seen_at, created_at
)
VALUES (
  'dev_001', 'cus_001', 'Adaeze primary phone',
  'sandbox-device-fingerprint', true, now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  label = EXCLUDED.label,
  fingerprint = EXCLUDED.fingerprint,
  trusted = true,
  last_seen_at = now();

INSERT INTO kyc_review_cases (
  id, customer_id, status, submitted_tier, assigned_to, decision, decision_reason, created_at, decided_at
)
VALUES (
  'kyc_001', 'cus_001', 'approved', 'tier_2', 'adm_002', 'approved',
  'Seed customer approved for sandbox banking workflow.', now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  submitted_tier = EXCLUDED.submitted_tier,
  assigned_to = EXCLUDED.assigned_to,
  decision = EXCLUDED.decision,
  decision_reason = EXCLUDED.decision_reason,
  decided_at = now();

INSERT INTO audit_events (
  id, actor_id, actor_role, action, severity, entity_type, entity_id, message, metadata, created_at
)
VALUES (
  'aud_001', 'system', 'system', 'postgres.validation_seed', 'info',
  'account', 'acct_001', 'Phase 15 PostgreSQL validation seed applied.', '{}'::jsonb, now()
)
ON CONFLICT (id) DO NOTHING;
