// Ethscription name resolution utilities

const ETHSCRIPTIONS_API = 'https://api.ethscriptions.com/v2';

interface EthscriptionResult {
  exists: boolean;
  ethscription?: {
    current_owner: string;
    content_uri: string;
    sha: string;
  };
}

export async function resolveEthscriptionName(name: string): Promise<string | null> {
  try {
    // Compute SHA256 of data:,name
    const content = `data:,${name}`;
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const res = await fetch(`${ETHSCRIPTIONS_API}/ethscriptions/exists/0x${sha}`);
    const data: { result: EthscriptionResult } = await res.json();

    if (data.result?.exists && data.result.ethscription) {
      return data.result.ethscription.current_owner.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

export async function getEthscriptionNameForWallet(wallet: string): Promise<string | null> {
  try {
    // Get ethscriptions owned by this wallet, looking for simple text names
    const res = await fetch(
      `${ETHSCRIPTIONS_API}/ethscriptions?current_owner=${wallet.toLowerCase()}&content_type=text/plain&per_page=100`
    );
    const data = await res.json();

    if (!data.result?.length) return null;

    // Find the first valid name (data:,name format)
    for (const eth of data.result) {
      const uri = eth.content_uri;
      if (uri?.startsWith('data:,')) {
        const name = uri.slice(6); // Remove 'data:,'
        // Validate it's a simple name (alphanumeric, hyphen, or CJK)
        if (/^[a-z0-9\u4e00-\u9fff-]+$/i.test(name) && name.length <= 32) {
          return name.toLowerCase();
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function validateEthscriptionName(name: string): boolean {
  return /^[a-z0-9\u4e00-\u9fff-]+$/.test(name) && name.length >= 1 && name.length <= 32;
}
