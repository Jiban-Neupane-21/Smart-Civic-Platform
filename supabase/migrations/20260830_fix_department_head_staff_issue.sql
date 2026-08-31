-- ==============================================================================
-- Migration: Fix Department Head Counted as Staff Issue
-- Description:
--   1. Updates `handle_new_user()` trigger function so that only users with
--      role 'staff' are automatically inserted into the `public.staff` table.
--   2. Deletes any existing rows in `public.staff` where the associated profile
--      is a 'department_head' (or non-staff role).
-- ==============================================================================

BEGIN;

-- Step 1: Update the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_gender public.gender;
  v_municipality_id UUID;
  v_department_id UUID;
  v_raw_role TEXT;
  v_raw_gender TEXT;
  v_raw_muni TEXT;
  v_raw_dept TEXT;
BEGIN
  v_raw_role   := NEW.raw_user_meta_data->>'role';
  v_raw_gender := NEW.raw_user_meta_data->>'gender';
  v_raw_muni   := NEW.raw_user_meta_data->>'municipality_id';
  v_raw_dept   := NEW.raw_user_meta_data->>'department_id';

  v_role := CASE
    WHEN v_raw_role IN ('superadmin', 'municipality_head', 'department_head', 'staff', 'citizen')
    THEN v_raw_role::public.user_role
    ELSE 'citizen'::public.user_role
  END;

  v_gender := CASE
    WHEN LOWER(v_raw_gender) IN ('male', 'female', 'other', 'prefer_not_to_say')
    THEN LOWER(v_raw_gender)::public.gender
    ELSE NULL
  END;

  v_municipality_id := CASE
    WHEN v_raw_muni ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN v_raw_muni::uuid
    ELSE NULL
  END;

  v_department_id := CASE
    WHEN v_raw_dept ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN v_raw_dept::uuid
    ELSE NULL
  END;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, phone, role, municipality_id, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NEW.phone),
    v_role,
    v_municipality_id,
    v_department_id
  );

  -- Insert role-specific child records
  IF v_role = 'citizen' THEN
    INSERT INTO public.citizens (id, first_name, middle_name, last_name, current_address, permanent_address, gender, contact_number)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NULLIF(NEW.raw_user_meta_data->>'middle_name', ''),
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'current_address',
      COALESCE(NEW.raw_user_meta_data->>'full_address', NEW.raw_user_meta_data->>'permanent_address'),
      v_gender,
      NULLIF(NEW.raw_user_meta_data->>'phone', '')
    );
  ELSIF v_role = 'staff' THEN
    -- ONLY create staff records for role = 'staff' (Department Heads are linked via departments.head_profile_id)
    IF v_municipality_id IS NOT NULL AND v_department_id IS NOT NULL THEN
      INSERT INTO public.staff (profile_id, municipality_id, primary_department_id, contact_number, gender, onboarded_at, employee_status)
      VALUES (NEW.id, v_municipality_id, v_department_id, NULLIF(NEW.raw_user_meta_data->>'phone', ''), v_gender, NOW(), 'active')
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 2: Clean up existing data — Remove department heads and non-staff users from public.staff table
DELETE FROM public.staff
WHERE profile_id IN (
  SELECT id FROM public.profiles WHERE role != 'staff'
);

COMMIT;
