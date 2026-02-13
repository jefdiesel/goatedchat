import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// POST - Request key rotation for a channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const supabase = getSupabaseAdmin();

    // Get channel and verify permissions
    const { data: channel } = await supabase
      .from('channels')
      .select('server_id, servers(owner_id)')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const isOwner = (channel.servers as any)?.owner_id === session.userId;

    // Check if user has admin permissions
    const { data: member } = await supabase
      .from('server_members')
      .select(`
        id,
        member_roles (
          roles (is_admin)
        )
      `)
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    const isAdmin = member?.member_roles?.some((mr: any) => mr.roles?.is_admin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No permission' }, { status: 403 });
    }

    // Get current key version
    const { data: currentKeys } = await supabase
      .from('channel_key_shares')
      .select('key_version')
      .eq('channel_id', channelId)
      .order('key_version', { ascending: false })
      .limit(1);

    const currentVersion = currentKeys && currentKeys.length > 0
      ? currentKeys[0].key_version
      : 0;

    // Get all current members with their public keys
    const { data: members } = await supabase
      .from('server_members')
      .select(`
        user_id,
        users!inner (
          id
        )
      `)
      .eq('server_id', channel.server_id);

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 });
    }

    const userIds = members.map((m: any) => m.user_id);

    // Get public keys for all members
    const { data: publicKeys } = await supabase
      .from('user_public_keys')
      .select('user_id, identity_public_key, key_version')
      .in('user_id', userIds)
      .order('key_version', { ascending: false });

    // Get latest key for each user
    const memberKeys = new Map<string, string>();
    publicKeys?.forEach((key: any) => {
      if (!memberKeys.has(key.user_id)) {
        memberKeys.set(key.user_id, key.identity_public_key);
      }
    });

    // Return member list for client-side key generation
    const membersWithKeys = Array.from(memberKeys.entries()).map(([userId, publicKey]) => ({
      userId,
      publicKey,
    }));

    return NextResponse.json({
      currentVersion,
      newVersion: currentVersion + 1,
      members: membersWithKeys,
    });
  } catch (error) {
    console.error('Rotate key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
