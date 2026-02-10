import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List roles for a server
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

    // Check membership
    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', serverId)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get roles with token gates
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_token_gates (*)
      `)
      .eq('server_id', serverId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Check if user is owner or has manage roles permission
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    const isOwner = server?.owner_id === session.userId;

    if (!isOwner) {
      const { data: member } = await supabase
        .from('server_members')
        .select(`
          id,
          member_roles (
            roles (is_admin, can_manage_roles)
          )
        `)
        .eq('server_id', serverId)
        .eq('user_id', session.userId)
        .single();

      const hasPermission = member?.member_roles?.some(
        (mr: any) => mr.roles?.is_admin || mr.roles?.can_manage_roles
      );

      if (!hasPermission) {
        return NextResponse.json({ error: 'No permission' }, { status: 403 });
      }
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('roles')
      .select('position')
      .eq('server_id', serverId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position ?? -1) + 1;

    // Create role
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        server_id: serverId,
        name: body.name,
        color: body.color || null,
        position,
        is_admin: body.is_admin || false,
        can_manage_channels: body.can_manage_channels || false,
        can_manage_roles: body.can_manage_roles || false,
        can_manage_messages: body.can_manage_messages || false,
        can_kick_members: body.can_kick_members || false,
        can_ban_members: body.can_ban_members || false,
        can_invite: body.can_invite ?? true,
        can_send_messages: body.can_send_messages ?? true,
        can_attach_files: body.can_attach_files ?? true,
        can_add_reactions: body.can_add_reactions ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
    }

    // Check if user is owner
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    if (server?.owner_id !== session.userId) {
      return NextResponse.json({ error: 'Only owner can edit roles' }, { status: 403 });
    }

    // Update role
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        name: body.name,
        color: body.color || null,
        is_admin: body.is_admin || false,
      })
      .eq('id', roleId)
      .eq('server_id', serverId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const supabase = getSupabaseAdmin();

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
    }

    // Check if user is owner
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    if (server?.owner_id !== session.userId) {
      return NextResponse.json({ error: 'Only owner can delete roles' }, { status: 403 });
    }

    // Delete role (cascades to member_roles)
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('server_id', serverId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
