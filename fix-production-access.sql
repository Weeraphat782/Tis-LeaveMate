-- Fix production access issues
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances');

-- 2. Temporarily disable RLS for testing (UNSAFE - only for debugging)
-- ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY;

-- 3. Alternative: Create more permissive policies for production
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;

-- Create more permissive policies (less secure but works for production)
CREATE POLICY "Allow authenticated users to insert leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view leave requests" ON leave_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update leave requests" ON leave_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Check profiles access
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Allow authenticated users to view profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Verify the changes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('leave_requests', 'profiles');

-- 6. Test with a simple query (should work now)
-- SELECT COUNT(*) FROM leave_requests;

-- 7. To revert to secure policies later, run:
-- DROP POLICY "Allow authenticated users to insert leave requests" ON leave_requests;
-- DROP POLICY "Allow authenticated users to view leave requests" ON leave_requests;
-- DROP POLICY "Allow authenticated users to update leave requests" ON leave_requests;
-- DROP POLICY "Allow authenticated users to view profiles" ON profiles;
-- Then re-run the original schema policies
