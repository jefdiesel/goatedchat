import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET - List DM channels for current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get DM channels where user is a participant
    const { data: participations, error } = await supabase
      .from('dm_participants')
      .select(`
        dm_channel_id,
        dm_channels (
          id,
          is_group,
          name,
          owner_id,
          updated_at
        )
      `)
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch DMs' }, { status: 500 });
    }

    // Get other participants for each channel
    const channelIds = participations?.map(p => p.dm_channel_id) || [];

    if (channelIds.length === 0) {
      return NextResponse.json({ channels: [] });
    }

    const { data: allParticipants } = await supabase
      .from('dm_participants')
      .select(`
        dm_channel_id,
        user_id,
        users (
          id,
          wallet_address,
          ethscription_name,
          avatar_url,
          status
        )
      `)
      .in('dm_channel_id', channelIds);

    // Build channel data
    const channels = participations?.map(p => {
      const channel = p.dm_channels as any;
      const participants = allParticipants
        ?.filter(ap => ap.dm_channel_id === p.dm_channel_id && ap.user_id !== session.userId)
        .map(ap => ap.users) || [];

      return {
        id: channel.id,
        is_group: channel.is_group,
        name: channel.name,
        owner_id: channel.owner_id,
        updated_at: channel.updated_at,
        participants,
      };
    }) || [];

    // Sort by updated_at
    channels.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('DM list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a DM channel
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_ids, is_group = false, name } = await request.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // For 1-on-1 DMs, check if channel already exists
    if (!is_group && user_ids.length === 1) {
      const otherUserId = user_ids[0];

      // Find existing DM channel between these two users
      const { data: existingChannels } = await supabase
        .from('dm_participants')
        .select('dm_channel_id')
        .eq('user_id', session.userId);

      const { data: otherChannels } = await supabase
        .from('dm_participants')
        .select('dm_channel_id')
        .eq('user_id', otherUserId);

      const myChannelIds = existingChannels?.map(c => c.dm_channel_id) || [];
      const otherChannelIds = otherChannels?.map(c => c.dm_channel_id) || [];

      const commonChannelIds = myChannelIds.filter(id => otherChannelIds.includes(id));

      if (commonChannelIds.length > 0) {
        // Check if any is a 1-on-1 DM (not a group)
        const { data: channel } = await supabase
          .from('dm_channels')
          .select('*')
          .eq('id', commonChannelIds[0])
          .eq('is_group', false)
          .single();

        if (channel) {
          return NextResponse.json({ channel, existing: true });
        }
      }
    }

    // Create new DM channel
    const { data: channel, error: channelError } = await supabase
      .from('dm_channels')
      .insert({
        is_group,
        name: is_group ? name : null,
        owner_id: is_group ? session.userId : null,
      })
      .select()
      .single();

    if (channelError) {
      return NextResponse.json({ error: 'Failed to create DM' }, { status: 500 });
    }

    // Add all participants including the creator
    const allUserIds = [...new Set([session.userId, ...user_ids])];
    await supabase.from('dm_participants').insert(
      allUserIds.map(userId => ({
        dm_channel_id: channel.id,
        user_id: userId,
      }))
    );

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Create DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
