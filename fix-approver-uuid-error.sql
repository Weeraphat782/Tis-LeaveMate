-- Fix approved_by column type from uuid to text
-- Since currentUser.id appears to be email instead of UUID in production

-- Step 1: Create backup of existing data (if any)
CREATE TABLE IF NOT EXISTS leave_requests_backup AS
SELECT * FROM leave_requests;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_approved_by_fkey;

-- Step 3: Change column type from uuid to text
ALTER TABLE leave_requests ALTER COLUMN approved_by TYPE text;

-- Step 4: Update RLS policies if needed (no changes needed for text type)

-- Step 5: Test the fix
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'leave_requests' AND column_name = 'approved_by';

-- Optional: Clean up backup after confirming fix works
-- DROP TABLE IF EXISTS leave_requests_backup;
