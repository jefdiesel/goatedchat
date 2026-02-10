import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List channels for a server
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const supabase = getSupabaseAdmin();

    // Check if user is a member
    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', serverId)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get channels
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
    }

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const { name, type = 'text', is_private = false, parent_id, token_gate } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user has permission to create channels
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    const isOwner = server?.owner_id === session.userId;

    // Get member and their roles
    const { data: member } = await supabase
      .from('server_members')
      .select(`
        id,
        member_roles (
          role_id,
          roles (
            is_admin,
            can_manage_channels
          )
        )
      `)
      .eq('server_id', serverId)
      .eq('user_id', session.userId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const hasPermission = isOwner || member.member_roles?.some(
      (mr: any) => mr.roles?.is_admin || mr.roles?.can_manage_channels
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'No permission to create channels' }, { status: 403 });
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('channels')
      .select('position')
      .eq('server_id', serverId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position ?? -1) + 1;

    // Create channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        server_id: serverId,
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
        position,
        is_private,
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (channelError) {
      console.error('Error creating channel:', channelError);
      return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
    }

    // Create token gate if provided
    if (token_gate && token_gate.contract_address) {
      const { error: gateError } = await supabase
        .from('channel_token_gates')
        .insert({
          channel_id: channel.id,
          contract_address: token_gate.contract_address,
          chain: token_gate.chain || 'eth',
          min_balance: token_gate.min_balance || 1,
        });

      if (gateError) {
        console.error('Error creating token gate:', gateError);
      }
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
