-- Migration: Add KYC columns to departments table
ALTER TABLE departments
ADD COLUMN kyc_status TEXT DEFAULT 'unverified',
ADD COLUMN kyc_rejection_reason TEXT,
ADD COLUMN kyc_verified_by UUID REFERENCES profiles(id),
ADD COLUMN kyc_verified_at TIMESTAMPTZ;

-- Add check constraint for kyc_status
ALTER TABLE departments
ADD CONSTRAINT kyc_status_check CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));
