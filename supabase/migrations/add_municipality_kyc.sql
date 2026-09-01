-- ============================================================================================
-- Migration: Add Municipality KYC fields to municipalities table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================================

-- Add KYC status tracking columns to municipalities table
ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS kyc_status kyc_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
  -- Municipality registration / identity document (e.g. official registration certificate)
  ADD COLUMN IF NOT EXISTS registration_document_url TEXT,
  -- Head's personal identity document (citizenship / NID)
  ADD COLUMN IF NOT EXISTS head_identity_type TEXT,
  ADD COLUMN IF NOT EXISTS head_identity_number TEXT,
  ADD COLUMN IF NOT EXISTS head_identity_front_url TEXT,
  ADD COLUMN IF NOT EXISTS head_identity_back_url TEXT;

-- Index for quick KYC status queries (e.g. superadmin pending review list)
CREATE INDEX IF NOT EXISTS idx_municipalities_kyc_status ON municipalities(kyc_status);
