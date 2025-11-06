-- Verify that all database fixes have been applied
-- Run this in Supabase SQL Editor to check current state

-- 1. Check if telegram_notifications table exists
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'telegram_notifications';

-- 2. Check approved_by column type in leave_requests
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_requests'
  AND column_name IN ('approved_by', 'approved_by_name');

-- 3. Check performed_by column type in leave_audit_trail
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_audit_trail'
  AND column_name = 'performed_by';

-- 4. Check RLS policies for leave_audit_trail
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_audit_trail';

-- 5. Check if log_leave_request_action function exists and is correct
SELECT proname, pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE proname = 'log_leave_request_action';

-- 6. Test if we can query leave_requests (this should work)
SELECT id, user_id, leave_type, status, approved_by, approved_by_name
FROM leave_requests
WHERE id = '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f';

-- 7. If the above query returns no rows, the record might not exist
-- Check total count of leave_requests
SELECT COUNT(*) as total_leave_requests
FROM leave_requests;

-- 8. Check recent leave_requests to see if data exists
SELECT id, user_id, leave_type, status, created_at
FROM leave_requests
ORDER BY created_at DESC
LIMIT 5;

