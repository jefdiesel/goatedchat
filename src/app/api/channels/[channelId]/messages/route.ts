import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Fetch messages for a channel
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

    // Fetch messages with author info and attachments
    let query = supabase
      .from('messages')
      .select(`
        *,
        author:users!author_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url,
          bio,
          twitter_handle,
          discord_handle,
          ens_name
        ),
        attachments:message_attachments (*),
        reactions:message_reactions (
          id,
          emoji,
          user_id
        ),
        reply_to:messages!reply_to_id (
          id,
          content,
          author:users!author_id (
            id,
            ethscription_name,
            wallet_address
          )
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Reverse to get chronological order
    return NextResponse.json({ messages: (messages || []).reverse() });
  } catch (error) {
    console.error('Messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a message
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
    const { content, reply_to_id, attachments, encrypted } = body;

    // For encrypted messages, content is optional (stored in encrypted_content)
    if (!encrypted && !content?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

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

    // Build insert data
    const insertData: Record<string, unknown> = {
      channel_id: channelId,
      author_id: session.userId,
      type: reply_to_id ? 'reply' : 'default',
      reply_to_id: reply_to_id || null,
    };

    if (encrypted) {
      // Encrypted message
      insertData.content = ''; // Empty content for encrypted messages
      insertData.encrypted_content = encrypted.ct;
      insertData.encryption_iv = encrypted.iv;
      insertData.key_version = encrypted.kv;
      insertData.is_encrypted = true;
    } else {
      // Plaintext message (backward compatibility)
      insertData.content = content?.trim() || '';
      insertData.is_encrypted = false;
    }

    // Create message
    const { data: insertedMessage, error: messageError } = await supabase
      .from('messages')
      .insert(insertData)
      .select('id')
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      await supabase.from('message_attachments').insert(
        attachments.map((a: any) => ({
          message_id: insertedMessage.id,
          url: a.url,
          content_type: a.content_type,
          size: a.size,
          filename: a.filename,
        }))
      );
    }

    // Fetch the complete message with all relations (separate query for self-referential join)
    const { data: message } = await supabase
      .from('messages')
      .select(`
        *,
        author:users!author_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url,
          bio,
          twitter_handle,
          discord_handle,
          ens_name
        ),
        attachments:message_attachments (*),
        reactions:message_reactions (
          id,
          emoji,
          user_id
        ),
        reply_to:messages!reply_to_id (
          id,
          content,
          author:users!author_id (
            id,
            ethscription_name,
            wallet_address
          )
        )
      `)
      .eq('id', insertedMessage.id)
      .single();

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
