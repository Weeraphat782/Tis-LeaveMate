-- Debug 404 error for leave_requests PATCH
-- Replace '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f' with the actual ID from error

-- 1. Check if the record exists
SELECT id, user_id, leave_type, status, approved_by, approved_by_name
FROM leave_requests
WHERE id = '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f';

-- 2. Check RLS policies for leave_requests
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE tablename = 'leave_requests';

-- 3. Check current user session (run this in your app to see what auth.uid() returns)
-- This will help determine if RLS is blocking the update

-- 4. Test the update query manually
-- First, check if you can select the record
SELECT *
FROM leave_requests
WHERE id = '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f';

-- 5. Check if the user_id in the record matches the current user
-- Replace 'current_user_id_here' with the actual user ID from your session
SELECT id, user_id, status
FROM leave_requests
WHERE id = '8363e1a5-fddd-4a5c-9328-4f2ebb095a3f'
  AND user_id = 'current_user_id_here'; -- Replace with actual user ID

-- 6. Check if there are any foreign key issues
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  conkey as constrained_columns,
  confkey as referenced_columns
FROM pg_constraint
WHERE conrelid = 'leave_requests'::regclass
  AND contype = 'f';

-- 7. Check if approved_by column is TEXT (should be after migration)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_requests'
  AND column_name = 'approved_by';

