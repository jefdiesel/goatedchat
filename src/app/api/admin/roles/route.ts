import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List all roles for all servers (admin only)
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
    const serverId = searchParams.get('serverId');

    let query = supabase
      .from('roles')
      .select(`
        *,
        server:servers!server_id (
          id,
          name
        ),
        member_count:member_roles(count)
      `)
      .order('position', { ascending: true });

    if (serverId) {
      query = query.eq('server_id', serverId);
    }

    const { data: roles, error } = await query;

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({ roles: roles || [] });
  } catch (error) {
    console.error('Roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new role (admin only)
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

    const {
      server_id,
      name,
      color,
      is_admin,
      can_manage_channels,
      can_manage_roles,
      can_manage_messages,
      can_kick_members,
      can_ban_members,
      can_invite,
      can_send_messages,
      can_attach_files,
      can_add_reactions
    } = await request.json();

    if (!server_id || !name) {
      return NextResponse.json({ error: 'Server ID and name required' }, { status: 400 });
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('roles')
      .select('position')
      .eq('server_id', server_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position || 0) + 1;

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        server_id,
        name,
        color: color || '#99AAB5',
        position,
        is_admin: is_admin || false,
        can_manage_channels: can_manage_channels || false,
        can_manage_roles: can_manage_roles || false,
        can_manage_messages: can_manage_messages || false,
        can_kick_members: can_kick_members || false,
        can_ban_members: can_ban_members || false,
        can_invite: can_invite !== false,
        can_send_messages: can_send_messages !== false,
        can_attach_files: can_attach_files !== false,
        can_add_reactions: can_add_reactions !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a role (admin only)
export async function PATCH(request: NextRequest) {
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

    const {
      role_id,
      name,
      color,
      is_admin,
      can_manage_channels,
      can_manage_roles,
      can_manage_messages,
      can_kick_members,
      can_ban_members,
      can_invite,
      can_send_messages,
      can_attach_files,
      can_add_reactions
    } = await request.json();

    if (!role_id) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (can_manage_channels !== undefined) updates.can_manage_channels = can_manage_channels;
    if (can_manage_roles !== undefined) updates.can_manage_roles = can_manage_roles;
    if (can_manage_messages !== undefined) updates.can_manage_messages = can_manage_messages;
    if (can_kick_members !== undefined) updates.can_kick_members = can_kick_members;
    if (can_ban_members !== undefined) updates.can_ban_members = can_ban_members;
    if (can_invite !== undefined) updates.can_invite = can_invite;
    if (can_send_messages !== undefined) updates.can_send_messages = can_send_messages;
    if (can_attach_files !== undefined) updates.can_attach_files = can_attach_files;
    if (can_add_reactions !== undefined) updates.can_add_reactions = can_add_reactions;

    const { data: role, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', role_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a role (admin only)
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
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
