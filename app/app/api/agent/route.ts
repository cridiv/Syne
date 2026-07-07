import { NextRequest, NextResponse } from 'next/server';
import { runAgentTurn } from '@/lib/agent';
import { pinSnapshot, fetchSnapshot, gatewayUrl } from '@/lib/filecoin';

/**
 * POST handler to run an agent turn and pin the result to Filecoin via Lighthouse.
 * 
 * Request body:
 * - user_message (string): The message from the user
 * - session_id (string): Unique UUID for the session
 * - latest_cid (string | null): The CID of the previous memory snapshot
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_message, session_id, latest_cid } = body;

    // Validate request inputs
    if (!user_message || !user_message.trim()) {
      return NextResponse.json({ error: 'user_message is required' }, { status: 400 });
    }
    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    // 1. Fetch previous snapshot from Filecoin/IPFS if latest_cid exists
    let previousSnapshot = null;
    if (latest_cid) {
      try {
        console.log(`Fetching previous snapshot from Filecoin for CID: ${latest_cid}`);
        previousSnapshot = await fetchSnapshot(latest_cid);
      } catch (err: any) {
        console.warn(`Could not fetch previous snapshot (resolving as null, starting fresh):`, err.message || err);
      }
    }

    // 2. Run the agent turn (calls DeepSeek model)
    const { response, new_snapshot, memory_tags } = await runAgentTurn({
      user_message,
      previous_snapshot: previousSnapshot,
      session_id,
    });

    // 3. Set the prev_cid link to create the chain
    new_snapshot.prev_cid = latest_cid || null;

    // 4. Pin the new snapshot to Filecoin
    console.log(`Pinning new snapshot (index ${new_snapshot.snapshot_index}) to Filecoin...`);
    const newCid = await pinSnapshot(new_snapshot);
    console.log(`Successfully pinned! New CID: ${newCid}`);

    // 5. Return response and metadata
    return NextResponse.json({
      response,
      new_cid: newCid,
      snapshot_index: new_snapshot.snapshot_index,
      session_title: new_snapshot.session_title,
      memory_tags,
      working_memory: new_snapshot.agent_working_memory,
      gateway_url: gatewayUrl(newCid),
    });

  } catch (error: any) {
    console.error('Error in agent API route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during the agent turn' },
      { status: 500 }
    );
  }
}
