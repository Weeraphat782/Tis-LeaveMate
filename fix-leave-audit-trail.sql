-- Fix leave_audit_trail.performed_by column type
-- Change from UUID to TEXT to match approved_by changes

-- 1. Drop the foreign key constraint first
ALTER TABLE leave_audit_trail DROP CONSTRAINT IF EXISTS leave_audit_trail_performed_by_fkey;

-- 2. Change performed_by column from UUID to TEXT
ALTER TABLE leave_audit_trail ALTER COLUMN performed_by TYPE TEXT;

-- 3. Update existing records if any (convert UUID to email)
-- This will help with existing audit trail records
UPDATE leave_audit_trail
SET performed_by_email = performed_by
WHERE performed_by IS NOT NULL AND performed_by_email IS NULL;

-- 4. Verify the column type changed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_audit_trail'
  AND column_name = 'performed_by';

-- 5. Check existing audit trail records
SELECT id, performed_by, performed_by_email, performed_by_name
FROM leave_audit_trail
ORDER BY created_at DESC
LIMIT 5;

