-- Fix telegram_notifications references in database
-- Run this in Supabase SQL Editor to remove all references to telegram_notifications

-- 1. Drop telegram_notifications table if it exists
DROP TABLE IF EXISTS telegram_notifications CASCADE;

-- 2. Find and drop any functions that reference telegram_notifications
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc
        WHERE pg_get_functiondef(oid) LIKE '%telegram_notifications%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.proname;
    END LOOP;
END $$;

-- 3. Find and drop any triggers that reference telegram_notifications
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT event_object_schema, event_object_table, trigger_name
        FROM information_schema.triggers
        WHERE action_statement LIKE '%telegram_notifications%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name ||
                ' ON ' || trigger_record.event_object_schema || '.' || trigger_record.event_object_table || ' CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- 4. Find and drop any views that reference telegram_notifications
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN
        SELECT schemaname, viewname
        FROM pg_views
        WHERE definition LIKE '%telegram_notifications%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.schemaname || '.' || view_record.viewname || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_record.viewname;
    END LOOP;
END $$;

-- 5. Find and drop any policies that reference telegram_notifications
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE qual LIKE '%telegram_notifications%'
           OR with_check LIKE '%telegram_notifications%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname ||
                '" ON ' || policy_record.schemaname || '.' || policy_record.tablename || ' CASCADE';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 6. Check if log_leave_request_action function still references telegram_notifications
-- If it does, we need to update it
SELECT proname, pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'log_leave_request_action'
  AND pg_get_functiondef(oid) LIKE '%telegram_notifications%';

-- 7. If the function still references telegram_notifications, update it
-- (This should not happen with our current schema, but just in case)
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
            NEW.approved_by, -- This might be email now, not UUID
            NEW.approved_by_name,
            CASE
                WHEN TG_OP = 'INSERT' THEN (SELECT email FROM profiles WHERE id = NEW.user_id)
                ELSE NEW.approved_by
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

-- 8. Verify that telegram_notifications is completely gone
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'telegram_notifications';

-- 9. Final verification - check for any remaining references
SELECT 'functions' as type, proname as name, pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE pg_get_functiondef(oid) LIKE '%telegram_notifications%'
UNION ALL
SELECT 'triggers' as type, trigger_name as name, action_statement as definition
FROM information_schema.triggers
WHERE action_statement LIKE '%telegram_notifications%'
UNION ALL
SELECT 'policies' as type, policyname as name, qual as definition
FROM pg_policies
WHERE qual LIKE '%telegram_notifications%'
   OR with_check LIKE '%telegram_notifications%';

