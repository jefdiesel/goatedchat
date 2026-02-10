import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Fetch DM messages
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
    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseAdmin();

    // Verify user is a participant
    const { data: participation } = await supabase
      .from('dm_participants')
      .select('id')
      .eq('dm_channel_id', channelId)
      .eq('user_id', session.userId)
      .single();

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Fetch messages
    let query = supabase
      .from('dm_messages')
      .select(`
        *,
        author:users!author_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url
        )
      `)
      .eq('dm_channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: (messages || []).reverse() });
  } catch (error) {
    console.error('DM messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a DM message
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
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify user is a participant
    const { data: participation } = await supabase
      .from('dm_participants')
      .select('id')
      .eq('dm_channel_id', channelId)
      .eq('user_id', session.userId)
      .single();

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('dm_messages')
      .insert({
        dm_channel_id: channelId,
        author_id: session.userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:users!author_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url
        )
      `)
      .single();

    if (messageError) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update channel's updated_at
    await supabase
      .from('dm_channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', channelId);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Send DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
