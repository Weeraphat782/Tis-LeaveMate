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

-- Fix INSERT policy if it's incorrect
-- The INSERT policy should have WITH CHECK condition

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;

-- Create the correct policy
CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'leave_requests' AND policyname = 'Users can insert own leave requests';

-- Check if there are any users in auth.users
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check profiles table
SELECT id, email, full_name, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- If no users exist, you can create one via Supabase Dashboard:
-- Go to Authentication > Users and click "Add user"

-- Test a simple insert (will fail if RLS blocks it)
-- Uncomment the line below to test (replace with real user_id):
-- INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status)
-- VALUES ('your-user-id-here', 'Personal Leave', '["2024-01-01T00:00:00.000Z"]', 1, 'Test', 'pending');
