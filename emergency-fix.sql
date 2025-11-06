-- Emergency fix for approve/reject functionality
-- Disable RLS for leave_audit_trail to allow INSERT operations

-- 1. Disable RLS for leave_audit_trail table
ALTER TABLE leave_audit_trail DISABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is disabled
SELECT schemaname, tablename,
       rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'leave_audit_trail';

-- 3. Test by manually updating a leave request (replace with actual ID)
-- UPDATE leave_requests
-- SET status = 'approved',
--     approved_at = NOW(),
--     approved_by = 'test@example.com',
--     approved_by_name = 'Test User'
-- WHERE id = 'your-leave-request-id';

-- 4. Check if audit trail can be inserted
-- INSERT INTO leave_audit_trail (
--     leave_request_id, action, previous_status, new_status,
--     performed_by, performed_by_name, performed_by_email, notes
-- ) VALUES (
--     'your-leave-request-id', 'updated', 'pending', 'approved',
--     'test@example.com', 'Test User', 'test@example.com', 'Leave request approved'
-- );
