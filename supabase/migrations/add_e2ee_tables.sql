-- E2EE (End-to-End Encryption) Tables Migration
-- Adds support for encrypted messaging in DMs and channels

-- User public keys for encryption
CREATE TABLE user_public_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_public_key TEXT NOT NULL,  -- X25519 public key (base64)
  signing_public_key TEXT NOT NULL,   -- Ed25519 public key (base64)
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key_version)
);

-- Index for looking up user keys
CREATE INDEX idx_user_public_keys_user_id ON user_public_keys(user_id);

-- Channel encryption keys (encrypted per member)
CREATE TABLE channel_key_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,  -- Channel key encrypted to user's public key (base64)
  key_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id, key_version)
);

-- Indexes for channel key lookups
CREATE INDEX idx_channel_key_shares_channel_id ON channel_key_shares(channel_id);
CREATE INDEX idx_channel_key_shares_user_id ON channel_key_shares(user_id);

-- DM prekey bundles for X3DH key exchange
CREATE TABLE dm_key_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prekey_public TEXT NOT NULL,     -- X25519 prekey public key (base64)
  prekey_signature TEXT NOT NULL,  -- Ed25519 signature of prekey (base64)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for DM key bundle lookups
CREATE INDEX idx_dm_key_bundles_user_id ON dm_key_bundles(user_id);

-- Add auth_method to users table
ALTER TABLE users ADD COLUMN auth_method TEXT DEFAULT 'wallet'
  CHECK (auth_method IN ('wallet', 'seedphrase'));

-- Add encryption columns to messages table
ALTER TABLE messages ADD COLUMN encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN encryption_iv TEXT;
ALTER TABLE messages ADD COLUMN key_version INTEGER;
ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;

-- Add encryption columns to dm_messages table
ALTER TABLE dm_messages ADD COLUMN encrypted_content TEXT;
ALTER TABLE dm_messages ADD COLUMN encryption_iv TEXT;
ALTER TABLE dm_messages ADD COLUMN key_version INTEGER;
ALTER TABLE dm_messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE dm_messages ADD COLUMN sender_ephemeral_key TEXT;  -- For X3DH

-- RLS Policies for new tables

-- user_public_keys: Anyone can read, only owner can insert/update
ALTER TABLE user_public_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public keys" ON user_public_keys
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own keys" ON user_public_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keys" ON user_public_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- channel_key_shares: Only channel members can read their own shares
ALTER TABLE channel_key_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own key shares" ON channel_key_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Channel admins can insert key shares" ON channel_key_shares
  FOR INSERT WITH CHECK (
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
      AND r.is_admin = true
    )
  );

-- dm_key_bundles: Anyone can read, only owner can manage
ALTER TABLE dm_key_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view key bundles" ON dm_key_bundles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bundles" ON dm_key_bundles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bundles" ON dm_key_bundles
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for key shares (for key rotation notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE channel_key_shares;
