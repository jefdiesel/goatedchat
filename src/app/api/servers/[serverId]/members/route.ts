import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List members for a server
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
      .select('id')
      .eq('server_id', serverId)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get members with user info and roles
    const { data: members, error } = await supabase
      .from('server_members')
      .select(`
        id,
        nickname,
        joined_at,
        user_id,
        users (
          id,
          wallet_address,
          ethscription_name,
          avatar_url,
          bio,
          status
        ),
        member_roles (
          role_id,
          roles (
            id,
            name,
            color,
            position,
            is_admin
          )
        )
      `)
      .eq('server_id', serverId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Get server owner
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    const formattedMembers = members?.map(m => ({
      id: m.id,
      user_id: m.user_id,
      nickname: m.nickname,
      joined_at: m.joined_at,
      is_owner: m.user_id === server?.owner_id,
      user: m.users,
      roles: m.member_roles?.map((mr: any) => mr.roles).filter(Boolean) || [],
    })) || [];

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
