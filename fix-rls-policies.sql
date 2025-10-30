-- Fix RLS policies for leave_requests table
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to allow fixes
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for leave_requests
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can approve/reject leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can delete own pending leave requests" ON leave_requests;

-- Create correct policies
CREATE POLICY "Users can view all leave requests" ON leave_requests
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending leave requests" ON leave_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can approve/reject leave requests" ON leave_requests
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own pending leave requests" ON leave_requests
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Re-enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Verify the policies are correct
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'leave_requests'
ORDER BY policyname;
