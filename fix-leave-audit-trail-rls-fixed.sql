-- Fix RLS policy for leave_audit_trail table
-- Allow INSERT operations for audit logging

-- 1. Check current RLS policies for leave_audit_trail
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_audit_trail';

-- 2. Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Allow audit trail inserts" ON leave_audit_trail;

-- 3. Create INSERT policy for leave_audit_trail
-- Allow system/triggers to insert audit records
CREATE POLICY "Allow audit trail inserts" ON leave_audit_trail
    FOR INSERT WITH CHECK (true);

-- 4. Alternative: Disable RLS for leave_audit_trail if audit logging should be unrestricted
-- (Uncomment the line below if you want to disable RLS completely for this table)
-- ALTER TABLE leave_audit_trail DISABLE ROW LEVEL SECURITY;

-- 5. Verify the policy was added
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_audit_trail';

-- 6. Test the trigger by manually updating a leave request
-- (Replace with actual leave request ID)
-- UPDATE leave_requests SET status = 'approved', approved_at = NOW(), approved_by = 'test@example.com', approved_by_name = 'Test User' WHERE id = 'your-leave-request-id';

