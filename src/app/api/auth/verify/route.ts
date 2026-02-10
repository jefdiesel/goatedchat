import { NextRequest, NextResponse } from 'next/server';
import { verifySiweMessage, createSession, setSessionCookie } from '@/lib/siwe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getEthscriptionNameForWallet } from '@/lib/ethscriptions';

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    // Verify SIWE signature
    const result = await verifySiweMessage(message, signature);
    if (!result) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const address = result.address.toLowerCase();
    const supabase = getSupabaseAdmin();

    // Check if user exists
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', address)
      .single();

    // Create user if they don't exist
    if (!user) {
      // Try to get ethscription name
      const ethscriptionName = await getEthscriptionNameForWallet(address);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          wallet_address: address,
          ethscription_name: ethscriptionName,
          status: 'online',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      user = newUser;
    } else {
      // Update status to online
      await supabase
        .from('users')
        .update({ status: 'online' })
        .eq('id', user.id);
    }

    // Create JWT session
    const token = await createSession(address, user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        ethscription_name: user.ethscription_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        status: 'online',
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
