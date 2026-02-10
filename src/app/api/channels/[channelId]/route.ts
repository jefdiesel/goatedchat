import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Get channel details
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

    // Get channel
    const { data: channel, error } = await supabase
      .from('channels')
      .select('*, servers(owner_id)')
      .eq('id', channelId)
      .single();

    if (error || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if user is a member of the server
    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Get channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update channel
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
    const updates = await request.json();
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

    // Update channel
    const { data: updated, error: updateError } = await supabase
      .from('channels')
      .update({
        name: updates.name?.trim().toLowerCase().replace(/\s+/g, '-'),
        position: updates.position,
        is_private: updates.is_private,
        parent_id: updates.parent_id,
      })
      .eq('id', channelId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
    }

    return NextResponse.json({ channel: updated });
  } catch (error) {
    console.error('Update channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete channel
export async function DELETE(
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
      .select('server_id, servers(owner_id)')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const isOwner = (channel.servers as any)?.owner_id === session.userId;

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

    // Delete channel
    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
