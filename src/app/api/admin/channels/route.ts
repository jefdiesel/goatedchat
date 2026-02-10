import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List all channels across all servers (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user is admin
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all servers with their channels
    const { data: servers, error } = await supabase
      .from('servers')
      .select(`
        id,
        name,
        icon_url,
        channels (
          id,
          name,
          type,
          position
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching servers:', error);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    return NextResponse.json({ servers: servers || [] });
  } catch (error) {
    console.error('Channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a channel in any server (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { server_id, name, type } = await request.json();

    if (!server_id || !name) {
      return NextResponse.json({ error: 'Server ID and name required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user is admin
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get max position for the server
    const { data: maxPos } = await supabase
      .from('channels')
      .select('position')
      .eq('server_id', server_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position || 0) + 1;

    // Create channel
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        server_id,
        name: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        type: type || 'text',
        position,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
      return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a channel (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user is admin
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      console.error('Error deleting channel:', error);
      return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
