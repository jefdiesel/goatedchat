import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// Use Node.js runtime for Supabase compatibility
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = getSupabaseAdmin();

  const { data: server } = await supabase
    .from('servers')
    .select('name, icon_url, description')
    .eq('invite_code', code)
    .single();

  const serverName = server?.name || 'Goat Chat Server';
  const iconUrl = server?.icon_url;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #18181b 0%, transparent 50%), radial-gradient(circle at 75% 75%, #18181b 0%, transparent 50%)',
        }}
      >
        {/* Card container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            borderRadius: '32px',
            backgroundColor: '#18181b',
            border: '2px solid #27272a',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Server icon */}
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '32px',
              backgroundColor: '#c3ff00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px',
              overflow: 'hidden',
              border: '4px solid #c3ff00',
            }}
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                width={160}
                height={160}
                style={{
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: '#09090b',
                }}
              >
                {serverName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Server name */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {serverName}
          </div>

          {/* Join text */}
          <div
            style={{
              fontSize: '24px',
              color: '#c3ff00',
              marginBottom: '32px',
            }}
          >
            You&apos;re invited to join
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '20px',
              color: '#71717a',
              textAlign: 'center',
              maxWidth: '500px',
            }}
          >
            Wallet Secure E2EE Community Chat - No Eyeball Scans Required
          </div>
        </div>

        {/* Goat Chat branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#c3ff00',
            }}
          >
            🐐 GOAT CHAT
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
