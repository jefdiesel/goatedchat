import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface ServerPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  canManageChannels: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageServer: boolean;
}

export async function getServerPermissions(
  userId: string,
  serverId: string
): Promise<ServerPermissions | null> {
  const supabase = getSupabaseAdmin();

  // Get server to check ownership
  const { data: server } = await supabase
    .from('servers')
    .select('owner_id')
    .eq('id', serverId)
    .single();

  if (!server) return null;

  const isOwner = server.owner_id === userId;

  // If owner, has all permissions
  if (isOwner) {
    return {
      isOwner: true,
      isAdmin: true,
      canManageChannels: true,
      canManageMembers: true,
      canManageRoles: true,
      canManageServer: true,
    };
  }

  // Check if user has admin role in this server
  const { data: membership } = await supabase
    .from('server_members')
    .select('id')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single();

  if (!membership) return null;

  // Get user's roles
  const { data: memberRoles } = await supabase
    .from('member_roles')
    .select(`
      roles (
        is_admin
      )
    `)
    .eq('member_id', membership.id);

  const hasAdminRole = memberRoles?.some((mr: any) => mr.roles?.is_admin) || false;

  return {
    isOwner: false,
    isAdmin: hasAdminRole,
    canManageChannels: hasAdminRole,
    canManageMembers: hasAdminRole,
    canManageRoles: false, // Only owner can manage roles
    canManageServer: false, // Only owner can manage server settings
  };
}

export async function checkPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', userId)
    .single();

  return !!admin;
}
