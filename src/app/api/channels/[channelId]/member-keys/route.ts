import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Get public keys for all members of a channel
export async function GET(
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

    // Get channel and verify membership
    const { data: channel } = await supabase
      .from('channels')
      .select('server_id')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get all server members
    const { data: members } = await supabase
      .from('server_members')
      .select('user_id')
      .eq('server_id', channel.server_id);

    if (!members || members.length === 0) {
      return NextResponse.json({ members: [] });
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

    const result = Array.from(memberKeys.entries()).map(([userId, publicKey]) => ({
      userId,
      publicKey,
    }));

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error('Get member keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
