-- Migration: Add complaint upvotes and upvote_count
-- Run this in Supabase SQL Editor

-- 1. Add upvote_count column to complaints table if it doesn't exist
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 1;

-- 2. Create complaint_upvotes table
CREATE TABLE IF NOT EXISTS complaint_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(complaint_id, citizen_id)
);

-- 3. Indexes for rapid duplicate searches and upvote checks
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_complaint_id ON complaint_upvotes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_citizen_id ON complaint_upvotes(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_active_status ON complaints(status, municipality_id) 
    WHERE status IN ('pending', 'assigned', 'under_review', 'in_progress', 'cross_dept_pending');
CREATE INDEX IF NOT EXISTS idx_complaints_geo ON complaints(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
