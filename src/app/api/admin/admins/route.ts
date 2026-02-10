import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

async function checkSuperAdmin(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .single();
  return admin;
}

// GET - List all admins
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', session.userId)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: admins, error } = await supabase
      .from('platform_admins')
      .select(`
        *,
        user:users!user_id (
          id,
          wallet_address,
          ethscription_name,
          avatar_url
        ),
        assigned_by_user:users!assigned_by (
          id,
          wallet_address,
          ethscription_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Admin list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new admin (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdmin = await checkSuperAdmin(session.userId);
    if (!superAdmin) {
      return NextResponse.json({ error: 'Super admin required' }, { status: 403 });
    }

    const { user_id, role = 'admin' } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already admin
    const { data: existing } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
    }

    // Add admin
    const { data: admin, error } = await supabase
      .from('platform_admins')
      .insert({
        user_id,
        role,
        assigned_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 });
    }

    // Log action
    await supabase.from('admin_audit_log').insert({
      admin_id: session.userId,
      action: 'add_admin',
      target_type: 'user',
      target_id: user_id,
      metadata: { role },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Add admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove an admin (super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdmin = await checkSuperAdmin(session.userId);
    if (!superAdmin) {
      return NextResponse.json({ error: 'Super admin required' }, { status: 403 });
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Can't remove yourself
    if (user_id === session.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('platform_admins')
      .delete()
      .eq('user_id', user_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 });
    }

    // Log action
    await supabase.from('admin_audit_log').insert({
      admin_id: session.userId,
      action: 'remove_admin',
      target_type: 'user',
      target_id: user_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
