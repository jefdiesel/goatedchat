import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List all discoverable servers
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get all servers with member counts
    const { data: servers, error: serverError } = await supabase
      .from('servers')
      .select(`
        id,
        name,
        icon_url,
        description,
        website_url,
        created_at,
        owner:users!owner_id (
          id,
          ethscription_name,
          wallet_address
        )
      `)
      .order('created_at', { ascending: false });

    if (serverError) {
      console.error('Error fetching servers:', serverError);
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }

    // Get member counts for each server
    const serverIds = servers?.map(s => s.id) || [];
    const { data: memberCounts } = await supabase
      .from('server_members')
      .select('server_id')
      .in('server_id', serverIds);

    const countMap: Record<string, number> = {};
    memberCounts?.forEach(m => {
      countMap[m.server_id] = (countMap[m.server_id] || 0) + 1;
    });

    // Get servers user is already a member of
    const { data: userMemberships } = await supabase
      .from('server_members')
      .select('server_id')
      .eq('user_id', session.userId);

    const userServerIds = new Set(userMemberships?.map(m => m.server_id) || []);

    // Add member count and membership status to each server
    const serversWithCounts = servers?.map(s => ({
      ...s,
      member_count: countMap[s.id] || 0,
      is_member: userServerIds.has(s.id),
    })) || [];

    return NextResponse.json({ servers: serversWithCounts });
  } catch (error) {
    console.error('Discover servers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
