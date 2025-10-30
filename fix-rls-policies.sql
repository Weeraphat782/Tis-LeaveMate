-- ===================================================
-- FIX RLS POLICIES FOR LEAVE REQUESTS
-- แก้ไขปัญหา RLS policies ที่ conflict กัน
-- ===================================================

-- ตรวจสอบ policies ปัจจุบันก่อน
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies
WHERE tablename = 'leave_requests'
ORDER BY cmd, policyname;

-- ===================================================
-- ลบ policies ที่มีปัญหา
-- ===================================================

-- ลบ policy ที่ไม่ถูกต้อง (allow authenticated users)
DROP POLICY IF EXISTS "Allow authenticated users to insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Allow authenticated users to view leave requests" ON leave_requests;

-- ===================================================
-- ตรวจสอบ policies ที่เหลือ (ควรมีแค่ policies ที่ถูกต้อง)
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
WHERE tablename = 'leave_requests'
ORDER BY cmd, policyname;

-- ===================================================
-- Recreate policies ที่ถูกต้อง (ถ้าต้องการให้แน่ใจ)
-- ===================================================

-- ตรวจสอบและสร้าง policies ที่ถูกต้อง
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can approve/reject leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can delete own pending leave requests" ON leave_requests;

-- Recreate policies ที่ถูกต้อง
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

-- ===================================================
-- ตรวจสอบผลลัพธ์หลังการแก้ไข
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
WHERE tablename = 'leave_requests'
ORDER BY cmd, policyname;

-- ===================================================
-- Test policies หลังการแก้ไข
-- ===================================================

-- Test 1: ตรวจสอบจำนวน policies ต่อ operation
SELECT
  cmd as operation,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'leave_requests'
GROUP BY cmd
ORDER BY cmd;

-- Test 2: ตรวจสอบว่าไม่มี conflicting policies
SELECT
  cmd as operation,
  policyname,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies
WHERE tablename = 'leave_requests'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ===================================================
-- CLEANUP (ลบไฟล์นี้หลังใช้งาน)
-- ===================================================

-- หลังจาก run เสร็จแล้วให้ลบไฟล์นี้
-- เพราะมี sensitive operations

/*
INSTRUCTIONS:
1. Copy และ paste script นี้ไป run ใน Supabase SQL Editor
2. ตรวจสอบผลลัพธ์หลังการแก้ไข
3. Test การ insert/ select ข้อมูล
4. ถ้าทำงานได้ปกติแล้ว ลบไฟล์นี้
*/
