-- ===================================================
-- TIS LeaveMate - Debug Diagnostic Script
-- ใช้สำหรับตรวจสอบปัญหา database และ RLS policies
-- ===================================================

-- 1. ตรวจสอบ Tables และ Structure
-- ===================================================

SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail')
ORDER BY table_name;

-- 2. ตรวจสอบ RLS Status
-- ===================================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- 3. ตรวจสอบ RLS Policies
-- ===================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail')
ORDER BY tablename, policyname;

-- 4. ตรวจสอบ Current User (run หลังจาก authenticate)
-- ===================================================

-- แทนที่ 'your-user-id-here' ด้วย user ID จริง
-- SELECT auth.uid() as current_auth_user;

-- 5. ตรวจสอบ Data Permissions
-- ===================================================

-- Test INSERT permission (จะ fail ถ้า RLS block)
-- แทนที่ 'your-user-id-here' ด้วย user ID จริง
/*
INSERT INTO leave_requests (
  user_id,
  leave_type,
  selected_dates,
  days,
  reason,
  status
) VALUES (
  'your-user-id-here',
  'Personal Leave',
  '["2024-12-25T00:00:00.000Z"]',
  1,
  'Test from SQL',
  'pending'
);
*/

-- Test SELECT permission
-- แทนที่ 'your-user-id-here' ด้วย user ID จริง
/*
SELECT * FROM leave_requests
WHERE user_id = 'your-user-id-here'
ORDER BY submitted_at DESC;
*/

-- 6. ตรวจสอบ Auth Users
-- ===================================================

SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 7. ตรวจสอบ Profiles
-- ===================================================

SELECT
  id,
  email,
  full_name,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 8. ตรวจสอบ Leave Requests
-- ===================================================

SELECT
  lr.id,
  lr.user_id,
  lr.leave_type,
  lr.days,
  lr.status,
  lr.submitted_at,
  p.email,
  p.full_name
FROM leave_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
ORDER BY lr.submitted_at DESC
LIMIT 10;

-- 9. ตรวจสอบ Audit Trail
-- ===================================================

SELECT
  lat.id,
  lat.leave_request_id,
  lat.action,
  lat.new_status,
  lat.created_at,
  p.email as performed_by_email
FROM leave_audit_trail lat
LEFT JOIN profiles p ON lat.performed_by = p.id
ORDER BY lat.created_at DESC
LIMIT 10;

-- 10. Test RLS Bypass (ใช้ service role ถ้าจำเป็น)
-- ===================================================

-- ถ้าต้องการ bypass RLS เพื่อ test ให้ใช้ service role key แทน anon key
-- หรือ temporarily disable RLS:

-- ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_audit_trail DISABLE ROW LEVEL SECURITY;

-- แล้ว run tests อีกครั้ง จากนั้น enable กลับ:
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_audit_trail ENABLE ROW LEVEL SECURITY;

-- 11. ตรวจสอบ Functions และ Triggers
-- ===================================================

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 12. ตรวจสอบ Function Permissions
-- ===================================================

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'log_leave_request_action', 'handle_new_user', 'initialize_leave_balances');

-- 13. Performance และ Error Logs
-- ===================================================

-- ตรวจสอบ slow queries (ถ้ามี pg_stat_statements)
-- SELECT query, calls, total_time, mean_time FROM pg_stat_statements
-- WHERE query LIKE '%leave_requests%'
-- ORDER BY mean_time DESC LIMIT 5;

-- 14. Clean Up Test Data (ถ้าต้องการ)
-- ===================================================

-- DELETE FROM leave_audit_trail WHERE leave_request_id IN (
--   SELECT id FROM leave_requests WHERE reason = 'Test from SQL'
-- );
-- DELETE FROM leave_requests WHERE reason = 'Test from SQL';

-- ===================================================
-- USAGE INSTRUCTIONS
-- ===================================================

/*
วิธีใช้ script นี้:

1. Copy และ paste queries ที่ต้องการ run ใน Supabase SQL Editor
2. สำหรับ queries ที่มี 'your-user-id-here' ให้แทนที่ด้วย user ID จริง
3. ตรวจสอบผลลัพธ์และ error messages
4. ถ้าพบปัญหา RLS ให้ temporarily disable RLS เพื่อ test
5. ตรวจสอบ console logs ใน application ควบคู่กัน

ปัญหาที่พบบ่อย:
- RLS policies ถูกต้อง แต่ user ไม่ authenticated
- auth.uid() ไม่ตรงกับ user_id ใน request
- Session expired แต่ application ไม่รู้
- Database connection issues
- Network timeout หรือ CORS issues
*/
