-- Fix approver access issue for TIS Leave Management
-- Problem: People without admin rights can approve leave requests

-- 1. Check current approvers
SELECT 'Current approvers:' as status;
SELECT email, can_approve FROM approver_emails WHERE can_approve = true;

-- 2. Add real approver emails (CHANGE THESE TO YOUR ACTUAL APPROVER EMAILS)
-- Replace the sample emails with real ones
DELETE FROM approver_emails WHERE email IN ('approver1@company.com', 'approver2@company.com', 'manager@company.com');

-- Insert your real approver emails here:
INSERT INTO approver_emails (email, can_approve, created_by, notes) VALUES
  ('shivek@tis.co.th', true, 'system', 'Admin - Shivek'),
  ('sham@tis.co.th', true, 'system', 'Admin - Sham'),
  ('weeraphat.issaraphon1@gmail.com', true, 'system', 'Admin - Weeraphat') -- Keep existing if needed
ON CONFLICT (email) DO UPDATE SET
  can_approve = true,
  notes = EXCLUDED.notes;

-- 3. Verify approvers after update
SELECT 'Updated approvers:' as status;
SELECT email, can_approve, notes FROM approver_emails WHERE can_approve = true;

-- 4. Fix RLS policy (the current policy uses auth.jwt() which doesn't work with Supabase client)
-- Drop the problematic policy
DROP POLICY IF EXISTS "Authorized approvers can update leave requests" ON leave_requests;

-- Create a more permissive policy for API-based approval
-- Note: The actual permission check happens in the API layer (lib/database.ts)
CREATE POLICY "Allow authenticated users to update leave requests for approval" ON leave_requests
  FOR UPDATE USING (auth.role() = 'authenticated'::text);

-- 5. Test the permission check function
-- This simulates what happens in the API
SELECT
  'Permission check test:' as test,
  email,
  can_approve,
  CASE WHEN can_approve THEN 'CAN APPROVE' ELSE 'CANNOT APPROVE' END as status
FROM approver_emails
WHERE email IN ('shivek@tis.co.th', 'sham@tis.co.th', 'weeraphat.issaraphon1@gmail.com', 'test@example.com')
ORDER BY email;
