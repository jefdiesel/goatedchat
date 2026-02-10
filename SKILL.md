# Goat Chat - Project Reference

## Quick Deploy
```bash
npx vercel --prod --force
```

---

## Environment Variables

### .env.local
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

# RainbowKit / WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# Cloudflare R2
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET=comrade-chat
CLOUDFLARE_CDN_URL=https://pub-xxx.r2.dev

# Session
JWT_SECRET=xxx
```

---

## Database Schema (Supabase)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | wallet_address, ethscription_name, avatar_url, bio, status |
| `servers` | name, owner_id, invite_code, icon_url |
| `server_members` | server_id, user_id, nickname, joined_at |
| `roles` | server_id, name, color, position, is_admin, permission flags |
| `role_token_gates` | role_id, contract_address, chain, min_balance |
| `member_roles` | member_id, role_id |
| `channels` | server_id, name, type (text/category), position, is_private, parent_id |
| `channel_permissions` | channel_id, role_id/user_id, allow_* flags |
| `channel_token_gates` | channel_id, contract_address, chain, min_balance |
| `messages` | channel_id, author_id, content, type, reply_to_id |
| `message_attachments` | message_id, url, content_type, size, filename |
| `message_reactions` | message_id, user_id, emoji |
| `dm_channels` | is_group, name, owner_id |
| `dm_participants` | dm_channel_id, user_id |
| `dm_messages` | dm_channel_id, author_id, content |
| `platform_admins` | user_id, role (admin/super_admin), assigned_by |
| `admin_audit_log` | admin_id, action, target_type, target_id, metadata |

### Role Permission Columns
```sql
is_admin, can_manage_channels, can_manage_roles, can_manage_messages,
can_kick_members, can_ban_members, can_invite, can_send_messages,
can_attach_files, can_add_reactions
```

### Enable Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
```

---

## Ethscriptions API

### Get User's Image Ethscriptions
```typescript
const res = await fetch(
  `https://api.ethscriptions.com/v2/ethscriptions?current_owner=${walletAddress}&media_type=image&per_page=25&page=${page}`
);
const data = await res.json();
// data.result contains array with: transaction_hash, content_uri (data URL), mimetype
```

### Resolve Ethscription Name
```typescript
const res = await fetch(
  `https://api.ethscriptions.com/v2/ethscriptions/exists/${name}.eth`
);
const data = await res.json();
// If exists, data.result.current_owner is the owner address
```

### Get Ethscription by TX Hash
```typescript
const res = await fetch(
  `https://api.ethscriptions.com/v2/ethscriptions/${txHash}`
);
const data = await res.json();
// data.result.content_uri contains the data URL directly
```

**Important:** The API returns `content_uri` as a data URL (e.g., `data:image/png;base64,...`), NOT via a `/content` endpoint.

---

## Token Gate Pattern (from ~/chainhost)

### Client Hook (useTokenGate.ts)
```typescript
const CACHE_KEY = "tokengate_access";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useTokenGate(collectionKey: string) {
  // 1. Check localStorage cache first
  // 2. Call /api/token-gate?wallet=${wallet}&collection=${collectionKey}
  // 3. Cache result in localStorage
  return { hasAccess, loading, matchingTokens, error };
}
```

### Server API (token-gate/route.ts)
```typescript
const APPCHAIN_RPC = "https://mainnet.ethscriptions.com";

// balanceOf(address) selector = 0x70a08231
async function checkBalanceOf(wallet: string, contracts: string[]): Promise<number> {
  const paddedWallet = wallet.slice(2).padStart(64, "0");
  const result = await appchainCall(contract, "0x70a08231" + paddedWallet);
  return parseInt(result, 16);
}
```

---

## Permission Hierarchy

```
Platform Admin > Server Owner > Server Admin (is_admin role) > Role Permissions > Token Gates
```

### Platform Admin
- Assigned via `platform_admins` table
- Can access /admin/* pages
- Controls server creation, user management

### Server Owner
- `servers.owner_id === user.id`
- All permissions on their server
- Can delete server, manage all roles

### Server Admin
- Has role with `is_admin = true`
- Can manage channels, members, messages
- Cannot delete server or manage owner's roles

---

## Key API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/nonce` | GET | Get SIWE nonce |
| `/api/auth/verify` | POST | Verify SIWE signature |
| `/api/auth/session` | GET | Get current session |
| `/api/servers` | GET, POST | List/create servers |
| `/api/servers/[serverId]` | GET, PATCH, DELETE | Server details |
| `/api/servers/[serverId]/roles` | GET, POST, PATCH, DELETE | Role CRUD |
| `/api/servers/[serverId]/members` | GET | List members |
| `/api/servers/[serverId]/members/[memberId]/roles` | PUT | Assign member roles |
| `/api/channels/[channelId]/messages` | GET, POST | Messages |
| `/api/messages/[messageId]/reactions` | POST, DELETE | Reactions |
| `/api/upload` | POST | Get R2 signed upload URL |
| `/api/admin/admins` | GET, POST, DELETE | Platform admin management |

---

## Design Tokens

```css
--background: #000000;
--foreground: #ededed;
--accent: #c3ff00;
--accent-hover: #d4ff4d;
--surface: #0a0a0a;
--border: #1a1a1a;
--muted: #666666;
```

### Component Patterns
```tsx
// Cards
className="bg-zinc-900 border border-zinc-800 rounded-xl"

// Primary Button
className="bg-[#c3ff00] text-black hover:bg-[#d4ff4d]"

// Ghost Button
className="text-zinc-400 hover:text-white hover:bg-zinc-800"

// Input Focus
className="focus:border-[#c3ff00]"

// Loading Spinner
className="border-2 border-zinc-600 border-t-[#c3ff00] animate-spin"
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/connect/        # Wallet connect page
│   ├── (app)/
│   │   ├── servers/[serverId]/channels/[channelId]/
│   │   ├── dm/[channelId]/
│   │   └── profile/
│   ├── admin/
│   │   ├── admins/            # Platform admin management
│   │   ├── users/
│   │   └── audit/
│   └── api/
├── components/
│   ├── auth/                  # ConnectButton, AuthGuard
│   ├── layout/                # AppShell, Sidebar, ChannelSidebar
│   ├── server/                # ServerCard, ServerSettingsModal
│   ├── channel/               # ChannelList, ChannelSettingsModal
│   ├── message/               # MessageList, MessageInput
│   ├── roles/                 # RoleManagementModal
│   ├── user/                  # UserAvatar, UserProfilePopup
│   └── ui/                    # Button, Input, Modal, Spinner
├── hooks/
│   ├── useAuth.ts
│   ├── useServer.ts
│   ├── useChannel.ts
│   ├── useMessages.ts
│   └── useRealtime.ts
└── lib/
    ├── supabase/              # client.ts, server.ts
    ├── siwe.ts                # SIWE session management
    └── permissions.ts         # getServerPermissions()
```

---

## Common Issues & Fixes

### Vercel Caching Old Code
```bash
npx vercel --prod --force
```
Or use direct deployment URL instead of goatchat.vercel.app

### Hook State Not Shared
Multiple instances of same hook = separate state. Pass callbacks:
```tsx
// Parent
const { data, fetch } = useHook();
<Child onAction={fetch} />

// Child
props.onAction(); // triggers parent's fetch
```

### Ethscription PFP Not Loading
Use `content_uri` field directly, not `/content` endpoint:
```typescript
const { content_uri } = ethscription;
// content_uri is already a data URL: "data:image/png;base64,..."
```

---

## Reference Files (~/chainhost)

| Feature | File |
|---------|------|
| Token gate hook | `~/chainhost/src/hooks/useTokenGate.ts` |
| Token gate API | `~/chainhost/src/app/api/token-gate/route.ts` |
| RainbowKit setup | `~/chainhost/src/components/Providers.tsx` |
