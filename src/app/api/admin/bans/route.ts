import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List banned wallets
export async function GET() {
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

    const { data: bans, error } = await supabase
      .from('banned_wallets')
      .select(`
        *,
        banned_by_user:users!banned_by (
          id,
          wallet_address,
          ethscription_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bans:', error);
      return NextResponse.json({ error: 'Failed to fetch bans' }, { status: 500 });
    }

    return NextResponse.json({ bans: bans || [] });
  } catch (error) {
    console.error('Bans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Ban a wallet
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address, reason } = await request.json();

    if (!wallet_address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
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

    // Add ban
    const { data: ban, error } = await supabase
      .from('banned_wallets')
      .insert({
        wallet_address: wallet_address.toLowerCase(),
        reason: reason || null,
        banned_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Wallet already banned' }, { status: 400 });
      }
      console.error('Error banning wallet:', error);
      return NextResponse.json({ error: 'Failed to ban wallet' }, { status: 500 });
    }

    // Also delete the user if they exist
    await supabase
      .from('users')
      .delete()
      .eq('wallet_address', wallet_address.toLowerCase());

    return NextResponse.json({ ban });
  } catch (error) {
    console.error('Ban error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unban a wallet
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const banId = searchParams.get('banId');

    if (!banId) {
      return NextResponse.json({ error: 'Ban ID required' }, { status: 400 });
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

    const { error } = await supabase
      .from('banned_wallets')
      .delete()
      .eq('id', banId);

    if (error) {
      console.error('Error unbanning:', error);
      return NextResponse.json({ error: 'Failed to unban' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unban error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
