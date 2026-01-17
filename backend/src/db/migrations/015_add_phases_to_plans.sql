-- Migration: Add 'phases' column to plans table
-- This column is used for storing the structured schedule and coaching phases

ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;

-- Optional: Migrate existing plan_data or default schedules into phases if needed
-- For now, we just ensure the column exists so new code works.
