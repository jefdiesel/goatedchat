import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (!user) {
      await clearSessionCookie();
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        ethscription_name: user.ethscription_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();

    if (session) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('users')
        .update({ status: 'offline' })
        .eq('id', session.userId);
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
