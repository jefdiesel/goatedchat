import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Get members with a specific role
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    const serverId = searchParams.get('serverId');

    if (!roleId && !serverId) {
      return NextResponse.json({ error: 'roleId or serverId required' }, { status: 400 });
    }

    if (roleId) {
      // Get members with this role
      const { data: memberRoles, error } = await supabase
        .from('member_roles')
        .select(`
          id,
          member:server_members!member_id (
            id,
            user:users!user_id (
              id,
              wallet_address,
              ethscription_name,
              avatar_url
            )
          )
        `)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error fetching role members:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
      }

      return NextResponse.json({ members: memberRoles || [] });
    }

    // Get all members of a server with their roles
    const { data: members, error } = await supabase
      .from('server_members')
      .select(`
        id,
        user:users!user_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url
        ),
        roles:member_roles (
          role:roles!role_id (
            id,
            name,
            color
          )
        )
      `)
      .eq('server_id', serverId);

    if (error) {
      console.error('Error fetching server members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error('Role members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Assign a role to a member
export async function POST(request: NextRequest) {
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

    const { member_id, role_id } = await request.json();

    if (!member_id || !role_id) {
      return NextResponse.json({ error: 'member_id and role_id required' }, { status: 400 });
    }

    const { data: memberRole, error } = await supabase
      .from('member_roles')
      .insert({ member_id, role_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Member already has this role' }, { status: 400 });
      }
      console.error('Error assigning role:', error);
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
    }

    return NextResponse.json({ memberRole });
  } catch (error) {
    console.error('Assign role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a role from a member
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const roleId = searchParams.get('roleId');

    if (!memberId || !roleId) {
      return NextResponse.json({ error: 'memberId and roleId required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('member_roles')
      .delete()
      .eq('member_id', memberId)
      .eq('role_id', roleId);

    if (error) {
      console.error('Error removing role:', error);
      return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
