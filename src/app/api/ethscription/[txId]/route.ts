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

    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    // Check if it's a data URI (text response)
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      const text = await res.text();
      if (text.startsWith('data:')) {
        return NextResponse.json({ dataUri: text });
      }
      // Return text as-is
      return new NextResponse(text, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // For binary content (images), use arrayBuffer to preserve data
    const buffer = await res.arrayBuffer();

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
