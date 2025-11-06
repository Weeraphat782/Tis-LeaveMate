-- Add half-day support to leave_requests table
-- Migration script to add is_half_day and half_day_period columns

ALTER TABLE leave_requests
ADD COLUMN is_half_day BOOLEAN DEFAULT false,
ADD COLUMN half_day_period TEXT;

-- Add constraint to ensure half_day_period is only set when is_half_day is true
-- and only allows 'morning' or 'afternoon' values
ALTER TABLE leave_requests
ADD CONSTRAINT check_half_day_period
CHECK (
  (is_half_day = false AND half_day_period IS NULL) OR
  (is_half_day = true AND half_day_period IN ('morning', 'afternoon'))
);

-- Update existing records to have is_half_day = false (they are all full-day by default)
UPDATE leave_requests
SET is_half_day = false
WHERE is_half_day IS NULL;

-- Make is_half_day NOT NULL after setting defaults
ALTER TABLE leave_requests
ALTER COLUMN is_half_day SET NOT NULL;
