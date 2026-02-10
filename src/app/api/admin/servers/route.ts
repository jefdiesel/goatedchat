import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

async function checkAdmin(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', userId)
    .single();
  return admin;
}

async function logAudit(adminId: string, action: string, targetType: string, targetId: string, metadata?: any) {
  const supabase = getSupabaseAdmin();
  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
}

// GET - List all servers (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await checkAdmin(session.userId);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('servers')
      .select(`
        *,
        owner:users!servers_owner_id_fkey(wallet_address, ethscription_name),
        _count:server_members(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: servers, count, error } = await query;

    if (error) {
      console.error('Fetch servers error:', error);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    return NextResponse.json({
      servers,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Admin servers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Force delete a server (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await checkAdmin(session.userId);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get server info for audit
    const { data: server } = await supabase
      .from('servers')
      .select('name, owner_id')
      .eq('id', serverId)
      .single();

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Delete server (cascades)
    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('id', serverId);

    if (error) {
      console.error('Delete server error:', error);
      return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
    }

    // Log audit
    await logAudit(session.userId, 'DELETE_SERVER', 'server', serverId, {
      name: server.name,
      owner_id: server.owner_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
