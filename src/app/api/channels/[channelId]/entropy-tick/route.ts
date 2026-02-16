import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { calculateDecayRate, isTowerFallen, TOWER_MIN } from '@/lib/entropy';

// POST - Process a decay tick (called by leader client)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const supabase = getSupabaseAdmin();

    // Verify channel exists and entropy is enabled
    const { data: channel } = await supabase
      .from('channels')
      .select('id, server_id, entropy_enabled')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (!channel.entropy_enabled) {
      return NextResponse.json({ error: 'Entropy not enabled' }, { status: 400 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('server_members')
      .select('id')
      .eq('server_id', channel.server_id)
      .eq('user_id', session.userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get current entropy state
    const { data: state, error: stateError } = await supabase
      .from('channel_entropy_state')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (stateError || !state) {
      return NextResponse.json({ error: 'Entropy state not found' }, { status: 404 });
    }

    // Check if tower has already fallen
    if (isTowerFallen(state.integrity_tower)) {
      return NextResponse.json({
        entropyState: state,
        isDestroyed: true,
      });
    }

    // Calculate elapsed time since last tick
    const lastTick = new Date(state.last_decay_tick).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - lastTick) / 60000;

    // Debounce: only process if at least 2.5 seconds have passed
    if (elapsedMinutes < 2.5 / 60) {
      return NextResponse.json({
        entropyState: state,
        isDestroyed: false,
        skipped: true,
      });
    }

    // Get message count for pressure calculation
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId);

    // Calculate decay
    const decay = calculateDecayRate(
      messageCount || 0,
      elapsedMinutes,
      state.integrity_tower
    );

    // Apply decay
    const newIntegrity = Math.max(TOWER_MIN, Math.floor(state.integrity_tower - decay));
    const newCorruptionPass = state.corruption_pass + 1;

    // Update state
    const { data: updatedState, error: updateError } = await supabase
      .from('channel_entropy_state')
      .update({
        integrity_tower: newIntegrity,
        corruption_pass: newCorruptionPass,
        last_decay_tick: new Date().toISOString(),
      })
      .eq('channel_id', channelId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update entropy state:', updateError);
      return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
    }

    // If tower just fell, delete all messages
    if (isTowerFallen(newIntegrity) && !isTowerFallen(state.integrity_tower)) {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('channel_id', channelId);

      if (deleteError) {
        console.error('Failed to delete messages:', deleteError);
      }
    }

    return NextResponse.json({
      entropyState: updatedState,
      isDestroyed: isTowerFallen(newIntegrity),
      decay,
    });
  } catch (error) {
    console.error('Entropy tick error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
