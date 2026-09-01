-- ============================================================================================
-- Migration: Recreate Views for Municipalities to include KYC Columns
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================================

-- Drop views to recreate them
DROP VIEW IF EXISTS v_active_municipalities CASCADE;
DROP VIEW IF EXISTS v_inactive_municipalities CASCADE;
DROP VIEW IF EXISTS v_municipality_detail CASCADE;

-- 1. Active Municipalities View
CREATE VIEW v_active_municipalities AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id
WHERE m.is_active = TRUE;

-- 2. Inactive Municipalities View
CREATE VIEW v_inactive_municipalities AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id
WHERE m.is_active = FALSE;

-- 3. Municipality Details View
CREATE VIEW v_municipality_detail AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id;
