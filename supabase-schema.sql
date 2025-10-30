-- TIS LeaveMate Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create leave_requests table
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

-- Create profiles table (extends auth.users)
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

-- Create leave_balances table for tracking annual leave entitlements
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

-- Create leave_audit_trail table for tracking approval/rejection history
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to log leave request actions to audit trail
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
DROP TRIGGER IF EXISTS log_leave_request_actions ON leave_requests;

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

-- Enable Row Level Security (RLS)
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit_trail ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (drop all first, then recreate)
DROP POLICY IF EXISTS "Users can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can approve/reject leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can delete own pending leave requests" ON leave_requests;

-- Also drop audit trail policies
DROP POLICY IF EXISTS "Users can view audit trail for accessible leave requests" ON leave_audit_trail;

-- RLS Policies for leave_requests
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own leave balances" ON leave_balances;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true); -- Allow viewing all profiles for team features

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for leave_balances
CREATE POLICY "Users can view own leave balances" ON leave_balances
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for leave_audit_trail
CREATE POLICY "Users can view audit trail for accessible leave requests" ON leave_audit_trail
    FOR SELECT USING (true); -- Allow viewing audit trail for all accessible records

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to initialize leave balances for new users
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


-- Create trigger to initialize leave balances on profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

-- Create indexes for better performance (these are idempotent)
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted_at ON leave_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON leave_balances(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_leave_request_id ON leave_audit_trail(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_performed_by ON leave_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_leave_audit_trail_created_at ON leave_audit_trail(created_at DESC);
