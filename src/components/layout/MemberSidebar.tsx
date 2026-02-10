'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { UserProfilePopup } from '@/components/user/UserProfilePopup';

interface Member {
  id: string;
  user_id: string;
  nickname: string | null;
  is_owner: boolean;
  user: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    status: 'online' | 'offline' | 'idle' | 'dnd';
  };
  roles: {
    id: string;
    name: string;
    color: string | null;
    is_admin: boolean;
  }[];
}

interface MemberSidebarProps {
  serverId: string;
}

export function MemberSidebar({ serverId }: MemberSidebarProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/servers/${serverId}/members`);
        const data = await res.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [serverId]);

  // Filter out members with missing user data and group by status
  const validMembers = members.filter(m => m.user);
  const onlineMembers = validMembers.filter(m => m.user.status === 'online' || m.user.status === 'idle' || m.user.status === 'dnd');
  const offlineMembers = validMembers.filter(m => m.user.status === 'offline' || !m.user.status);

  const statusColors = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    dnd: 'bg-red-500',
    offline: 'bg-zinc-500',
  };

  return (
    <div className="w-60 bg-surface flex flex-col border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Members</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (
          <>
            {/* Online members */}
            {onlineMembers.length > 0 && (
              <div className="mb-4">
                <h4 className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase">
                  Online — {onlineMembers.length}
                </h4>
                {onlineMembers.map(member => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    statusColors={statusColors}
                    onClick={() => setSelectedMember(member)}
                  />
                ))}
              </div>
            )}

            {/* Offline members */}
            {offlineMembers.length > 0 && (
              <div>
                <h4 className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase">
                  Offline — {offlineMembers.length}
                </h4>
                {offlineMembers.map(member => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    statusColors={statusColors}
                    onClick={() => setSelectedMember(member)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Popup */}
      {selectedMember && selectedMember.user && (
        <UserProfilePopup
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          user={{
            ...selectedMember.user,
            bio: selectedMember.user.bio || null,
          }}
          onUpdate={() => {
            // Refetch members
            fetch(`/api/servers/${serverId}/members`)
              .then(res => res.json())
              .then(data => setMembers(data.members || []));
          }}
        />
      )}
    </div>
  );
}

function MemberItem({
  member,
  statusColors,
  onClick,
}: {
  member: Member;
  statusColors: Record<string, string>;
  onClick: () => void;
}) {
  if (!member.user) return null;

  const displayName = member.nickname || member.user.ethscription_name ||
    `${member.user.wallet_address.slice(0, 6)}...${member.user.wallet_address.slice(-4)}`;

  const highestRole = member.roles.sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0))[0];
  const roleColor = highestRole?.color || '#ffffff';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 cursor-pointer"
    >
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden"
          style={{ imageRendering: 'pixelated' }}
        >
          {member.user.avatar_url ? (
            <img
              src={member.user.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="text-xs font-semibold text-zinc-400">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${statusColors[member.user.status]}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className="text-sm font-medium truncate"
            style={{ color: roleColor }}
          >
            {displayName}
          </span>
          {member.is_owner && (
            <svg className="w-3 h-3 text-[#c3ff00]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3h14v2H5v-2z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
