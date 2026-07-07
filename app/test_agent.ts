import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runAgentTurn } from './lib/agent';
import * as crypto from 'crypto';

async function testAgent() {
  console.log('--- STARTING AGENT TURN TEST ---');
  
  const sessionId = crypto.randomUUID();
  const testInput = {
    user_message: 'Please summarize the Filecoin ecosystem in three short bullet points.',
    previous_snapshot: null,
    session_id: sessionId,
  };

  console.log(`Sending message: "${testInput.user_message}"`);
  
  try {
    const start = Date.now();
    const result = await runAgentTurn(testInput);
    const duration = (Date.now() - start) / 1000;
    
    console.log(`Agent responded in ${duration.toFixed(2)}s`);
    console.log('\n--- Agent response content ---');
    console.log(result.response);
    console.log('------------------------------');
    
    console.log('\n--- Output Snapshot Details ---');
    console.log(`Session ID: ${result.new_snapshot.session_id}`);
    console.log(`Session Title: ${result.new_snapshot.session_title}`);
    console.log(`Snapshot Index: ${result.new_snapshot.snapshot_index}`);
    console.log(`Created At: ${result.new_snapshot.created_at}`);
    console.log(`Prev CID: ${result.new_snapshot.prev_cid}`);
    console.log(`Total History Entries: ${result.new_snapshot.entries.length}`);
    console.log(`Tags: ${result.memory_tags.join(', ')}`);
    
    console.log('\n--- Agent Working Memory ---');
    console.log('Key Facts:', result.new_snapshot.agent_working_memory.key_facts);
    console.log('Open Questions:', result.new_snapshot.agent_working_memory.open_questions);
    console.log('Current Focus:', result.new_snapshot.agent_working_memory.current_focus);
    
    // Verify properties
    if (
      result.response &&
      result.new_snapshot &&
      result.new_snapshot.agent_working_memory &&
      Array.isArray(result.new_snapshot.agent_working_memory.key_facts) &&
      result.new_snapshot.entries.length === 2 // 1 user message + 1 agent message
    ) {
      console.log('\n✓ SUCCESS: Agent output snapshot is fully conformant with data schema!');
    } else {
      console.error('\n✗ ERROR: Agent output snapshot lacks expected structure.');
    }
    
  } catch (err: any) {
    console.error('\n✗ ERROR: Agent turn failed:', err.message || err);
    process.exit(1);
  }
}

testAgent();
