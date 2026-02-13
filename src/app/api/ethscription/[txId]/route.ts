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

    // Fetch ethscription metadata to get content_uri
    const metadataUrl = `https://api.ethscriptions.com/v2/ethscriptions/${txId}`;
    const res = await fetch(metadataUrl);

    if (!res.ok) {
      return NextResponse.json({ error: 'Ethscription not found' }, { status: 404 });
    }

    const data = await res.json();
    const contentUri = data.content_uri || data.result?.content_uri;

    if (!contentUri) {
      return NextResponse.json({ error: 'No content found' }, { status: 404 });
    }

    // If it's a data URI, return it directly
    if (contentUri.startsWith('data:')) {
      // Parse the data URI to get content type and data
      const match = contentUri.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
      if (match) {
        const mimeType = match[1] || 'application/octet-stream';
        const isBase64 = contentUri.includes(';base64,');
        const content = match[2];

        if (isBase64) {
          const buffer = Buffer.from(content, 'base64');
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=31536000',
            },
          });
        } else {
          return new NextResponse(decodeURIComponent(content), {
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=31536000',
            },
          });
        }
      }
    }

    // Fallback: return the content URI as JSON
    return NextResponse.json({ dataUri: contentUri });
  } catch (error) {
    console.error('Ethscription proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch ethscription' }, { status: 500 });
  }
}
