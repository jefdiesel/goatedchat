import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// PATCH - Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user owns the message
    const { data: message } = await supabase
      .from('messages')
      .select('author_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.author_id !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update message
    const { data: updated, error } = await supabase
      .from('messages')
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
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

    if (error) {
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const supabase = getSupabaseAdmin();

    // Get message and check permissions
    const { data: message } = await supabase
      .from('messages')
      .select(`
        author_id,
        channel_id,
        channels (
          server_id,
          servers (owner_id)
        )
      `)
      .eq('id', messageId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const isAuthor = message.author_id === session.userId;
    const isServerOwner = (message.channels as any)?.servers?.owner_id === session.userId;

    // Check if user has manage messages permission
    let hasManagePermission = false;
    if (!isAuthor && !isServerOwner) {
      const { data: member } = await supabase
        .from('server_members')
        .select(`
          id,
          member_roles (
            roles (is_admin, can_manage_messages)
          )
        `)
        .eq('server_id', (message.channels as any)?.server_id)
        .eq('user_id', session.userId)
        .single();

      hasManagePermission = member?.member_roles?.some(
        (mr: any) => mr.roles?.is_admin || mr.roles?.can_manage_messages
      ) || false;
    }

    if (!isAuthor && !isServerOwner && !hasManagePermission) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete message
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
