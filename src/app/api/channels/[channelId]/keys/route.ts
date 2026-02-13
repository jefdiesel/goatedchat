import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Get the current user's encrypted key share for a channel
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

    // Verify user is a member of the channel's server
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

    // Get the user's key share (latest version)
    const { data: keyShare, error } = await supabase
      .from('channel_key_shares')
      .select('*')
      .eq('channel_id', channelId)
      .eq('user_id', session.userId)
      .order('key_version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No key share found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get the key creator's public key (to verify/decrypt)
    // For now, we'll use the server owner's key as the "sender"
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', channel.server_id)
      .single();

    const { data: senderKeys } = await supabase
      .from('user_public_keys')
      .select('identity_public_key')
      .eq('user_id', server?.owner_id)
      .order('key_version', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      encryptedKey: keyShare.encrypted_key,
      keyVersion: keyShare.key_version,
      senderPublicKey: senderKeys?.identity_public_key || null,
    });
  } catch (error) {
    console.error('Get channel key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload key shares (for key creation or rotation)
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
    const body = await request.json();
    const { keyShares } = body;

    if (!keyShares || !Array.isArray(keyShares)) {
      return NextResponse.json(
        { error: 'Invalid key shares format' },
        { status: 400 }
      );
    }

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

    // Insert key shares
    const shareRecords = keyShares.map((share: { userId: string; encryptedKey: string; keyVersion: number }) => ({
      channel_id: channelId,
      user_id: share.userId,
      encrypted_key: share.encryptedKey,
      key_version: share.keyVersion,
    }));

    const { error: insertError } = await supabase
      .from('channel_key_shares')
      .upsert(shareRecords, {
        onConflict: 'channel_id,user_id,key_version',
      });

    if (insertError) {
      console.error('Error inserting key shares:', insertError);
      return NextResponse.json(
        { error: 'Failed to store key shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload key shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
