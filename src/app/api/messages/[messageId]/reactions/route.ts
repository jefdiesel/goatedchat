import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// POST - Add a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify user has access to the channel
    const { data: message } = await supabase
      .from('messages')
      .select('channel_id, channels(server_id)')
      .eq('id', messageId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', (message.channels as any)?.server_id)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', session.userId)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      // Remove the reaction (toggle)
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ removed: true });
    }

    // Add reaction
    const { data: reaction, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: session.userId,
        emoji,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reaction:', error);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    return NextResponse.json({ reaction });
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
