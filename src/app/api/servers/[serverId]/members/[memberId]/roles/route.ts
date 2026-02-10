import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// PUT - Update member's roles
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId, memberId } = await params;
    const { role_ids } = await request.json();
    const supabase = getSupabaseAdmin();

    // Check if user is owner or admin
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();

    const isOwner = server?.owner_id === session.userId;

    if (!isOwner) {
      // Check if user has admin role
      const { data: membership } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', serverId)
        .eq('user_id', session.userId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Not a member' }, { status: 403 });
      }

      const { data: memberRoles } = await supabase
        .from('member_roles')
        .select('roles(is_admin)')
        .eq('member_id', membership.id);

      const hasAdminRole = memberRoles?.some((mr: any) => mr.roles?.is_admin);

      if (!hasAdminRole) {
        return NextResponse.json({ error: 'No permission' }, { status: 403 });
      }
    }

    // Verify the member exists in this server
    const { data: targetMember } = await supabase
      .from('server_members')
      .select('id, user_id')
      .eq('id', memberId)
      .eq('server_id', serverId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't modify owner's roles
    if (targetMember.user_id === server?.owner_id) {
      return NextResponse.json({ error: 'Cannot modify owner roles' }, { status: 400 });
    }

    // Delete existing roles
    await supabase
      .from('member_roles')
      .delete()
      .eq('member_id', memberId);

    // Add new roles
    if (role_ids && role_ids.length > 0) {
      const memberRoles = role_ids.map((roleId: string) => ({
        member_id: memberId,
        role_id: roleId,
      }));

      const { error } = await supabase
        .from('member_roles')
        .insert(memberRoles);

      if (error) {
        console.error('Error adding roles:', error);
        return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update member roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
