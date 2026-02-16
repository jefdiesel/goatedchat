import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { TOWER_MAX } from '@/lib/entropy';

// POST - Reset entropy state (tower back to 100%, corruption pass to 0)
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

    // Get channel and check permissions
    const { data: channel } = await supabase
      .from('channels')
      .select('server_id, entropy_enabled, servers(owner_id)')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (!channel.entropy_enabled) {
      return NextResponse.json({ error: 'Entropy not enabled' }, { status: 400 });
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

    // Reset entropy state
    const { data: entropyState, error: updateError } = await supabase
      .from('channel_entropy_state')
      .update({
        integrity_tower: TOWER_MAX,
        corruption_pass: 0,
        last_decay_tick: new Date().toISOString(),
      })
      .eq('channel_id', channelId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to reset entropy:', updateError);
      return NextResponse.json({ error: 'Failed to reset entropy' }, { status: 500 });
    }

    return NextResponse.json({ entropyState });
  } catch (error) {
    console.error('Reset entropy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
