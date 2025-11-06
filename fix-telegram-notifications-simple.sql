-- Simple fix for telegram_notifications references in database
-- Run this in Supabase SQL Editor to remove all references to telegram_notifications

-- 1. Drop telegram_notifications table if it exists
DROP TABLE IF EXISTS telegram_notifications CASCADE;

-- 2. Drop any functions that might reference telegram_notifications
-- (We'll recreate them safely)
DROP FUNCTION IF EXISTS log_leave_request_action() CASCADE;

-- 3. Drop any triggers that might reference telegram_notifications
DROP TRIGGER IF EXISTS log_leave_request_actions ON leave_requests;

-- 4. Recreate the log_leave_request_action function (clean version)
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
        action_type := 'updated';
        previous_status := OLD.status;
    END IF;

    -- Only log if status changed or it's a new record
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
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
            CASE
                WHEN TG_OP = 'UPDATE' THEN NEW.approved_by
                ELSE NULL
            END,
            CASE
                WHEN TG_OP = 'UPDATE' THEN NEW.approved_by_name
                ELSE NULL
            END,
            CASE
                WHEN TG_OP = 'INSERT' THEN (SELECT email FROM profiles WHERE id = NEW.user_id)
                WHEN TG_OP = 'UPDATE' THEN NEW.approved_by
                ELSE NULL
            END,
            CASE
                WHEN TG_OP = 'UPDATE' AND NEW.status = 'approved' THEN 'Leave request approved'
                WHEN TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN 'Leave request rejected'
                ELSE 'Leave request ' || action_type
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate the trigger
CREATE TRIGGER log_leave_request_actions
    AFTER INSERT OR UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_leave_request_action();

-- 6. Verify that telegram_notifications is completely gone
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'telegram_notifications';

-- 7. Check that the function was recreated successfully
SELECT proname, pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE proname = 'log_leave_request_action';

-- 8. Check that the trigger was recreated successfully
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'log_leave_request_actions';

