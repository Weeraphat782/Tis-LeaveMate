-- ===================================================
-- TEST DIRECT INSERT (Bypass RLS temporarily)
-- เพื่อตรวจสอบว่าปัญหาอยู่ที่ RLS หรือ database
-- ===================================================

-- 1. Temporarily disable RLS to test
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;

-- 2. Test direct insert (ควรจะทำงานได้)
INSERT INTO leave_requests (
  user_id,
  leave_type,
  selected_dates,
  days,
  reason,
  status
) VALUES (
  '85f64d79-e27b-4cdc-828a-6d35c6dab5d2', -- แทนที่ด้วย user ID จริง
  'Vacation Leave',
  '["2025-10-21T17:00:00.000Z", "2025-10-22T17:00:00.000Z", "2025-10-23T17:00:00.000Z"]',
  3,
  'Test from SQL - RLS disabled',
  'pending'
) RETURNING *;

-- 3. Check if data was inserted
SELECT
  lr.id,
  lr.user_id,
  lr.leave_type,
  lr.days,
  lr.reason,
  lr.status,
  lr.submitted_at,
  p.email
FROM leave_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
WHERE lr.reason = 'Test from SQL - RLS disabled'
ORDER BY lr.submitted_at DESC;

-- 4. Re-enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- EXPECTED RESULTS:
-- ===================================================

-- ถ้า Step 2 สำเร็จ + Step 3 แสดงข้อมูล = ปัญหาอยู่ที่ RLS policies
-- ถ้า Step 2 ไม่สำเร็จ = ปัญหาอยู่ที่ database หรือ data format

-- ถ้าปัญหาอยู่ที่ RLS ให้ตรวจสอบ policies อีกครั้ง

-- ===================================================
-- CLEANUP TEST DATA
-- ===================================================

-- ลบข้อมูลทดสอบ
-- DELETE FROM leave_audit_trail WHERE leave_request_id IN (
--   SELECT id FROM leave_requests WHERE reason = 'Test from SQL - RLS disabled'
-- );
-- DELETE FROM leave_requests WHERE reason = 'Test from SQL - RLS disabled';
