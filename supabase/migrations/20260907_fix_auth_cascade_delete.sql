-- ============================================================================================
-- Migration: Fix Foreign Key Constraints Blocking Auth User Deletion
-- Date: 2026-09-07
-- Description: Adds ON DELETE SET NULL to foreign keys pointing to auth.users and profiles
--              to ensure that removing a municipality head or department head cleanly deletes
--              them from Supabase auth.users without constraint violation errors.
-- ============================================================================================

-- 1. Fix deleted_staff.deleted_by foreign key referencing auth.users(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'deleted_staff_deleted_by_fkey' 
          AND table_name = 'deleted_staff'
    ) THEN
        ALTER TABLE deleted_staff DROP CONSTRAINT deleted_staff_deleted_by_fkey;
    END IF;
END $$;

ALTER TABLE deleted_staff
    ADD CONSTRAINT deleted_staff_deleted_by_fkey
    FOREIGN KEY (deleted_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- 2. Fix departments.kyc_verified_by foreign key referencing profiles(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'departments_kyc_verified_by_fkey' 
          AND table_name = 'departments'
    ) THEN
        ALTER TABLE departments DROP CONSTRAINT departments_kyc_verified_by_fkey;
    END IF;
END $$;

ALTER TABLE departments
    ADD CONSTRAINT departments_kyc_verified_by_fkey
    FOREIGN KEY (kyc_verified_by)
    REFERENCES profiles(id)
    ON DELETE SET NULL;

-- 3. Fix announcements.created_by foreign key referencing profiles(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'announcements_created_by_fkey' 
          AND table_name = 'announcements'
    ) THEN
        ALTER TABLE announcements DROP CONSTRAINT announcements_created_by_fkey;
    END IF;
END $$;

ALTER TABLE announcements
    ADD CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
