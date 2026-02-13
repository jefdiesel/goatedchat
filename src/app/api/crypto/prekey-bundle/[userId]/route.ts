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

    // Get user's public keys
    const { data: keys, error: keysError } = await supabase
      .from('user_public_keys')
      .select('*')
      .eq('user_id', userId)
      .order('key_version', { ascending: false })
      .limit(1)
      .single();

    if (keysError) {
      if (keysError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User has no registered keys' },
          { status: 404 }
        );
      }
      throw keysError;
    }

    // Get user's prekey bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('dm_key_bundles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (bundleError) {
      if (bundleError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User has no prekey bundle' },
          { status: 404 }
        );
      }
      throw bundleError;
    }

    return NextResponse.json({
      identityPublicKey: keys.identity_public_key,
      signingPublicKey: keys.signing_public_key,
      prekeyPublic: bundle.prekey_public,
      prekeySignature: bundle.prekey_signature,
    });
  } catch (error) {
    console.error('Get prekey bundle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
