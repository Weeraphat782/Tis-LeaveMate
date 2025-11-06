-- Fix RLS policy for leave_audit_trail table
-- Allow INSERT operations for audit logging

-- 1. Check current RLS policies for leave_audit_trail
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_audit_trail';

-- 2. Add INSERT policy for leave_audit_trail
-- Allow system/triggers to insert audit records
CREATE POLICY "Allow audit trail inserts" ON leave_audit_trail
    FOR INSERT WITH CHECK (true);

-- 3. Alternative: Disable RLS for leave_audit_trail if audit logging should be unrestricted
-- (Uncomment the line below if you want to disable RLS completely for this table)
-- ALTER TABLE leave_audit_trail DISABLE ROW LEVEL SECURITY;

-- 4. Verify the policy was added
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_audit_trail';

-- 5. Test inserting an audit record manually
-- (This should work now with the new policy)
-- INSERT INTO leave_audit_trail (
--     leave_request_id,
--     action,
--     previous_status,
--     new_status,
--     performed_by,
--     performed_by_name,
--     performed_by_email,
--     notes
-- ) VALUES (
--     '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f',
--     'updated',
--     'pending',
--     'approved',
--     'test@example.com',
--     'Test User',
--     'test@example.com',
--     'Test audit entry'
-- );

