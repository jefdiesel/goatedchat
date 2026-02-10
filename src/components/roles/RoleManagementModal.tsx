'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number;
  is_admin: boolean;
  permissions: Record<string, boolean>;
}

interface Member {
  id: string;
  user_id: string;
  user: {
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
  };
  roles: Role[];
}

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function RoleManagementModal({ isOpen, onClose, serverId }: RoleManagementModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'members'>('roles');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, serverId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, membersRes] = await Promise.all([
        fetch(`/api/servers/${serverId}/roles`),
        fetch(`/api/servers/${serverId}/members`),
      ]);
      const rolesData = await rolesRes.json();
      const membersData = await membersRes.json();
      setRoles(rolesData.roles || []);
      setMembers(membersData.members || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Role Management">
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-zinc-700 pb-2">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'roles'
              ? 'bg-[#c3ff00] text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Roles
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'members'
              ? 'bg-[#c3ff00] text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Members
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : activeTab === 'roles' ? (
        <RolesTab
          roles={roles}
          serverId={serverId}
          onUpdate={fetchData}
          editingRole={editingRole}
          setEditingRole={setEditingRole}
          showCreateRole={showCreateRole}
          setShowCreateRole={setShowCreateRole}
        />
      ) : (
        <MembersTab
          members={members}
          roles={roles}
          serverId={serverId}
          onUpdate={fetchData}
        />
      )}
    </Modal>
  );
}

function RolesTab({
  roles,
  serverId,
  onUpdate,
  editingRole,
  setEditingRole,
  showCreateRole,
  setShowCreateRole,
}: {
  roles: Role[];
  serverId: string;
  onUpdate: () => void;
  editingRole: Role | null;
  setEditingRole: (role: Role | null) => void;
  showCreateRole: boolean;
  setShowCreateRole: (show: boolean) => void;
}) {
  if (showCreateRole || editingRole) {
    return (
      <RoleEditor
        role={editingRole}
        serverId={serverId}
        onSave={() => {
          setEditingRole(null);
          setShowCreateRole(false);
          onUpdate();
        }}
        onCancel={() => {
          setEditingRole(null);
          setShowCreateRole(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={() => setShowCreateRole(true)} className="w-full mb-4">
        Create Role
      </Button>

      {roles.length === 0 ? (
        <p className="text-zinc-500 text-center py-4">No roles yet</p>
      ) : (
        roles.map(role => (
          <div
            key={role.id}
            className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: role.color || '#888' }}
              />
              <span>{role.name}</span>
              {role.is_admin && (
                <span className="text-xs px-2 py-0.5 bg-[#c3ff00]/20 text-[#c3ff00] rounded">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={() => setEditingRole(role)}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Edit
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function RoleEditor({
  role,
  serverId,
  onSave,
  onCancel,
}: {
  role: Role | null;
  serverId: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [color, setColor] = useState(role?.color || '#c3ff00');
  const [isAdmin, setIsAdmin] = useState(role?.is_admin || false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const url = role
        ? `/api/servers/${serverId}/roles?id=${role.id}`
        : `/api/servers/${serverId}/roles`;

      const res = await fetch(url, {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, is_admin: isAdmin }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save role');
      }

      onSave();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!role) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/servers/${serverId}/roles?id=${role.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      onSave();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Role Name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Moderator"
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Role Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
          <Input
            value={color}
            onChange={e => setColor(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isAdmin ? 'bg-[#c3ff00] border-[#c3ff00]' : 'border-zinc-600'
          }`}
        >
          {isAdmin && (
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={e => setIsAdmin(e.target.checked)}
          className="sr-only"
        />
        <div>
          <span className="text-sm font-medium">Administrator</span>
          <p className="text-xs text-zinc-500">Can manage channels and members</p>
        </div>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} className="flex-1">
          {role ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>

      {role && (
        <div className="pt-4 border-t border-zinc-700">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-zinc-400 hover:text-red-400"
          >
            {deleting ? 'Deleting...' : 'Delete this role'}
          </button>
        </div>
      )}
    </div>
  );
}

function MembersTab({
  members,
  roles,
  serverId,
  onUpdate,
}: {
  members: Member[];
  roles: Role[];
  serverId: string;
  onUpdate: () => void;
}) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  if (selectedMember) {
    return (
      <MemberRoleEditor
        member={selectedMember}
        roles={roles}
        serverId={serverId}
        onSave={() => {
          setSelectedMember(null);
          onUpdate();
        }}
        onCancel={() => setSelectedMember(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {members.map(member => {
        const displayName = member.user?.ethscription_name ||
          (member.user?.wallet_address
            ? `${member.user.wallet_address.slice(0, 6)}...${member.user.wallet_address.slice(-4)}`
            : 'Unknown');

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                {member.user?.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-xs text-zinc-400">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm">{displayName}</div>
                <div className="flex gap-1 mt-0.5">
                  {member.roles?.map(role => (
                    <span
                      key={role.id}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${role.color}20`, color: role.color || '#888' }}
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedMember(member)}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Manage
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MemberRoleEditor({
  member,
  roles,
  serverId,
  onSave,
  onCancel,
}: {
  member: Member;
  roles: Role[];
  serverId: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    member.roles?.map(r => r.id) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/servers/${serverId}/members/${member.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: selectedRoles }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update roles');
      }

      onSave();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayName = member.user?.ethscription_name ||
    `${member.user?.wallet_address?.slice(0, 6)}...${member.user?.wallet_address?.slice(-4)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-700">
        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
          {member.user?.avatar_url ? (
            <img
              src={member.user.avatar_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="text-sm text-zinc-400">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="font-medium">{displayName}</div>
          <div className="text-xs text-zinc-500">Manage roles for this member</div>
        </div>
      </div>

      <div className="space-y-2">
        {roles.map(role => (
          <label
            key={role.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedRoles.includes(role.id)
                  ? 'border-[#c3ff00]'
                  : 'border-zinc-600'
              }`}
              style={{
                backgroundColor: selectedRoles.includes(role.id) ? role.color || '#c3ff00' : 'transparent',
              }}
            >
              {selectedRoles.includes(role.id) && (
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={selectedRoles.includes(role.id)}
              onChange={() => toggleRole(role.id)}
              className="sr-only"
            />
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: role.color || '#888' }}
              />
              <span>{role.name}</span>
              {role.is_admin && (
                <span className="text-xs text-[#c3ff00]">(Admin)</span>
              )}
            </div>
          </label>
        ))}

        {roles.length === 0 && (
          <p className="text-zinc-500 text-center py-4">No roles available</p>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} className="flex-1">
          Save Roles
        </Button>
      </div>
    </div>
  );
}
