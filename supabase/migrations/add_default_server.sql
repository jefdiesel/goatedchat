-- Add default server to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_server_id uuid REFERENCES servers(id) ON DELETE SET NULL;
