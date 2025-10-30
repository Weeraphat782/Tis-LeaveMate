-- ===================================================
-- TIS LeaveMate - Database Setup Script
-- สคริปต์สำหรับติดตั้งฐานข้อมูลอย่างครบถ้วน
-- ===================================================

-- วิธีใช้งาน:
-- 1. เข้า Supabase Dashboard -> SQL Editor
-- 2. Copy และ paste เนื้อหาจาก tis-leave-management-schema.sql
-- 3. Run script
-- 4. ตรวจสอบว่า tables และ functions ถูกสร้างแล้ว
-- 5. ทดสอบการสร้าง user ใหม่

-- ===================================================
-- ตรวจสอบการติดตั้ง
-- ===================================================

-- ตรวจสอบ tables
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail')
ORDER BY table_name;

-- ตรวจสอบ RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- ตรวจสอบ policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail')
ORDER BY tablename, policyname;

-- ตรวจสอบ triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('leave_requests', 'profiles', 'leave_balances', 'auth.users')
ORDER BY event_object_table, trigger_name;

-- ตรวจสอบ functions
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'log_leave_request_action', 'handle_new_user', 'initialize_leave_balances')
ORDER BY routine_name;

-- ===================================================
-- ทดสอบระบบ
-- ===================================================

-- 1. สร้าง user ทดสอบใน Authentication -> Users
-- 2. ตรวจสอบว่า profile และ leave_balances ถูกสร้างอัตโนมัติ

-- ตรวจสอบ user ใหม่
SELECT
  u.id,
  u.email,
  u.created_at as user_created,
  p.full_name,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- ตรวจสอบ leave balances ของ user ใหม่
SELECT
  lb.user_id,
  p.full_name,
  lb.leave_type,
  lb.total_days,
  lb.used_days,
  lb.remaining_days
FROM leave_balances lb
JOIN profiles p ON lb.user_id = p.id
ORDER BY p.created_at DESC, lb.leave_type;

-- ===================================================
-- ทดสอบการทำงาน
-- ===================================================

-- ทดสอบการสร้าง leave request (ต้องมี user_id จริง)
-- แทนที่ 'your-user-id-here' ด้วย UUID จริงจาก auth.users

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
  'Test leave request',
  'pending'
);
*/

-- ตรวจสอบว่า leave request ถูกสร้าง
SELECT
  lr.id,
  lr.leave_type,
  lr.selected_dates,
  lr.days,
  lr.reason,
  lr.status,
  lr.submitted_at,
  p.full_name as user_name
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
ORDER BY lr.submitted_at DESC
LIMIT 5;

-- ตรวจสอบ audit trail
SELECT
  lat.created_at,
  lat.action,
  lat.new_status,
  lat.notes
FROM leave_audit_trail lat
ORDER BY lat.created_at DESC
LIMIT 5;

-- ===================================================
-- Troubleshooting
-- ===================================================

-- ถ้ามีปัญหา RLS policies
/*
-- ตรวจสอบ error จากการ query
-- อาจต้องปรับ policies ให้ถูกต้อง

-- ดู error log ใน Supabase Dashboard -> Logs -> Database
*/

-- ถ้า trigger ไม่ทำงาน
/*
-- ตรวจสอบว่า triggers ถูกสร้างแล้ว
SELECT * FROM pg_trigger WHERE tgname LIKE '%leave%';

-- ตรวจสอบ function permissions
SELECT * FROM information_schema.routine_privileges
WHERE routine_name IN ('handle_new_user', 'initialize_leave_balances');
*/

-- ถ้าไม่สามารถ insert ข้อมูล
/*
-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies WHERE tablename = 'leave_requests';

-- ทดสอบด้วย service role (bypass RLS)
-- ใน Supabase Dashboard -> API -> service_role key
*/

-- ===================================================
-- Maintenance Queries
-- ===================================================

-- อัพเดท leave balances สำหรับปีใหม่
/*
-- สำหรับปี 2025 (run ในเดือนธันวาคม)
INSERT INTO leave_balances (user_id, leave_type, total_days, year)
SELECT
  user_id,
  leave_type,
  CASE
    WHEN leave_type = 'Personal Leave' THEN 3
    WHEN leave_type = 'Vacation Leave' THEN 7
    WHEN leave_type = 'Sick Leave' THEN 30
  END as total_days,
  2025 as year
FROM leave_balances
WHERE year = 2024
ON CONFLICT (user_id, leave_type, year) DO NOTHING;
*/

-- คำนวณ used_days จาก approved leave requests
/*
UPDATE leave_balances
SET used_days = (
  SELECT COALESCE(SUM(days), 0)
  FROM leave_requests
  WHERE user_id = leave_balances.user_id
    AND leave_type = leave_balances.leave_type
    AND status = 'approved'
    AND EXTRACT(YEAR FROM submitted_at) = leave_balances.year
)
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);
*/

-- ===================================================
-- Backup & Recovery
-- ===================================================

-- สร้าง backup script (run ใน SQL Editor)
/*
-- Export important data
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM profiles
  UNION ALL
  SELECT * FROM leave_requests
  UNION ALL
  SELECT * FROM leave_balances
  UNION ALL
  SELECT * FROM leave_audit_trail
) t;
*/

-- ===================================================
-- Performance Monitoring
-- ===================================================

-- ตรวจสอบ query performance
/*
-- Slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%leave_requests%'
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- ===================================================
-- SETUP COMPLETE CHECKLIST
-- ===================================================

/*
✅ ติดตั้ง extensions (uuid-ossp)
✅ สร้าง tables (leave_requests, profiles, leave_balances, leave_audit_trail)
✅ สร้าง functions (update_updated_at_column, log_leave_request_action, etc.)
✅ สร้าง triggers (อัตโนมัติ update และ audit)
✅ Enable RLS บนทุกตาราง
✅ สร้าง policies สำหรับการเข้าถึงข้อมูล
✅ สร้าง indexes สำหรับประสิทธิภาพ
✅ ทดสอบการสร้าง user ใหม่
✅ ทดสอบการสร้าง leave request
✅ ตรวจสอบ audit trail

ถ้าทุกอย่าง OK แล้ว ระบบพร้อมใช้งาน!
*/
