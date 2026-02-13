import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const supabase = getSupabaseAdmin();

    // Get the user's current public keys
    const { data: keys, error } = await supabase
      .from('user_public_keys')
      .select('*')
      .eq('user_id', userId)
      .order('key_version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User has no registered keys' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      identityPublicKey: keys.identity_public_key,
      signingPublicKey: keys.signing_public_key,
      keyVersion: keys.key_version,
    });
  } catch (error) {
    console.error('Get user keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
