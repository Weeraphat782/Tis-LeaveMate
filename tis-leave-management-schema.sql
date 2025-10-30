-- ===================================================
-- TIS LeaveMate Database Schema
-- ระบบจัดการการลาของพนักงาน (Leave Management System)
-- ===================================================

-- ===================================================
-- 1. ENABLE NECESSARY EXTENSIONS
-- ===================================================

-- Enable UUID extension (ถ้ายังไม่ได้ enable)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security (ถ้ายังไม่ได้ enable)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ===================================================
-- 2. CREATE ENUM TYPES (ถ้าต้องการ)
-- ===================================================

-- สร้าง enum สำหรับ leave_type (ถ้าต้องการให้ database จัดการ constraint)
DO $$ BEGIN
    CREATE TYPE leave_type_enum AS ENUM ('Personal Leave', 'Vacation Leave', 'Sick Leave');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- สร้าง enum สำหรับ leave_status
DO $$ BEGIN
    CREATE TYPE leave_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- สร้าง enum สำหรับ audit_action
DO $$ BEGIN
    CREATE TYPE audit_action_enum AS ENUM ('created', 'updated', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================================================
-- 3. CREATE TABLES
-- ===================================================

-- 3.1 leave_requests table
-- ตารางเก็บคำขอการลา
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Personal Leave', 'Vacation Leave', 'Sick Leave')),
  selected_dates JSONB NOT NULL, -- Array of ISO date strings
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

-- 3.2 profiles table
-- ตารางเก็บข้อมูลโปรไฟล์ผู้ใช้ (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  department TEXT,
  position TEXT,
  employee_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3 leave_balances table
-- ตารางเก็บยอดการลาคงเหลือรายปี
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Personal Leave', 'Vacation Leave', 'Sick Leave')),
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days INTEGER NOT NULL DEFAULT 0,
  remaining_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, leave_type, year)
);

-- 3.4 leave_audit_trail table
-- ตารางเก็บประวัติการดำเนินการ (audit trail)
CREATE TABLE IF NOT EXISTS leave_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'rejected')),
  previous_status TEXT CHECK (previous_status IN ('pending', 'approved', 'rejected')),
  new_status TEXT CHECK (new_status IN ('pending', 'approved', 'rejected')),
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  performed_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- 4. CREATE FUNCTIONS
-- ===================================================

-- 4.1 Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4.2 Function to log leave request actions to audit trail
CREATE OR REPLACE FUNCTION log_leave_request_action()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    previous_status TEXT;
BEGIN
    -- Determine action type based on operation
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        previous_status := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if status changed
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'approved' THEN
                action_type := 'approved';
            ELSIF NEW.status = 'rejected' THEN
                action_type := 'rejected';
            ELSE
                action_type := 'updated';
            END IF;
            previous_status := OLD.status;
        ELSE
            action_type := 'updated';
            previous_status := OLD.status;
        END IF;
    END IF;

    -- Insert audit trail record
    INSERT INTO leave_audit_trail (
        leave_request_id,
        action,
        previous_status,
        new_status,
        performed_by,
        performed_by_name,
        performed_by_email,
        notes
    ) VALUES (
        NEW.id,
        action_type,
        previous_status,
        NEW.status,
        NEW.approved_by,
        NEW.approved_by_name,
        (SELECT email FROM profiles WHERE id = NEW.approved_by),
        CASE
            WHEN action_type IN ('approved', 'rejected') THEN 'Leave request ' || action_type || ' by ' || NEW.approved_by_name
            WHEN action_type = 'created' THEN 'Leave request created by ' || (SELECT full_name FROM profiles WHERE id = NEW.user_id)
            ELSE 'Leave request updated'
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Function to initialize leave balances for new users
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
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
-- 5. CREATE TRIGGERS
-- ===================================================

-- Drop existing triggers if they exist (drop all first, then recreate)
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
DROP TRIGGER IF EXISTS log_leave_request_actions ON leave_requests;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create triggers for updated_at
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for audit trail logging
CREATE TRIGGER log_leave_request_actions AFTER INSERT OR UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION log_leave_request_action();

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to initialize leave balances on profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

-- ===================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ===================================================

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit_trail ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- 7. DROP EXISTING POLICIES (IF EXISTS)
-- ===================================================

-- Drop leave_requests policies
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can approve/reject leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can delete own pending leave requests" ON leave_requests;

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop leave_balances policies
DROP POLICY IF EXISTS "Users can view own leave balances" ON leave_balances;

-- Drop audit trail policies
DROP POLICY IF EXISTS "Users can view audit trail for accessible leave requests" ON leave_audit_trail;

-- ===================================================
-- 8. CREATE ROW LEVEL SECURITY POLICIES
-- ===================================================

-- 8.1 leave_requests policies
-- Users can view all leave requests (for team collaboration)
CREATE POLICY "Users can view all leave requests" ON leave_requests
    FOR SELECT USING (true);

-- Users can insert their own leave requests
CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending leave requests
CREATE POLICY "Users can update own pending leave requests" ON leave_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Users can approve/reject leave requests (for managers)
-- Allow updating any leave request (permission checked in application layer)
CREATE POLICY "Users can approve/reject leave requests" ON leave_requests
    FOR UPDATE USING (true);

-- Users can delete their own pending leave requests
CREATE POLICY "Users can delete own pending leave requests" ON leave_requests
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- 8.2 profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true); -- Allow viewing all profiles for team features

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 8.3 leave_balances policies
CREATE POLICY "Users can view own leave balances" ON leave_balances
    FOR SELECT USING (auth.uid() = user_id);

-- 8.4 leave_audit_trail policies
CREATE POLICY "Users can view audit trail for accessible leave requests" ON leave_audit_trail
    FOR SELECT USING (true); -- Allow viewing audit trail for all accessible records

-- ===================================================
-- 9. CREATE INDEXES FOR BETTER PERFORMANCE
-- ===================================================

-- Indexes for leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted_at ON leave_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type ON leave_requests(leave_type);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Indexes for leave_balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON leave_balances(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- Indexes for leave_audit_trail
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_leave_request_id ON leave_audit_trail(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_performed_by ON leave_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_created_at ON leave_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_action ON leave_audit_trail(action);

-- ===================================================
-- 10. INSERT SAMPLE DATA (OPTIONAL)
-- ===================================================

-- Note: Sample data จะถูก insert อัตโนมัติเมื่อมี user ใหม่ signup
-- แต่ถ้าต้องการ insert ข้อมูลทดสอบ สามารถทำได้ดังนี้:

-- ตัวอย่างการ insert ข้อมูลทดสอบ (commented out)
-- ต้องมี user ใน auth.users ก่อนถึงจะ insert ได้

/*
-- ตัวอย่างข้อมูลทดสอบ (สำหรับการพัฒนา)
-- INSERT ข้อมูลเหล่านี้หลังจากสร้าง user ใน Supabase Auth แล้ว

-- 1. Insert sample profile (ต้องมี user_id จาก auth.users)
-- INSERT INTO profiles (id, email, full_name, department, position, employee_id)
-- VALUES ('user-uuid-here', 'john.doe@company.com', 'John Doe', 'IT', 'Software Developer', 'EMP001');

-- 2. Insert sample leave request
-- INSERT INTO leave_requests (user_id, leave_type, selected_dates, days, reason, status)
-- VALUES ('user-uuid-here', 'Personal Leave', '["2024-01-15T00:00:00.000Z"]', 1, 'Family emergency', 'pending');

-- 3. Leave balances จะถูกสร้างอัตโนมัติโดย trigger
*/

-- ===================================================
-- 11. USEFUL QUERIES FOR MONITORING
-- ===================================================

-- Query to check database setup status
/*
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
*/

-- ===================================================
-- SETUP COMPLETE
-- ===================================================

-- หลังจาก run SQL นี้แล้ว:
-- 1. ตรวจสอบว่า tables ถูกสร้างแล้ว
-- 2. ตรวจสอบว่า RLS policies ถูกตั้งค่าแล้ว
-- 3. ตรวจสอบว่า triggers ทำงานได้
-- 4. ทดสอบการสร้าง user ใหม่เพื่อดูว่า profiles และ leave_balances ถูกสร้างอัตโนมัติ
