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
    const body = await request.json();
    const { content, encrypted } = body;

    // For encrypted messages, content is optional (stored in encrypted_content)
    if (!encrypted && !content?.trim()) {
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

    // Build insert data
    const insertData: Record<string, unknown> = {
      dm_channel_id: channelId,
      author_id: session.userId,
    };

    if (encrypted) {
      // Encrypted message
      insertData.content = ''; // Empty content for encrypted messages
      insertData.encrypted_content = encrypted.ct;
      insertData.encryption_iv = encrypted.iv;
      insertData.key_version = encrypted.kv;
      insertData.is_encrypted = true;
      if (encrypted.ek) {
        insertData.sender_ephemeral_key = encrypted.ek;
      }
    } else {
      // Plaintext message (backward compatibility)
      insertData.content = content.trim();
      insertData.is_encrypted = false;
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('dm_messages')
      .insert(insertData)
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
      console.error('DM message insert error:', messageError);
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
