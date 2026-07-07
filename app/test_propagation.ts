import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { pinSnapshot } from './lib/filecoin';
import { MemorySnapshot } from './lib/types';
import * as crypto from 'crypto';

async function testPropagation() {
  console.log('Testing IPFS propagation across gateways...');
  const sessionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const testSnapshot: MemorySnapshot = {
    version: '1.0',
    session_id: sessionId,
    session_title: 'Propagation Test',
    snapshot_index: 0,
    created_at: timestamp,
    prev_cid: null,
    entries: [
      {
        id: crypto.randomUUID(),
        timestamp,
        role: 'user',
        content: 'This is a propagation test message to verify public gateways.',
        memory_tags: ['test', 'propagation'],
        confidence: 1.0,
      }
    ],
    agent_working_memory: {
      key_facts: ['Testing gateways'],
      open_questions: [],
      current_focus: 'Checking DHT propagation speed',
    },
  };

  console.log('Pinning snapshot to Lighthouse...');
  const cid = await pinSnapshot(testSnapshot);
  console.log(`Pinned! CID: ${cid}`);

  const gateways = [
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.io/ipfs',
    'https://dweb.link/ipfs',
    'https://gateway.pinata.cloud/ipfs',
    'https://gw.crustfiles.app/ipfs',
    'https://w3s.link/ipfs',
    'https://storry.tv/ipfs',
  ];

  console.log('Beginning polling loop (up to 2 minutes)...');
  const startTime = Date.now();
  const timeoutMs = 120000; // 2 minutes

  let resolved = false;
  while (Date.now() - startTime < timeoutMs && !resolved) {
    console.log(`\n--- Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s ---`);
    for (const gateway of gateways) {
      const url = `${gateway}/${cid}`;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 8000); // 8s timeout for each check
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        
        console.log(`Gateway [${gateway}]: status = ${res.status}`);
        if (res.status === 200) {
          const data = await res.json();
          console.log(`✓ SUCCESS! Resolved via ${gateway}`);
          console.log(`Content title: ${data.session_title}`);
          resolved = true;
          break;
        }
      } catch (err: any) {
        console.log(`Gateway [${gateway}]: error = ${err.message || err}`);
      }
    }
    
    if (!resolved) {
      console.log('Not yet resolved. Waiting 10 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  if (resolved) {
    console.log('\n✓ Test completed: CID has successfully propagated to public gateways!');
  } else {
    console.log('\n✗ Test completed: CID did not propagate within 2 minutes.');
  }
}

testPropagation();
