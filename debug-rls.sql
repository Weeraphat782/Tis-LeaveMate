-- Debug script to temporarily disable RLS for leave_requests table
-- Run this in Supabase SQL Editor to allow inserts for debugging

-- Disable RLS temporarily for debugging
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;

-- Or create a temporary policy that allows all inserts
-- DROP POLICY IF EXISTS "Temp allow all inserts" ON leave_requests;
-- CREATE POLICY "Temp allow all inserts" ON leave_requests
--     FOR INSERT WITH CHECK (true);

-- After debugging, re-enable RLS:
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
