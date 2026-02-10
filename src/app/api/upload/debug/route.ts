import { NextResponse } from 'next/server';

export async function GET() {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim() || '';
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim() || 'gated-chat';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() || '';
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() || '';
  const cdnUrl = process.env.CLOUDFLARE_CDN_URL?.trim() || '';

  return NextResponse.json({
    endpoint: endpoint ? `${endpoint.slice(0, 20)}...` : 'NOT SET',
    endpointLength: endpoint.length,
    bucket,
    accessKeyIdLength: accessKeyId.length,
    accessKeyIdPrefix: accessKeyId.slice(0, 4) || 'NOT SET',
    secretKeyLength: secretKey.length,
    secretKeySet: secretKey.length > 0,
    cdnUrl: cdnUrl || 'NOT SET',
  });
}
