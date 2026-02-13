'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  wallet_address: string;
  ethscription_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Admin {
  id: string;
  user_id: string;
  role: string;
  user: User;
}

interface Ban {
  id: string;
  wallet_address: string;
  reason: string | null;
  created_at: string;
  banned_by_user?: {
    ethscription_name: string | null;
    wallet_address: string;
  };
}

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  channels: Channel[];
}

interface AdminServer {
  id: string;
  name: string;
  icon_url: string | null;
  created_at: string;
  owner?: {
    wallet_address: string;
    ethscription_name: string | null;
  };
  _count?: { count: number }[];
}

interface Channel {
  id: string;
  name: string;
  type: string;
  position: number;
}

interface Role {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  is_admin: boolean;
  can_manage_channels: boolean;
  can_manage_roles: boolean;
  can_manage_messages: boolean;
  can_kick_members: boolean;
  can_ban_members: boolean;
  can_invite: boolean;
  can_send_messages: boolean;
  can_attach_files: boolean;
  can_add_reactions: boolean;
  server?: { id: string; name: string };
}

interface ServerMember {
  id: string;
  user: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
  };
  roles: { role: { id: string; name: string; color: string } }[];
}

type Tab = 'users' | 'admins' | 'bans' | 'channels' | 'roles' | 'servers';

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [adminServers, setAdminServers] = useState<AdminServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  // Ban form
  const [banAddress, setBanAddress] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);

  // Channel form
  const [selectedServerId, setSelectedServerId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Platform admin role assignment
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const PLATFORM_ROLES = ['moderator', 'admin', 'super_admin'];

  // Server role form
  const [roleServerId, setRoleServerId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#c3ff00');
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Role permissions
  const [rolePerms, setRolePerms] = useState({
    is_admin: false,
    can_manage_channels: false,
    can_manage_roles: false,
    can_manage_messages: false,
    can_kick_members: false,
    can_ban_members: false,
    can_invite: true,
    can_send_messages: true,
    can_attach_files: true,
    can_add_reactions: true,
  });

  // Member role assignment
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedServerRoleId, setSelectedServerRoleId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'admins') {
        fetchAdmins();
        fetchUsers();
      }
      if (activeTab === 'bans') fetchBans();
      if (activeTab === 'channels') fetchServers();
      if (activeTab === 'roles') {
        fetchServers();
        fetchRoles();
      }
      if (activeTab === 'servers') fetchAdminServers();
    }
  }, [isOpen, activeTab]);

  // Fetch members when server changes for roles tab
  useEffect(() => {
    if (roleServerId && activeTab === 'roles') {
      fetchServerMembers(roleServerId);
      fetchRoles(roleServerId);
    }
  }, [roleServerId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bans');
      if (res.ok) {
        const data = await res.json();
        setBans(data.bans || []);
      }
    } catch (err) {
      console.error('Failed to fetch bans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/channels');
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
        if (data.servers?.length > 0 && !selectedServerId) {
          setSelectedServerId(data.servers[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/servers');
      if (res.ok) {
        const data = await res.json();
        setAdminServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdminServer = async (serverId: string) => {
    try {
      const res = await fetch(`/api/admin/servers?id=${serverId}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminServers(adminServers.filter(s => s.id !== serverId));
        setDeletingServerId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete server');
      }
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleBanUser = async (walletAddress: string) => {
    if (!confirm(`Ban wallet ${walletAddress}?`)) return;
    try {
      const res = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      if (res.ok) {
        setUsers(users.filter(u => u.wallet_address.toLowerCase() !== walletAddress.toLowerCase()));
        fetchBans();
      }
    } catch (err) {
      console.error('Failed to ban user:', err);
    }
  };

  const handleAddAdmin = async (userId: string, role: string = 'admin') => {
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      });
      if (res.ok) {
        fetchAdmins();
        setSelectedUserId('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add admin');
      }
    } catch (err) {
      console.error('Failed to add admin:', err);
    }
  };

  const handleUpdateRole = async (adminId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, role: newRole }),
      });
      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Remove admin privileges?')) return;
    try {
      const res = await fetch(`/api/admin/admins?id=${adminId}`, { method: 'DELETE' });
      if (res.ok) {
        setAdmins(admins.filter(a => a.id !== adminId));
      }
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  const handleBanWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banAddress.trim()) return;

    setBanning(true);
    try {
      const res = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: banAddress, reason: banReason }),
      });
      if (res.ok) {
        setBanAddress('');
        setBanReason('');
        fetchBans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to ban');
      }
    } catch (err) {
      console.error('Failed to ban:', err);
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (banId: string) => {
    if (!confirm('Unban this wallet?')) return;
    try {
      const res = await fetch(`/api/admin/bans?banId=${banId}`, { method: 'DELETE' });
      if (res.ok) {
        setBans(bans.filter(b => b.id !== banId));
      }
    } catch (err) {
      console.error('Failed to unban:', err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServerId || !newChannelName.trim()) return;

    setCreatingChannel(true);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: selectedServerId, name: newChannelName }),
      });
      if (res.ok) {
        setNewChannelName('');
        fetchServers();
      }
    } catch (err) {
      console.error('Failed to create channel:', err);
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Delete this channel and all its messages?')) return;
    try {
      const res = await fetch(`/api/admin/channels?channelId=${channelId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServers();
      }
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  // Roles functions
  const fetchRoles = async (serverId?: string) => {
    setLoading(true);
    try {
      const url = serverId ? `/api/admin/roles?serverId=${serverId}` : '/api/admin/roles';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerMembers = async (serverId: string) => {
    try {
      const res = await fetch(`/api/admin/roles/members?serverId=${serverId}`);
      if (res.ok) {
        const data = await res.json();
        setServerMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch server members:', err);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleServerId || !newRoleName.trim()) return;

    setCreatingRole(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: roleServerId,
          name: newRoleName,
          color: newRoleColor,
          ...rolePerms,
        }),
      });
      if (res.ok) {
        setNewRoleName('');
        setNewRoleColor('#c3ff00');
        setRolePerms({
          is_admin: false,
          can_manage_channels: false,
          can_manage_roles: false,
          can_manage_messages: false,
          can_kick_members: false,
          can_ban_members: false,
          can_invite: true,
          can_send_messages: true,
          can_attach_files: true,
          can_add_reactions: true,
        });
        fetchRoles(roleServerId);
      }
    } catch (err) {
      console.error('Failed to create role:', err);
    } finally {
      setCreatingRole(false);
    }
  };

  const handleUpdateServerRole = async (role: Role) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: role.id, ...role }),
      });
      if (res.ok) {
        fetchRoles(roleServerId);
        setEditingRole(null);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      const res = await fetch(`/api/admin/roles?roleId=${roleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRoles(roleServerId);
      }
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedMemberId || !selectedServerRoleId) return;
    try {
      const res = await fetch('/api/admin/roles/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selectedMemberId, role_id: selectedServerRoleId }),
      });
      if (res.ok) {
        fetchServerMembers(roleServerId);
        setSelectedMemberId('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign role');
      }
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  const handleRemoveMemberRole = async (memberId: string, roleId: string) => {
    try {
      const res = await fetch(`/api/admin/roles/members?memberId=${memberId}&roleId=${roleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServerMembers(roleServerId);
      }
    } catch (err) {
      console.error('Failed to remove role:', err);
    }
  };

  const filteredUsers = users.filter(u =>
    u.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.ethscription_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const selectedServer = servers.find(s => s.id === selectedServerId);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-[#c3ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin Panel
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 overflow-x-auto">
          {(['users', 'admins', 'bans', 'servers', 'channels', 'roles'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-[#c3ff00] border-b-2 border-[#c3ff00]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-130px)]">
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
              />

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden" style={{ imageRendering: 'pixelated' }}>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                        ) : (
                          <span className="text-xs font-semibold text-zinc-400">
                            {(user.ethscription_name || user.wallet_address).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.ethscription_name || formatAddress(user.wallet_address)}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono truncate">{user.wallet_address}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddAdmin(user.id)}
                          className="p-2 text-zinc-400 hover:text-[#c3ff00] hover:bg-zinc-700 rounded transition-colors"
                          title="Make admin"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleBanUser(user.wallet_address)}
                          className="p-2 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 rounded transition-colors"
                          title="Ban wallet"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-zinc-500 py-8">No users found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADMINS TAB */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              {/* Add admin form */}
              <div className="p-4 bg-zinc-800 rounded-lg space-y-3">
                <h3 className="font-medium text-sm">Add Admin</h3>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                >
                  <option value="">Select a user...</option>
                  {users.filter(u => !admins.some(a => a.user?.id === u.id)).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.ethscription_name || formatAddress(user.wallet_address)}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                >
                  {PLATFORM_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <Button
                  onClick={() => selectedUserId && handleAddAdmin(selectedUserId, selectedRole)}
                  disabled={!selectedUserId}
                  className="w-full"
                >
                  Add Admin
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {admins.map(admin => (
                    <div key={admin.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ imageRendering: 'pixelated' }}>
                        {admin.user?.avatar_url ? (
                          <img src={admin.user.avatar_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                        ) : (
                          <span className="text-xs font-semibold text-zinc-400">
                            {(admin.user?.ethscription_name || admin.user?.wallet_address || '??').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {admin.user?.ethscription_name || formatAddress(admin.user?.wallet_address || '')}
                        </p>
                      </div>
                      <select
                        value={admin.role}
                        onChange={e => handleUpdateRole(admin.id, e.target.value)}
                        className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-[#c3ff00] focus:outline-none focus:border-[#c3ff00]"
                      >
                        {PLATFORM_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        title="Remove admin"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {admins.length === 0 && (
                    <p className="text-center text-zinc-500 py-8">No admins yet</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BANS TAB */}
          {activeTab === 'bans' && (
            <div className="space-y-4">
              {/* Ban form */}
              <form onSubmit={handleBanWallet} className="p-4 bg-zinc-800 rounded-lg space-y-3">
                <h3 className="font-medium text-sm">Ban Wallet Address</h3>
                <input
                  type="text"
                  value={banAddress}
                  onChange={e => setBanAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00] font-mono"
                />
                <input
                  type="text"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                />
                <Button type="submit" loading={banning} className="w-full">
                  Ban Wallet
                </Button>
              </form>

              {/* Banned list */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {bans.map(ban => (
                    <div key={ban.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{ban.wallet_address}</p>
                        {ban.reason && <p className="text-xs text-zinc-500">{ban.reason}</p>}
                        <p className="text-xs text-zinc-600">
                          {new Date(ban.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnban(ban.id)}
                        className="p-2 text-zinc-400 hover:text-green-400 hover:bg-zinc-700 rounded transition-colors"
                        title="Unban"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {bans.length === 0 && (
                    <p className="text-center text-zinc-500 py-8">No banned wallets</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVERS TAB */}
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Manage all servers on the platform. Deleting a server removes all channels, messages, and members.
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {adminServers.map(server => (
                    <div key={server.id} className="p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {server.icon_url ? (
                            <img src={server.icon_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            <span className="text-lg font-semibold text-zinc-400">
                              {server.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{server.name}</p>
                          <p className="text-xs text-zinc-500">
                            Owner: {server.owner?.ethscription_name || formatAddress(server.owner?.wallet_address || '')}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {server._count?.[0]?.count || 0} members · Created {new Date(server.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {deletingServerId === server.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400">Confirm?</span>
                              <button
                                onClick={() => handleDeleteAdminServer(server.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeletingServerId(null)}
                                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingServerId(server.id)}
                              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                              title="Delete server"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {adminServers.length === 0 && (
                    <p className="text-center text-zinc-500 py-8">No servers found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHANNELS TAB */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              {/* Create channel form */}
              <form onSubmit={handleCreateChannel} className="p-4 bg-zinc-800 rounded-lg space-y-3">
                <h3 className="font-medium text-sm">Create Channel</h3>
                <select
                  value={selectedServerId}
                  onChange={e => setSelectedServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                >
                  {servers.map(server => (
                    <option key={server.id} value={server.id}>{server.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="channel-name"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                />
                <Button type="submit" loading={creatingChannel} className="w-full">
                  Create Channel
                </Button>
              </form>

              {/* Server channels list */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {servers.map(server => (
                    <div key={server.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {server.icon_url ? (
                            <img src={server.icon_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            <span className="text-xs font-semibold">{server.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-medium">{server.name}</span>
                        <span className="text-xs text-zinc-500 ml-auto">{server.channels?.length || 0} channels</span>
                      </div>
                      <div className="p-2">
                        {server.channels?.map(channel => (
                          <div key={channel.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700/50 rounded">
                            <span className="text-zinc-500">#</span>
                            <span className="flex-1 text-sm">{channel.name}</span>
                            <button
                              onClick={() => handleDeleteChannel(channel.id)}
                              className="p-1 text-zinc-500 hover:text-red-400 transition-colors opacity-0 hover:opacity-100"
                              title="Delete channel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        {(!server.channels || server.channels.length === 0) && (
                          <p className="text-center text-zinc-500 py-4 text-sm">No channels</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ROLES TAB */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* Server selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Select Server</label>
                <select
                  value={roleServerId}
                  onChange={e => setRoleServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                >
                  <option value="">Choose a server...</option>
                  {servers.map(server => (
                    <option key={server.id} value={server.id}>{server.name}</option>
                  ))}
                </select>
              </div>

              {roleServerId && (
                <>
                  {/* Create role form */}
                  <form onSubmit={handleCreateRole} className="p-4 bg-zinc-800 rounded-lg space-y-3">
                    <h3 className="font-medium text-sm">Create Role</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        placeholder="Role name"
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                      />
                      <input
                        type="color"
                        value={newRoleColor}
                        onChange={e => setNewRoleColor(e.target.value)}
                        className="w-12 h-9 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Permissions */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(rolePerms).map(([key, value]) => (
                        <label key={key} className="flex items-center gap-2 p-2 bg-zinc-900 rounded cursor-pointer hover:bg-zinc-700">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={e => setRolePerms(p => ({ ...p, [key]: e.target.checked }))}
                            className="accent-[#c3ff00]"
                          />
                          <span className="text-zinc-300">{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>

                    <Button type="submit" loading={creatingRole} className="w-full">
                      Create Role
                    </Button>
                  </form>

                  {/* Existing roles */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-zinc-400">Server Roles</h3>
                    {roles.filter(r => r.server_id === roleServerId).map(role => (
                      <div key={role.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="flex-1 font-medium" style={{ color: role.color }}>
                          {role.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {role.is_admin ? 'Admin' : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete role"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {roles.filter(r => r.server_id === roleServerId).length === 0 && (
                      <p className="text-center text-zinc-500 py-4 text-sm">No roles yet</p>
                    )}
                  </div>

                  {/* Assign roles to members */}
                  <div className="p-4 bg-zinc-800 rounded-lg space-y-3">
                    <h3 className="font-medium text-sm">Assign Role to Member</h3>
                    <select
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                    >
                      <option value="">Select member...</option>
                      {serverMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.user?.ethscription_name || formatAddress(m.user?.wallet_address || '')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedServerRoleId}
                      onChange={e => setSelectedServerRoleId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                    >
                      <option value="">Select role...</option>
                      {roles.filter(r => r.server_id === roleServerId).map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    <Button onClick={handleAssignRole} disabled={!selectedMemberId || !selectedServerRoleId} className="w-full">
                      Assign Role
                    </Button>
                  </div>

                  {/* Members with roles */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-zinc-400">Members</h3>
                    {serverMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden" style={{ imageRendering: 'pixelated' }}>
                          {member.user?.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            <span className="text-xs">{(member.user?.ethscription_name || member.user?.wallet_address || '??').slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">
                            {member.user?.ethscription_name || formatAddress(member.user?.wallet_address || '')}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.roles?.map(mr => (
                              <span
                                key={mr.role.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: mr.role.color + '20', color: mr.role.color }}
                              >
                                {mr.role.name}
                                <button
                                  onClick={() => handleRemoveMemberRole(member.id, mr.role.id)}
                                  className="hover:text-red-400"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
