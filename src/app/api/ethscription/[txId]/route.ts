import { NextRequest, NextResponse } from 'next/server';

// Proxy ethscription content to avoid CORS issues
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  try {
    const { txId } = await params;

    // Validate tx hash format
    if (!txId.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json({ error: 'Invalid tx hash' }, { status: 400 });
    }

    const contentUrl = `https://api.ethscriptions.com/v2/ethscriptions/${txId}/content`;
    const res = await fetch(contentUrl);

    if (!res.ok) {
      return NextResponse.json({ error: 'Ethscription not found' }, { status: 404 });
    }

    const text = await res.text();

    // If it's a data URI, return it as JSON
    if (text.startsWith('data:')) {
      return NextResponse.json({ dataUri: text });
    }

    // Otherwise proxy the binary content
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(text, 'binary');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Ethscription proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch ethscription' }, { status: 500 });
  }
}
