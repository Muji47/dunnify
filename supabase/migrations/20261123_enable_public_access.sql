-- Dunnify Permissive Access & RLS Policies for Development
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ytleanepebzqmunjpwnt/sql/new

-- Option 1: Disable RLS for rapid development
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_messages DISABLE ROW LEVEL SECURITY;

-- Verify default merchant row exists
INSERT INTO merchants (id, name, email, company_name, plan_tier)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Founder Merchant',
    'founder@dunnify.com',
    'Dunnify Demo Store',
    'growth'
) ON CONFLICT (email) DO NOTHING;
