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
    const { prekeyPublic, prekeySignature } = body;

    if (!prekeyPublic || !prekeySignature) {
      return NextResponse.json(
        { error: 'Missing required prekey fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Delete existing prekey bundles for this user
    await supabase
      .from('dm_key_bundles')
      .delete()
      .eq('user_id', session.userId);

    // Insert the new prekey bundle
    const { error } = await supabase
      .from('dm_key_bundles')
      .insert({
        user_id: session.userId,
        prekey_public: prekeyPublic,
        prekey_signature: prekeySignature,
      });

    if (error) {
      console.error('Error uploading prekey bundle:', error);
      return NextResponse.json(
        { error: 'Failed to upload prekey bundle' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload prekey bundle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
