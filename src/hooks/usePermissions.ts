'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

interface Permission {
  can_manage_channels: boolean;
  can_manage_roles: boolean;
  can_manage_messages: boolean;
  can_kick_members: boolean;
  can_ban_members: boolean;
  can_invite: boolean;
  can_send_messages: boolean;
  can_attach_files: boolean;
  can_add_reactions: boolean;
}

interface Role extends Permission {
  id: string;
  name: string;
  color: string | null;
  position: number;
  is_admin: boolean;
}

const DEFAULT_PERMISSIONS: Permission = {
  can_manage_channels: false,
  can_manage_roles: false,
  can_manage_messages: false,
  can_kick_members: false,
  can_ban_members: false,
  can_invite: false,
  can_send_messages: false,
  can_attach_files: false,
  can_add_reactions: false,
};

export function usePermissions(serverId: string | null) {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!serverId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if owner
      const serverRes = await fetch(`/api/servers/${serverId}`);
      const serverData = await serverRes.json();
      setIsOwner(serverData.server?.is_owner || false);

      // Get member's roles
      const membersRes = await fetch(`/api/servers/${serverId}/members`);
      const membersData = await membersRes.json();

      const member = membersData.members?.find((m: any) => m.user_id === user.id);
      setRoles(member?.roles || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [serverId, user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Calculate effective permissions from all roles
  const permissions = useMemo<Permission>(() => {
    if (isOwner) {
      // Owner has all permissions
      return Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
        acc[key as keyof Permission] = true;
        return acc;
      }, {} as Permission);
    }

    // Check if any role is admin
    const hasAdminRole = roles.some(r => r.is_admin);
    if (hasAdminRole) {
      return Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
        acc[key as keyof Permission] = true;
        return acc;
      }, {} as Permission);
    }

    // Combine permissions from all roles (OR logic)
    return roles.reduce((acc, role) => {
      Object.keys(DEFAULT_PERMISSIONS).forEach(key => {
        if (role[key as keyof Permission]) {
          acc[key as keyof Permission] = true;
        }
      });
      return acc;
    }, { ...DEFAULT_PERMISSIONS });
  }, [isOwner, roles]);

  const hasPermission = useCallback((permission: keyof Permission): boolean => {
    return permissions[permission];
  }, [permissions]);

  const canManageServer = useMemo(() => {
    return isOwner || permissions.can_manage_channels || permissions.can_manage_roles;
  }, [isOwner, permissions]);

  return {
    isOwner,
    roles,
    permissions,
    hasPermission,
    canManageServer,
    loading,
    refresh: fetchPermissions,
  };
}

// Hook for channel-specific permissions
export function useChannelPermissions(serverId: string | null, channelId: string | null) {
  const { permissions: serverPermissions, isOwner, loading: serverLoading } = usePermissions(serverId);
  const [channelOverrides, setChannelOverrides] = useState<Partial<Permission> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChannelPermissions() {
      if (!channelId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/channels/${channelId}/permissions`);
        const data = await res.json();
        setChannelOverrides(data.permissions || null);
      } catch {
        setChannelOverrides(null);
      } finally {
        setLoading(false);
      }
    }

    if (!serverLoading) {
      fetchChannelPermissions();
    }
  }, [channelId, serverLoading]);

  // Apply channel overrides to server permissions
  const effectivePermissions = useMemo<Permission>(() => {
    if (isOwner) {
      return Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
        acc[key as keyof Permission] = true;
        return acc;
      }, {} as Permission);
    }

    if (!channelOverrides) {
      return serverPermissions;
    }

    // Channel overrides take precedence
    return {
      ...serverPermissions,
      ...Object.fromEntries(
        Object.entries(channelOverrides).filter(([_, v]) => v !== null)
      ),
    };
  }, [isOwner, serverPermissions, channelOverrides]);

  return {
    permissions: effectivePermissions,
    loading: loading || serverLoading,
  };
}
