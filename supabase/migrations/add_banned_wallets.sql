-- Banned wallets table
CREATE TABLE IF NOT EXISTS banned_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  reason text,
  banned_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_banned_wallets_address ON banned_wallets(wallet_address);
