-- Check for approved leave requests in database
-- This is why calendar might not show any leave requests

-- 1. Count total leave requests by status
SELECT status, COUNT(*) as count
FROM leave_requests
GROUP BY status;

-- 2. Show all approved leave requests
SELECT id, user_id, leave_type, selected_dates, days, reason, status,
       approved_at, approved_by, approved_by_name
FROM leave_requests
WHERE status = 'approved'
ORDER BY approved_at DESC;

-- 3. Show recent leave requests (all statuses)
SELECT id, user_id, leave_type, selected_dates, days, reason, status,
       submitted_at, approved_at, approved_by
FROM leave_requests
ORDER BY submitted_at DESC
LIMIT 10;

-- 4. If no approved requests, approve one manually for testing
-- (Replace 'your-leave-request-id' with actual ID from above query)
-- UPDATE leave_requests
-- SET status = 'approved',
--     approved_at = NOW(),
--     approved_by = 'admin@example.com',
--     approved_by_name = 'Admin'
-- WHERE id = 'your-leave-request-id';

