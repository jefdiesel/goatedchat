-- Add social links and ENS name to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_handle text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ens_name text;
