import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getServerPermissions } from '@/lib/permissions';

// GET - Get server details
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
      .select('id, nickname')
      .eq('server_id', serverId)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get server details
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Get permissions
    const permissions = await getServerPermissions(session.userId, serverId);

    return NextResponse.json({
      server: {
        ...server,
        is_owner: server.owner_id === session.userId,
        is_admin: permissions?.isAdmin || false,
        can_manage_channels: permissions?.canManageChannels || false,
        nickname: membership.nickname,
      },
    });
  } catch (error) {
    console.error('Get server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update server
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    // Check if user is owner
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    if (!server || server.owner_id !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update server
    const { data: updated, error: updateError } = await supabase
      .from('servers')
      .update({
        name: updates.name,
        icon_url: updates.icon_url,
      })
      .eq('id', serverId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update server' }, { status: 500 });
    }

    return NextResponse.json({ server: updated });
  } catch (error) {
    console.error('Update server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete server
export async function DELETE(
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

    // Check if user is owner
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    if (!server || server.owner_id !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete server (cascades to members, channels, etc.)
    const { error: deleteError } = await supabase
      .from('servers')
      .delete()
      .eq('id', serverId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
