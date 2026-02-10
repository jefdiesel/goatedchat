-- Add icon_url to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS icon_url TEXT;
