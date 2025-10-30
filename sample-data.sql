-- ===================================================
-- TIS LeaveMate - Sample Data
-- ข้อมูลตัวอย่างสำหรับการทดสอบระบบ
-- ===================================================

-- หมายเหตุ: ข้อมูลตัวอย่างนี้ใช้สำหรับการพัฒนาและทดสอบ
-- ในโปรดักชั่น ควรสร้างข้อมูลผ่าน UI หรือ API เท่านั้น

-- ===================================================
-- 1. สร้าง User ใน Supabase Auth ก่อน
-- ===================================================

-- ต้องสร้าง user ใน Supabase Dashboard -> Authentication -> Users ก่อน
-- หรือใช้ SQL ในการสร้าง (แต่ไม่แนะนำสำหรับโปรดักชั่น)

-- ตัวอย่าง users ที่จะใช้ในข้อมูลทดสอบ:
-- 1. admin@tis.com (Admin/Manager)
-- 2. john.doe@tis.com (Employee)
-- 3. jane.smith@tis.com (Employee)
-- 4. bob.wilson@tis.com (Employee)

-- ===================================================
-- 2. INSERT SAMPLE PROFILES
-- ===================================================

-- หมายเหตุ: ในระบบจริง profiles จะถูกสร้างอัตโนมัติโดย trigger
-- แต่สำหรับข้อมูลทดสอบ เราจะ insert เอง

-- แทนที่ 'user-uuid-admin', 'user-uuid-john', etc. ด้วย UUID จริงจาก auth.users

/*
INSERT INTO profiles (id, email, full_name, department, position, employee_id)
VALUES
  ('user-uuid-admin', 'admin@tis.com', 'Admin User', 'Management', 'Manager', 'ADM001'),
  ('user-uuid-john', 'john.doe@tis.com', 'John Doe', 'IT', 'Software Developer', 'EMP001'),
  ('user-uuid-jane', 'jane.smith@tis.com', 'Jane Smith', 'HR', 'HR Specialist', 'EMP002'),
  ('user-uuid-bob', 'bob.wilson@tis.com', 'Bob Wilson', 'Finance', 'Accountant', 'EMP003');
*/

-- ===================================================
-- 3. LEAVE BALANCES จะถูกสร้างอัตโนมัติ
-- ===================================================

-- เมื่อ insert profiles ข้างบน leave_balances จะถูกสร้างอัตโนมัติโดย trigger:
-- - Personal Leave: 3 วัน
-- - Vacation Leave: 7 วัน
-- - Sick Leave: 30 วัน

-- ===================================================
-- 4. INSERT SAMPLE LEAVE REQUESTS
-- ===================================================

-- ตัวอย่างคำขอการลาต่างๆ

/*
-- Pending leave requests
INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status)
VALUES
  ('user-uuid-john', 'Personal Leave', '["2024-12-25T00:00:00.000Z"]', 1, 'Family gathering', 'pending'),
  ('user-uuid-jane', 'Vacation Leave', '["2024-12-20T00:00:00.000Z", "2024-12-21T00:00:00.000Z"]', 2, 'Christmas holiday', 'pending'),
  ('user-uuid-bob', 'Sick Leave', '["2024-12-15T00:00:00.000Z"]', 1, 'Doctor appointment', 'pending');

-- Approved leave requests
INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status, approved_at, approved_by, approved_by_name)
VALUES
  ('user-uuid-john', 'Vacation Leave', '["2024-11-01T00:00:00.000Z", "2024-11-02T00:00:00.000Z", "2024-11-03T00:00:00.000Z"]', 3, 'Summer vacation', 'approved', '2024-10-15T09:00:00.000Z', 'user-uuid-admin', 'Admin User'),
  ('user-uuid-jane', 'Personal Leave', '["2024-10-05T00:00:00.000Z"]', 1, 'Personal matter', 'approved', '2024-09-28T14:30:00.000Z', 'user-uuid-admin', 'Admin User');

-- Rejected leave request
INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status, approved_at, approved_by, approved_by_name)
VALUES
  ('user-uuid-bob', 'Vacation Leave', '["2024-12-01T00:00:00.000Z", "2024-12-02T00:00:00.000Z", "2024-12-03T00:00:00.000Z", "2024-12-04T00:00:00.000Z", "2024-12-05T00:00:00.000Z"]', 5, 'Extended vacation', 'rejected', '2024-11-20T11:15:00.000Z', 'user-uuid-admin', 'Admin User');
*/

-- ===================================================
-- 5. AUDIT TRAIL จะถูกสร้างอัตโนมัติ
-- ===================================================

-- เมื่อ insert leave_requests ข้างบน audit_trail จะถูกสร้างอัตโนมัติโดย trigger

-- ===================================================
-- 6. USEFUL QUERIES FOR TESTING
-- ===================================================

-- ตรวจสอบข้อมูลทั้งหมด
/*
-- Check all profiles
SELECT id, email, full_name, department, position, created_at
FROM profiles
ORDER BY created_at DESC;

-- Check all leave requests with user info
SELECT
  lr.id,
  lr.leave_type,
  lr.selected_dates,
  lr.days,
  lr.reason,
  lr.status,
  lr.submitted_at,
  lr.approved_at,
  p.full_name as user_name,
  p.email as user_email
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
ORDER BY lr.submitted_at DESC;

-- Check leave balances
SELECT
  lb.user_id,
  p.full_name,
  lb.leave_type,
  lb.total_days,
  lb.used_days,
  lb.remaining_days,
  lb.year
FROM leave_balances lb
JOIN profiles p ON lb.user_id = p.id
ORDER BY p.full_name, lb.leave_type;

-- Check audit trail
SELECT
  lat.created_at,
  lat.action,
  lat.previous_status,
  lat.new_status,
  p1.full_name as performed_by,
  lat.notes
FROM leave_audit_trail lat
LEFT JOIN profiles p1 ON lat.performed_by = p1.id
ORDER BY lat.created_at DESC;

-- Check user leave statistics (simulated)
SELECT
  p.full_name,
  lr.leave_type,
  COUNT(*) as total_requests,
  SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END) as approved_days,
  SUM(CASE WHEN lr.status = 'pending' THEN 1 ELSE 0 END) as pending_requests
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
GROUP BY p.full_name, lr.leave_type
ORDER BY p.full_name, lr.leave_type;
*/

-- ===================================================
-- 7. CLEANUP QUERIES (FOR TESTING)
-- ===================================================

-- ลบข้อมูลทดสอบทั้งหมด (ใช้สำหรับ reset การทดสอบ)
/*
-- Delete in correct order (respecting foreign keys)
DELETE FROM leave_audit_trail;
DELETE FROM leave_requests;
DELETE FROM leave_balances;
DELETE FROM profiles;

-- หรือ delete เฉพาะ user ที่ต้องการ
-- DELETE FROM leave_requests WHERE user_id = 'user-uuid-to-delete';
-- DELETE FROM leave_balances WHERE user_id = 'user-uuid-to-delete';
-- DELETE FROM profiles WHERE id = 'user-uuid-to-delete';
*/

-- ===================================================
-- 8. PERFORMANCE TESTING QUERIES
-- ===================================================

-- ทดสอบ query ที่ใช้ในระบบ
/*
-- Query used in getAllLeaveRequests()
SELECT
  lr.id,
  lr.user_id,
  lr.leave_type,
  lr.selected_dates,
  lr.days,
  lr.reason,
  lr.status,
  lr.submitted_at,
  lr.approved_at,
  lr.approved_by,
  lr.approved_by_name
FROM leave_requests lr
ORDER BY lr.submitted_at DESC
LIMIT 50;

-- Query used in getUserLeaveStats()
SELECT leave_type, days, status
FROM leave_requests
WHERE user_id = 'user-uuid-here';

-- Query used in getUserLeaveRequests()
SELECT *
FROM leave_requests
WHERE user_id = 'user-uuid-here'
ORDER BY submitted_at DESC;
*/
