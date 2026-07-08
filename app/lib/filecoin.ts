import lighthouse from '@lighthouse-web3/sdk';
import { MemorySnapshot } from './types';
import dns from 'dns';

// Force Node.js fetch to resolve IPv4 first (fixes ENOTFOUND/fetch failed on IPv4-only networks)
if (typeof window === 'undefined') {
  dns.setDefaultResultOrder('ipv4first');
}

const GATEWAY = 'https://gateway.lighthouse.storage/ipfs';

/**
 * Returns the public gateway URL for a given CID
 */
export function gatewayUrl(cid: string): string {
  return `${GATEWAY}/${cid}`;
}

/**
 * Pins a memory snapshot to Filecoin/IPFS via Lighthouse
 * @param snapshot The MemorySnapshot object
 * @returns The pinned CID (hash)
 */
export async function pinSnapshot(snapshot: MemorySnapshot): Promise<string> {
  const apiKey = process.env.LIGHTHOUSE_API_KEY || '';
  if (!apiKey) {
    throw new Error('LIGHTHOUSE_API_KEY environment variable is not defined!');
  }

  const json = JSON.stringify(snapshot, null, 2);
  
  let response;
  try {
    // Use uploadText for reliable Node.js server execution without File/Blob class incompatibilities
    response = await lighthouse.uploadText(json, apiKey);
  } catch (err: any) {
    console.error('[Lighthouse Upload Error] Failed to connect to Lighthouse API:', err.message || err);
    if (err.cause) {
      console.error('[Lighthouse Upload Error] Root Cause:', err.cause);
    }
    throw new Error(`Lighthouse upload failed: ${err.message || err}`);
  }
  
  if (!response || !response.data || !response.data.Hash) {
    throw new Error('Failed to pin snapshot to Lighthouse: Invalid response format');
  }

  return response.data.Hash;
}

/**
 * Fetches a snapshot from Filecoin/IPFS via a list of public gateways (with fallback)
 * @param cid The CID of the snapshot
 * @returns The MemorySnapshot object
 */
export async function fetchSnapshot(cid: string): Promise<MemorySnapshot> {
  // --- STRATEGY 1: Authenticated Lighthouse API download (fastest, no propagation delay) ---
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (apiKey) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000);
      const lighthouseRes = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        }
      });
      clearTimeout(id);

      if (lighthouseRes.ok) {
        console.log(`[fetchSnapshot] Retrieved CID ${cid} via authenticated Lighthouse gateway.`);
        return await lighthouseRes.json() as MemorySnapshot;
      }
      console.warn(`[fetchSnapshot] Authenticated Lighthouse gateway returned ${lighthouseRes.status} for CID ${cid}, falling back to public gateways.`);
    } catch (err: any) {
      console.warn(`[fetchSnapshot] Authenticated Lighthouse fetch failed:`, err.message || err);
    }
  }

  // --- STRATEGY 2: Public IPFS gateway fallback ---
  const customGateway = process.env.LIGHTHOUSE_GATEWAY || process.env.NEXT_PUBLIC_LIGHTHOUSE_GATEWAY;
  
  const gateways = [
    ...(customGateway ? [customGateway.replace(/\/$/, '')] : []),
    'https://w3s.link/ipfs',
    'https://nftstorage.link/ipfs',
    'https://gw.crustfiles.app/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.io/ipfs',
    'https://dweb.link/ipfs',
    'https://gateway.pinata.cloud/ipfs',
  ];

  let lastError: any = null;
  
  for (const gateway of gateways) {
    const url = `${gateway}/${cid}`;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        return data as MemorySnapshot;
      }
      
      console.warn(`Gateway ${gateway} returned status ${response.status} for CID ${cid}`);
      lastError = new Error(`Status ${response.status}`);
    } catch (err: any) {
      console.warn(`Failed to fetch from gateway ${gateway} for CID ${cid}:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`Failed to fetch CID ${cid} from all IPFS gateways. Last error: ${lastError?.message || lastError}`);
}

/**
 * Walks the CID chain from the latest CID back to the genesis snapshot.
 * Prepend each snapshot so the resulting array is chronological (genesis first, latest last).
 * @param latestCid The latest CID in the chain
 * @returns Array of MemorySnapshots in chronological order
 */
export async function walkChain(latestCid: string): Promise<MemorySnapshot[]> {
  const snapshots: MemorySnapshot[] = [];
  let currentCid: string | null = latestCid;

  // Track visited CIDs to prevent infinite loops from circular references
  const visited = new Set<string>();

  while (currentCid) {
    if (visited.has(currentCid)) {
      console.warn(`Circular reference detected in CID chain at: ${currentCid}`);
      break;
    }
    visited.add(currentCid);

    try {
      const snapshot = await fetchSnapshot(currentCid);
      snapshots.unshift(snapshot); // Prepend so older snapshots come first
      currentCid = snapshot.prev_cid;
    } catch (err) {
      console.error(`Error walking chain at CID ${currentCid}:`, err);
      // Stop walking if a snapshot is unreachable
      break;
    }
  }

  return snapshots;
}

/**
 * Verifies the integrity of the CID chain starting from the latest CID.
 * Checks that every node is reachable and fetches successfully.
 * @param latestCid The latest CID in the chain
 */
export async function verifyChain(latestCid: string): Promise<{
  valid: boolean;
  checked: number;
  broken_at?: string;
}> {
  let currentCid: string | null = latestCid;
  let checked = 0;
  const visited = new Set<string>();

  while (currentCid) {
    if (visited.has(currentCid)) {
      return { valid: false, checked, broken_at: currentCid };
    }
    visited.add(currentCid);

    try {
      const snapshot = await fetchSnapshot(currentCid);
      checked++;
      currentCid = snapshot.prev_cid;
    } catch (err) {
      return { valid: false, checked, broken_at: currentCid || undefined };
    }
  }

  return { valid: true, checked };
}
