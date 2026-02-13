import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ code: string }>;
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const supabase = getSupabaseAdmin();

  const { data: server } = await supabase
    .from('servers')
    .select('name, icon_url, description')
    .eq('invite_code', code)
    .single();

  const serverName = server?.name || 'Join Server';
  const description = server?.description || 'Wallet Secure E2EE Community Chat - No Eyeball Scans Required';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goatchat.vercel.app';

  return {
    title: `Join ${serverName} on Goat Chat`,
    description,
    openGraph: {
      title: `Join ${serverName}`,
      description,
      images: [`${baseUrl}/api/og/invite/${code}`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Join ${serverName}`,
      description,
      images: [`${baseUrl}/api/og/invite/${code}`],
    },
  };
}

// This page just redirects to the actual join flow
export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  redirect(`/servers?join=${code}`);
}
