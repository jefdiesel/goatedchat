import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

// GET - List servers for current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get servers where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('server_members')
      .select(`
        server_id,
        nickname,
        joined_at,
        servers (
          id,
          name,
          owner_id,
          invite_code,
          icon_url,
          created_at
        )
      `)
      .eq('user_id', session.userId);

    if (memberError) {
      console.error('Error fetching servers:', memberError);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    const servers = memberships?.map(m => ({
      ...m.servers,
      nickname: m.nickname,
      joined_at: m.joined_at,
      is_owner: (m.servers as any)?.owner_id === session.userId,
    })) || [];

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Servers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new server
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon_url } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create the server
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert({
        name: name.trim(),
        owner_id: session.userId,
        invite_code: nanoid(8),
        icon_url: icon_url || null,
      })
      .select()
      .single();

    if (serverError) {
      console.error('Error creating server:', serverError);
      return NextResponse.json({ error: 'Failed to create server' }, { status: 500 });
    }

    // Add owner as member
    const { data: member, error: memberError } = await supabase
      .from('server_members')
      .insert({
        server_id: server.id,
        user_id: session.userId,
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding owner as member:', memberError);
    }

    // Create default role
    const { data: defaultRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        server_id: server.id,
        name: 'Member',
        position: 0,
        can_send_messages: true,
        can_attach_files: true,
        can_add_reactions: true,
        can_invite: true,
      })
      .select()
      .single();

    if (roleError) {
      console.error('Error creating default role:', roleError);
    }

    // Assign default role to owner
    if (member && defaultRole) {
      await supabase.from('member_roles').insert({
        member_id: member.id,
        role_id: defaultRole.id,
      });
    }

    // Create default channel
    await supabase.from('channels').insert({
      server_id: server.id,
      name: 'general',
      type: 'text',
      position: 0,
    });

    return NextResponse.json({ server });
  } catch (error) {
    console.error('Create server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
