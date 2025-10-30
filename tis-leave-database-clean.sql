-- ===================================================
-- TIS LeaveMate - Clean Database Schema
-- สร้างฐานข้อมูลใหม่ตั้งแต่ต้น
-- ===================================================

-- ลบ tables เก่าก่อน (ถ้ามี)
DROP TABLE IF EXISTS leave_audit_trail CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ลบ functions เก่า (ถ้ามี)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS log_leave_request_action() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS initialize_leave_balances() CASCADE;

-- ลบ triggers เก่า (ถ้ามี)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
DROP TRIGGER IF EXISTS log_leave_request_actions ON leave_requests;

-- ===================================================
-- 1. สร้าง Tables
-- ===================================================

-- Profiles table (extends auth.users)
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

-- Audit trail table
CREATE TABLE leave_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'rejected')),
  previous_status TEXT CHECK (previous_status IN ('pending', 'approved', 'rejected')),
  new_status TEXT CHECK (new_status IN ('pending', 'approved', 'rejected')),
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- 2. สร้าง Functions
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
-- 3. สร้าง Triggers
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
-- 4. สร้าง Indexes
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted_at ON leave_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);

-- ===================================================
-- 5. Enable Row Level Security
-- ===================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit_trail ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- 6. สร้าง RLS Policies (แบบปลอดภัย)
-- ===================================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Leave requests policies
CREATE POLICY "Users can view all leave requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert own leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending leave requests" ON leave_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can approve/reject leave requests" ON leave_requests FOR UPDATE USING (true);
CREATE POLICY "Users can delete own pending leave requests" ON leave_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Leave balances policies
CREATE POLICY "Users can view own leave balances" ON leave_balances FOR SELECT USING (auth.uid() = user_id);

-- Audit trail policies
CREATE POLICY "Users can view audit trail" ON leave_audit_trail FOR SELECT USING (true);

-- ===================================================
-- SETUP COMPLETE
-- ===================================================

-- หลังจาก run script นี้แล้ว:
-- 1. ตรวจสอบ tables ถูกสร้างแล้ว
-- 2. Test การสร้าง user ใหม่ (ควรมี profile และ leave balances อัตโนมัติ)
-- 3. Test การ insert leave request

/*
TEST QUERIES:

-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Test insert (ควรทำงาน)
INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason)
VALUES ('your-user-id', 'Personal Leave', '["2024-12-25T00:00:00.000Z"]', 1, 'Test');
*/
