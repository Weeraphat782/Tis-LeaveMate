-- Check if Supabase schema is properly set up
-- Run this in Supabase SQL Editor

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- Check leave_requests table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leave_requests'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- Check RLS policies for leave_requests
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'leave_requests';

-- Test a simple insert (will fail if RLS blocks it)
-- Uncomment the line below to test:
-- INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status)
-- VALUES ('test-user-id', 'Personal Leave', '["2024-01-01T00:00:00.000Z"]', 1, 'Test', 'pending');
