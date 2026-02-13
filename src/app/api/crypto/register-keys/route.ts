import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { identityPublicKey, signingPublicKey, authMethod } = body;

    if (!identityPublicKey || !signingPublicKey) {
      return NextResponse.json(
        { error: 'Missing required key fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the current highest key version for this user
    const { data: existingKeys } = await supabase
      .from('user_public_keys')
      .select('key_version')
      .eq('user_id', session.userId)
      .order('key_version', { ascending: false })
      .limit(1);

    const keyVersion = existingKeys && existingKeys.length > 0
      ? existingKeys[0].key_version + 1
      : 1;

    // Insert the new public keys
    const { error: keyError } = await supabase
      .from('user_public_keys')
      .insert({
        user_id: session.userId,
        identity_public_key: identityPublicKey,
        signing_public_key: signingPublicKey,
        key_version: keyVersion,
      });

    if (keyError) {
      console.error('Error registering keys:', keyError);
      return NextResponse.json(
        { error: 'Failed to register keys' },
        { status: 500 }
      );
    }

    // Update user's auth method if provided
    if (authMethod && (authMethod === 'wallet' || authMethod === 'seedphrase')) {
      await supabase
        .from('users')
        .update({ auth_method: authMethod })
        .eq('id', session.userId);
    }

    return NextResponse.json({
      success: true,
      keyVersion,
    });
  } catch (error) {
    console.error('Register keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get the user's current public keys
    const { data: keys, error } = await supabase
      .from('user_public_keys')
      .select('*')
      .eq('user_id', session.userId)
      .order('key_version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No keys registered
        return NextResponse.json({ keys: null });
      }
      throw error;
    }

    return NextResponse.json({
      keys: {
        identityPublicKey: keys.identity_public_key,
        signingPublicKey: keys.signing_public_key,
        keyVersion: keys.key_version,
      },
    });
  } catch (error) {
    console.error('Get keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
