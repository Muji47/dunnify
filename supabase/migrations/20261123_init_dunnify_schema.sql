-- Dunnify Master Database Schema Migration
-- Target: Supabase PostgreSQL (or any standard PostgreSQL 14+)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Merchants (B2B SaaS / Agency customers)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company_name TEXT,
    stripe_account_id TEXT,
    stripe_webhook_secret TEXT,
    meta_whatsapp_phone_number_id TEXT,
    meta_whatsapp_token TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'growth' CHECK (plan_tier IN ('starter', 'growth', 'scale')),
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Recovery Events (Failed invoice recovery lifecycles)
CREATE TABLE IF NOT EXISTS recovery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RECOVERED', 'CHURNED', 'PHONE_MISSING')),
    failure_reason TEXT DEFAULT 'Card expired / Bank soft decline',
    attempt_count INT NOT NULL DEFAULT 1,
    hosted_invoice_url TEXT,
    pay_token TEXT NOT NULL UNIQUE,
    current_stage INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 3),
    plan_name TEXT DEFAULT 'Monthly Subscription',
    recovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Dunning Messages (Audit log of WhatsApp & Email dispatches)
CREATE TABLE IF NOT EXISTS dunning_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_event_id UUID NOT NULL REFERENCES recovery_events(id) ON DELETE CASCADE,
    stage INT NOT NULL CHECK (stage IN (1, 2, 3)),
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms')),
    recipient TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
    message_id TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    body TEXT NOT NULL,
    action_url TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast queries & idempotency guarantees
CREATE INDEX IF NOT EXISTS idx_recovery_events_stripe_invoice_id ON recovery_events (stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_recovery_events_pay_token ON recovery_events (pay_token);
CREATE INDEX IF NOT EXISTS idx_recovery_events_status ON recovery_events (status);
CREATE INDEX IF NOT EXISTS idx_recovery_events_created_at ON recovery_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dunning_messages_event_id ON dunning_messages (recovery_event_id);
CREATE INDEX IF NOT EXISTS idx_dunning_messages_queue ON dunning_messages (status, scheduled_for);

-- Seed default merchant if none exists
INSERT INTO merchants (id, name, email, company_name, plan_tier)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Founder Merchant',
    'founder@dunnify.com',
    'Dunnify Demo Store',
    'growth'
) ON CONFLICT (email) DO NOTHING;
