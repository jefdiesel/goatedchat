-- Entropy Mode Migration
-- Adds support for entropy channels where messages decay over time

-- Add entropy_enabled flag to channels table
ALTER TABLE channels ADD COLUMN entropy_enabled BOOLEAN DEFAULT FALSE;

-- Create entropy state table for tracking channel decay
CREATE TABLE channel_entropy_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE UNIQUE,
  integrity_tower INTEGER NOT NULL DEFAULT 54 CHECK (integrity_tower >= 0 AND integrity_tower <= 54),
  corruption_pass INTEGER NOT NULL DEFAULT 0,
  last_decay_tick TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_channel_entropy_state_channel_id ON channel_entropy_state(channel_id);

-- Enable RLS
ALTER TABLE channel_entropy_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Channel members can read entropy state
CREATE POLICY "Channel members can view entropy state" ON channel_entropy_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = channel_id
      AND sm.user_id = auth.uid()
    )
  );

-- Admins can insert/update entropy state
CREATE POLICY "Admins can manage entropy state" ON channel_entropy_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON c.server_id = s.id
      WHERE c.id = channel_id
      AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      JOIN member_roles mr ON sm.id = mr.member_id
      JOIN roles r ON mr.role_id = r.id
      WHERE c.id = channel_id
      AND sm.user_id = auth.uid()
      AND (r.is_admin = true OR r.can_manage_channels = true)
    )
  );

-- Enable realtime for entropy state changes
ALTER PUBLICATION supabase_realtime ADD TABLE channel_entropy_state;
