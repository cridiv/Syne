import { loadEnvConfig } from '@next/env';
// Load env vars
loadEnvConfig(process.cwd());

import { pinSnapshot, walkChain, verifyChain, gatewayUrl } from './lib/filecoin';
import { MemorySnapshot, MemoryEntry } from './lib/types';
import * as crypto from 'crypto';

async function testChain() {
  console.log('--- STARTING CHAIN INTEGRITY AND WALKING TEST ---');
  
  const sessionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // 1. Define Genesis Snapshot (index 0)
  const genesisEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    timestamp,
    role: 'user',
    content: 'Hello, this is the genesis message.',
    memory_tags: ['genesis', 'start'],
    confidence: 1.0,
  };

  const genesisSnapshot: MemorySnapshot = {
    version: '1.0',
    session_id: sessionId,
    session_title: 'Test Session Chain',
    snapshot_index: 0,
    created_at: timestamp,
    prev_cid: null,
    entries: [genesisEntry],
    agent_working_memory: {
      key_facts: ['First snapshot created'],
      open_questions: ['Will the chain walk succeed?'],
      current_focus: 'Testing Filecoin integration setup',
    },
  };

  console.log('Pinning Genesis Snapshot...');
  const genesisCid = await pinSnapshot(genesisSnapshot);
  console.log(`Genesis Pinned! CID: ${genesisCid}`);
  console.log(`Genesis Gateway URL: ${gatewayUrl(genesisCid)}`);

  // 2. Define Second Snapshot (index 1)
  const secondEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    role: 'agent',
    content: 'Understood. I have recorded the genesis entry.',
    memory_tags: ['reply', 'acknowledge'],
    confidence: 0.95,
  };

  const secondSnapshot: MemorySnapshot = {
    version: '1.0',
    session_id: sessionId,
    session_title: 'Test Session Chain',
    snapshot_index: 1,
    created_at: new Date().toISOString(),
    prev_cid: genesisCid,
    entries: [genesisEntry, secondEntry],
    agent_working_memory: {
      key_facts: ['Genesis snapshot verified', 'Second snapshot created'],
      open_questions: ['Will the walk return both?'],
      current_focus: 'Verifying parent-child mapping',
    },
  };

  console.log('\nPinning Second Snapshot (points to Genesis)...');
  const secondCid = await pinSnapshot(secondSnapshot);
  console.log(`Second Pinned! CID: ${secondCid}`);
  console.log(`Second Gateway URL: ${gatewayUrl(secondCid)}`);

  // 3. Define Third Snapshot (index 2)
  const thirdEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    role: 'user',
    content: 'Let\'s run the walk chain verification now.',
    memory_tags: ['test', 'walk'],
    confidence: 1.0,
  };

  const thirdSnapshot: MemorySnapshot = {
    version: '1.0',
    session_id: sessionId,
    session_title: 'Test Session Chain',
    snapshot_index: 2,
    created_at: new Date().toISOString(),
    prev_cid: secondCid,
    entries: [genesisEntry, secondEntry, thirdEntry],
    agent_working_memory: {
      key_facts: ['Two steps confirmed', 'Ready for walking test'],
      open_questions: [],
      current_focus: 'Traversing the chain',
    },
  };

  console.log('\nPinning Third Snapshot (points to Second)...');
  const thirdCid = await pinSnapshot(thirdSnapshot);
  console.log(`Third Pinned! CID: ${thirdCid}`);
  console.log(`Third Gateway URL: ${gatewayUrl(thirdCid)}`);

  // 4. Test walkChain
  console.log('\n--- WALKING CHAIN BACKWARDS FROM THIRD SNAPSHOT ---');
  console.log(`Starting walk at latest CID: ${thirdCid}`);
  const chain = await walkChain(thirdCid);
  
  console.log(`Walk completed. Received ${chain.length} snapshots.`);
  chain.forEach((snap, idx) => {
    console.log(`  [Snapshot Index ${snap.snapshot_index}] Index: ${snap.snapshot_index}, Session: ${snap.session_id}, Created: ${snap.created_at}, Prev CID: ${snap.prev_cid}`);
  });

  // Check correctness
  if (chain.length === 3 && chain[0].snapshot_index === 0 && chain[2].snapshot_index === 2) {
    console.log('✓ SUCCESS: Chronological ordering of walked chain matches perfectly!');
  } else {
    console.error('✗ ERROR: Walked chain length or order is incorrect!');
  }

  // 5. Test verifyChain
  console.log('\n--- VERIFYING CHAIN INTEGRITY ---');
  const verification = await verifyChain(thirdCid);
  console.log('Verification response:', verification);
  if (verification.valid && verification.checked === 3) {
    console.log('✓ SUCCESS: Chain integrity verified successfully, all 3 CIDs reachable!');
  } else {
    console.error('✗ ERROR: Chain verification failed!');
  }
}

testChain().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
