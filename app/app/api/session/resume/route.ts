import { NextRequest, NextResponse } from 'next/server';
import { walkChain, verifyChain } from '@/lib/filecoin';

/**
 * GET handler to resume a session from Filecoin and verify its integrity.
 * 
 * Query params:
 * - cid (string): The latest CID of the session to walk back from
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json({ error: 'cid query parameter is required' }, { status: 400 });
    }

    console.log(`Resuming session starting from latest CID: ${cid}`);

    // Call walkChain and verifyChain in parallel to reconstruct state and audit integrity
    const [snapshots, integrity] = await Promise.all([
      walkChain(cid),
      verifyChain(cid)
    ]);

    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const entryCount = latestSnapshot ? latestSnapshot.entries.length : 0;
    const sessionTitle = latestSnapshot ? latestSnapshot.session_title : 'Untitled';

    return NextResponse.json({
      snapshots,
      integrity,
      entry_count: entryCount,
      session_title: sessionTitle,
    });

  } catch (error: any) {
    console.error('Error in session resume API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while resuming the session' },
      { status: 500 }
    );
  }
}
