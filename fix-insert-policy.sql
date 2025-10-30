-- Fix the insert policy for leave_requests
-- Run this in Supabase SQL Editor

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;

-- Create the correct policy
CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'leave_requests' AND cmd = 'INSERT';

-- Test: Try to insert without authentication (should fail)
-- INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status)
-- VALUES ('test-uuid', 'Personal Leave', '["2024-01-01T00:00:00.000Z"]', 1, 'Test', 'pending');
