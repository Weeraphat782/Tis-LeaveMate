-- Setup approver_emails table for TIS Leave Management
-- This table allows you to specify which email addresses can approve/reject leave requests

-- Create approver_emails table
CREATE TABLE IF NOT EXISTS approver_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE approver_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approver_emails table
-- Allow authenticated users to view approver_emails (for permission checking)
CREATE POLICY "Authenticated users can view approver emails" ON approver_emails
  FOR SELECT USING (auth.role() = 'authenticated'::text);

-- Allow authenticated users to insert approver_emails (for admin setup)
CREATE POLICY "Authenticated users can manage approver emails" ON approver_emails
  FOR ALL USING (auth.role() = 'authenticated'::text);

-- Update leave_requests RLS policy to check approver_emails table
-- Drop the old policy that allowed everyone to approve
DROP POLICY IF EXISTS "Users can approve/reject leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update leave requests" ON leave_requests;

-- Create new policy that checks approver_emails table
CREATE POLICY "Authorized approvers can update leave requests" ON leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM approver_emails ae
      WHERE ae.email = auth.jwt() ->> 'email'
      AND ae.can_approve = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approver_emails_email ON approver_emails(email);
CREATE INDEX IF NOT EXISTS idx_approver_emails_can_approve ON approver_emails(can_approve);

-- Insert sample approver emails (CHANGE THESE TO YOUR ACTUAL APPROVER EMAILS)
-- Remove or modify these INSERT statements with your real approver emails
INSERT INTO approver_emails (email, can_approve, created_by, notes) VALUES
  ('approver1@company.com', true, 'system', 'HR Manager'),
  ('approver2@company.com', true, 'system', 'Department Head'),
  ('manager@company.com', true, 'system', 'General Manager')
ON CONFLICT (email) DO NOTHING;

-- Verify the setup
SELECT
  'approver_emails table created' as status,
  COUNT(*) as approver_count
FROM approver_emails
WHERE can_approve = true;

-- Show current RLS policies for leave_requests
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies
WHERE tablename = 'leave_requests';
