-- ===================================================
-- EMERGENCY DATABASE FIX - Run Step by Step
-- แก้ไขปัญหา database โดย run ทีละส่วน
-- ===================================================

-- STEP 1: ตรวจสอบสถานะปัจจุบัน
SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- STEP 2: ลบทุกอย่าง (run ทีละบรรทัดถ้าจำเป็น)
DROP TABLE IF EXISTS leave_audit_trail CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- STEP 3: ตรวจสอบหลังลบ
SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- STEP 4: สร้าง profiles table (พื้นฐานที่สุด)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: ตรวจสอบ profiles table ถูกสร้าง
SELECT table_name FROM information_schema.tables WHERE table_name = 'profiles';

-- STEP 6: เพิ่ม foreign key reference (หลังจากสร้าง table แล้ว)
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 7: สร้าง leave_requests table
CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leave_type TEXT NOT NULL,
  selected_dates JSONB NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 8: ตรวจสอบ leave_requests table
SELECT table_name FROM information_schema.tables WHERE table_name = 'leave_requests';

-- STEP 9: เพิ่ม foreign key ให้ leave_requests
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 10: เพิ่ม CHECK constraints
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
CHECK (leave_type IN ('Personal Leave', 'Vacation Leave', 'Sick Leave'));

ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_days_check
CHECK (days > 0);

ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));

-- STEP 11: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- STEP 12: สร้าง basic policies
CREATE POLICY "basic_profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "basic_profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "basic_leave_requests_select" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "basic_leave_requests_insert" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "basic_leave_requests_delete" ON leave_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- STEP 13: ตรวจสอบ tables และ policies
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public';

-- STEP 14: TEST INSERT (หลังจากมี user แล้ว)
-- แทนที่ 'your-user-id' ด้วย user ID จริง
/*
INSERT INTO profiles (id, email, full_name)
VALUES ('your-user-id', 'test@example.com', 'Test User');

INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason)
VALUES ('your-user-id', 'Personal Leave', '["2024-12-25T00:00:00.000Z"]', 1, 'Test leave');
*/

-- STEP 15: ตรวจสอบข้อมูลหลัง insert
/*
SELECT * FROM profiles;
SELECT * FROM leave_requests;
*/
