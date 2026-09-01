-- ==============================================================================
-- Migration: Add Staff KYC fields and verification columns
-- ==============================================================================

BEGIN;

-- 1. Add KYC status & verification metadata to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS kyc_status kyc_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS identity_type TEXT,
  ADD COLUMN IF NOT EXISTS identity_number TEXT,
  ADD COLUMN IF NOT EXISTS identity_front_url TEXT,
  ADD COLUMN IF NOT EXISTS identity_back_url TEXT,
  ADD COLUMN IF NOT EXISTS appointment_letter_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

-- 2. Add index for fast KYC filtering in department/municipality staff rosters
CREATE INDEX IF NOT EXISTS idx_staff_kyc_status ON public.staff(kyc_status);

COMMIT;
