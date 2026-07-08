import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks if a CID is pinned on Lighthouse using the API key.
 */
async function isCidPinned(cid: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.lighthouse.storage/api/lighthouse/file_info?cid=${cid}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.status === 200;
  } catch (err) {
    console.error(`[verify] Error checking pin status for CID ${cid}:`, err);
    return false;
  }
}

/**
 * POST handler to verify the presence of a list of CIDs on the Lighthouse/Filecoin network.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cids } = body;

    if (!cids || !Array.isArray(cids)) {
      return NextResponse.json({ error: 'cids array is required' }, { status: 400 });
    }

    const apiKey = process.env.LIGHTHOUSE_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'LIGHTHOUSE_API_KEY is not defined' }, { status: 500 });
    }

    console.log(`[verify] Verifying ${cids.length} chain nodes on Lighthouse...`);

    // Verify all CIDs in parallel
    const results = await Promise.all(cids.map(async (cid) => {
      const pinned = await isCidPinned(cid, apiKey);
      return { cid, pinned };
    }));

    // Find the first broken CID, if any
    const brokenNode = results.find(r => !r.pinned);

    if (brokenNode) {
      console.warn(`[verify] Chain broken! CID ${brokenNode.cid} is not pinned.`);
      return NextResponse.json({
        valid: false,
        broken_at: brokenNode.cid,
        checked: cids.length
      });
    }

    console.log(`[verify] Chain is valid! Checked ${cids.length} nodes successfully.`);
    return NextResponse.json({
      valid: true,
      checked: cids.length
    });

  } catch (error: any) {
    console.error('[verify] Verification API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
