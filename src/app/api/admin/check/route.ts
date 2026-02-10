import { NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ isAdmin: false });
    }

    const supabase = getSupabaseAdmin();

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', session.userId)
      .single();

    return NextResponse.json({
      isAdmin: !!admin,
      role: admin?.role || null,
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
