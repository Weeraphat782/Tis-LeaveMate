-- Test data for half-day leave functionality
-- Insert sample half-day leave requests for testing

-- Example: Half-day morning leave
INSERT INTO leave_requests (
  user_id,
  leave_type,
  selected_dates,
  days,
  reason,
  status,
  submitted_at,
  is_half_day,
  half_day_period
) VALUES (
  'your-user-id-here', -- Replace with actual user ID
  'Personal Leave',
  '["2025-01-15"]',
  1,
  'Doctor appointment in the morning',
  'approved',
  NOW(),
  true,
  'morning'
);

-- Example: Half-day afternoon leave
INSERT INTO leave_requests (
  user_id,
  leave_type,
  selected_dates,
  days,
  reason,
  status,
  submitted_at,
  is_half_day,
  half_day_period
) VALUES (
  'your-user-id-here', -- Replace with actual user ID
  'Vacation Leave',
  '["2025-01-16"]',
  1,
  'Family time in the afternoon',
  'pending',
  NOW(),
  true,
  'afternoon'
);

-- Example: Full-day leave (normal)
INSERT INTO leave_requests (
  user_id,
  leave_type,
  selected_dates,
  days,
  reason,
  status,
  submitted_at,
  is_half_day,
  half_day_period
) VALUES (
  'your-user-id-here', -- Replace with actual user ID
  'Sick Leave',
  '["2025-01-17"]',
  1,
  'Feeling unwell',
  'approved',
  NOW(),
  false,
  NULL
);
