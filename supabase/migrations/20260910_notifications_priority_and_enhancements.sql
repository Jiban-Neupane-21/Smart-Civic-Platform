-- ============================================================================================
-- Migration: Add Priority and Indexing to Notifications Table
-- Date: 2026-09-10
-- Purpose: Support role-based priority levels (normal, important, emergency) and performance
--          indexing for municipality, department, team, and complaint isolation.
-- ============================================================================================

-- 1. Add priority column if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';

        -- Add check constraint for valid priorities
        ALTER TABLE public.notifications
        ADD CONSTRAINT chk_notifications_priority
        CHECK (priority IN ('normal', 'important', 'emergency'));
    END IF;
END $$;

-- 2. Backfill priority based on is_urgent
UPDATE public.notifications
SET priority = CASE
    WHEN is_urgent = TRUE THEN 'emergency'
    ELSE 'normal'
END
WHERE priority IS NULL OR priority = 'normal';

-- 3. Add performance indexes for scoped recipient queries
CREATE INDEX IF NOT EXISTS idx_notifications_complaint_id
ON public.notifications(complaint_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target_municipality
ON public.notifications(target_municipality_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target_department
ON public.notifications(target_department_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target_team
ON public.notifications(target_team_id);

CREATE INDEX IF NOT EXISTS idx_notifications_target_profile
ON public.notifications(target_profile_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON public.notifications(created_at DESC);

-- 4. Notification reads performance index
CREATE INDEX IF NOT EXISTS idx_notification_reads_profile_seen
ON public.notification_reads(profile_id, is_seen);
