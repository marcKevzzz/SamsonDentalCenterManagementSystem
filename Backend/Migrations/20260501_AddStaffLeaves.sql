-- Migration: Add Staff Leaves Table
-- Created: 2026-05-01

CREATE TABLE IF NOT EXISTS staff_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'Sick', 'Vacation', 'Emergency', 'Personal'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_leaves_profile_id ON staff_leaves(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_status ON staff_leaves(status);
