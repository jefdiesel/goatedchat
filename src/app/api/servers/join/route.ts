import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// POST - Join a server via invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invite_code } = await request.json();

    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find server by invite code
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('invite_code', invite_code)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', server.id)
      .eq('user_id', session.userId)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member', server }, { status: 400 });
    }

    // Add user as member
    const { data: member, error: memberError } = await supabase
      .from('server_members')
      .insert({
        server_id: server.id,
        user_id: session.userId,
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error joining server:', memberError);
      return NextResponse.json({ error: 'Failed to join server' }, { status: 500 });
    }

    // Get default role and assign it
    const { data: defaultRole } = await supabase
      .from('roles')
      .select('id')
      .eq('server_id', server.id)
      .eq('name', 'Member')
      .single();

    if (defaultRole && member) {
      await supabase.from('member_roles').insert({
        member_id: member.id,
        role_id: defaultRole.id,
      });
    }

    return NextResponse.json({ server, member });
  } catch (error) {
    console.error('Join server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
