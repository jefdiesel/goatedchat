import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - Get current user profile
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update current user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { display_name, bio, avatar_url, twitter_handle, discord_handle, ens_name, default_server_id } = await request.json();
    const supabase = getSupabaseAdmin();

    const updates: Record<string, any> = {};

    // Only update fields that were provided
    if (display_name !== undefined) {
      updates.ethscription_name = display_name;
    }
    if (bio !== undefined) {
      updates.bio = bio;
    }
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }
    if (twitter_handle !== undefined) {
      // Strip @ if provided
      updates.twitter_handle = twitter_handle?.replace(/^@/, '') || null;
    }
    if (discord_handle !== undefined) {
      updates.discord_handle = discord_handle || null;
    }
    if (ens_name !== undefined) {
      // Ensure .eth suffix
      updates.ens_name = ens_name?.endsWith('.eth') ? ens_name : (ens_name ? `${ens_name}.eth` : null);
    }
    if (default_server_id !== undefined) {
      updates.default_server_id = default_server_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.userId)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
