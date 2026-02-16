import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { TOWER_MAX } from '@/lib/entropy';

// GET - Get entropy state for a channel
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

    // Get channel with entropy status
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, server_id, entropy_enabled')
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get entropy state if exists
    const { data: entropyState } = await supabase
      .from('channel_entropy_state')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    return NextResponse.json({
      entropy_enabled: channel.entropy_enabled,
      entropyState: entropyState || null,
    });
  } catch (error) {
    console.error('Get entropy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Enable/disable entropy mode (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const { entropy_enabled } = await request.json();
    const supabase = getSupabaseAdmin();

    // Get channel and check permissions
    const { data: channel } = await supabase
      .from('channels')
      .select('server_id, servers(owner_id)')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const isOwner = (channel.servers as any)?.owner_id === session.userId;

    // Get member and their roles
    const { data: member } = await supabase
      .from('server_members')
      .select(`
        id,
        member_roles (
          roles (is_admin, can_manage_channels)
        )
      `)
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    const hasPermission = isOwner || member?.member_roles?.some(
      (mr: any) => mr.roles?.is_admin || mr.roles?.can_manage_channels
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'No permission' }, { status: 403 });
    }

    // Update channel entropy_enabled flag
    const { error: updateError } = await supabase
      .from('channels')
      .update({ entropy_enabled })
      .eq('id', channelId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
    }

    // If enabling, create/reset entropy state
    if (entropy_enabled) {
      const { error: upsertError } = await supabase
        .from('channel_entropy_state')
        .upsert({
          channel_id: channelId,
          integrity_tower: TOWER_MAX,
          corruption_pass: 0,
          last_decay_tick: new Date().toISOString(),
        }, {
          onConflict: 'channel_id',
        });

      if (upsertError) {
        console.error('Failed to create entropy state:', upsertError);
      }
    }

    // Return updated state
    const { data: entropyState } = await supabase
      .from('channel_entropy_state')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    return NextResponse.json({
      entropy_enabled,
      entropyState: entropyState || null,
    });
  } catch (error) {
    console.error('Update entropy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
