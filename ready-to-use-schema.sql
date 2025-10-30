-- ===================================================
-- TIS LeaveMate - Ready to Use Schema
-- สำหรับ Supabase Project ใหม่ - Copy & Paste ได้เลย
-- ===================================================

-- 1. ตรวจสอบว่าเป็น project ใหม่ (ควรเห็น empty)
SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- ถ้ามี tables เก่า → ลบออกก่อน
-- DROP TABLE IF EXISTS leave_audit_trail CASCADE;
-- DROP TABLE IF EXISTS leave_balances CASCADE;
-- DROP TABLE IF EXISTS leave_requests CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ===================================================
-- 2. สร้าง Tables
-- ===================================================

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  department TEXT,
  position TEXT,
  employee_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave requests table
CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Personal Leave', 'Vacation Leave', 'Sick Leave')),
  selected_dates JSONB NOT NULL,
  days INTEGER NOT NULL CHECK (days > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave balances table
CREATE TABLE leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Personal Leave', 'Vacation Leave', 'Sick Leave')),
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days INTEGER NOT NULL DEFAULT 0,
  remaining_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, leave_type, year)
);

-- ===================================================
-- 3. สร้าง Functions
-- ===================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create profile automatically
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize leave balances
CREATE OR REPLACE FUNCTION initialize_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leave_balances (user_id, leave_type, total_days)
  VALUES
    (NEW.id, 'Personal Leave', 3),
    (NEW.id, 'Vacation Leave', 7),
    (NEW.id, 'Sick Leave', 30);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================
-- 4. สร้าง Triggers
-- ===================================================

-- Auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-initialize leave balances when profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_leave_balances();

-- Auto-update updated_at columns
CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
    BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- 5. สร้าง Indexes
-- ===================================================

CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_submitted_at ON leave_requests(submitted_at DESC);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_leave_balances_user_id ON leave_balances(user_id);

-- ===================================================
-- 6. Enable Row Level Security
-- ===================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- 7. สร้าง RLS Policies
-- ===================================================

-- Profiles policies
CREATE POLICY "users_can_view_all_profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "users_can_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_can_insert_own_profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Leave requests policies
CREATE POLICY "users_can_view_all_leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "users_can_insert_own_leave_requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_can_update_own_pending_requests" ON leave_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "users_can_approve_reject_requests" ON leave_requests FOR UPDATE USING (true);
CREATE POLICY "users_can_delete_own_pending_requests" ON leave_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Leave balances policies
CREATE POLICY "users_can_view_own_leave_balances" ON leave_balances FOR SELECT USING (auth.uid() = user_id);

-- ===================================================
-- 8. ตรวจสอบการติดตั้ง
-- ===================================================

-- ตรวจสอบ tables
SELECT
  'Tables created:' as info,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'leave_requests', 'leave_balances');

-- ตรวจสอบ RLS
SELECT
  'RLS enabled:' as info,
  COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'leave_requests', 'leave_balances')
  AND rowsecurity = true;

-- ตรวจสอบ policies
SELECT
  'Policies created:' as info,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public';

-- ===================================================
-- 9. Test Data (Optional)
-- ===================================================

-- ถ้าต้องการ test สามารถ uncomment และแก้ไข user_id ก่อน run

/*
-- Insert test profile (แทนที่ 'test-user-id' ด้วย UUID จริง)
INSERT INTO profiles (id, email, full_name, department, position)
VALUES ('test-user-id', 'test@example.com', 'Test User', 'IT', 'Developer');

-- Insert test leave request
INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason)
VALUES ('test-user-id', 'Personal Leave', '["2024-12-25T00:00:00.000Z"]', 1, 'Test leave request');
*/

-- ===================================================
-- SETUP COMPLETE! 🎉
-- ===================================================

/*
หลังจาก run เสร็จ:

1. ✅ Tables: profiles, leave_requests, leave_balances
2. ✅ RLS: Enabled บนทุก table
3. ✅ Policies: ถูกต้องสำหรับทุก operation
4. ✅ Triggers: ทำงานอัตโนมัติ
5. ✅ Functions: พร้อมใช้งาน

Test โดย:
- Sign up user ใหม่ → ควรมี profile และ leave balances อัตโนมัติ
- Submit leave request → ควรบันทึกได้ปกติ
- View data → ควรแสดงได้ปกติ

ถ้ามีปัญหา → ตรวจสอบ console logs และ database
*/
