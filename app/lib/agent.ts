import { callModel, ModelMessage } from './model';
import { MemorySnapshot, MemoryEntry, AgentWorkingMemory } from './types';
import * as crypto from 'crypto';

export const SYSTEM_PROMPT = `You are Syne, an AI research agent with a persistent, verifiable memory stored permanently on Filecoin.

Your memory is public and append-only. Every conversation turn you take is written to Filecoin with a unique Content Identifier (CID).

After each response, you will output a structured JSON format containing your reasoning, natural response, tags, and working memory update.

Respond strictly in raw JSON (no markdown formatting, no code block backticks) with this structure:
{
  "response": "Your natural language response to the user, answering their request directly and referencing what you remember from previous turns.",
  "memory_tags": ["3 to 5 keyword tags for this turn, e.g. Filecoin, IPFS, encryption"],
  "confidence": 0.0 to 1.0 (float reflecting your self-assessed accuracy/completeness),
  "working_memory": {
    "key_facts": ["up to 10 bullet points summarizing key facts established so far in the conversation"],
    "open_questions": ["questions still to be answered or researched"],
    "current_focus": "One sentence describing what the conversation is currently exploring"
  }
}`;

export interface AgentTurnInput {
  user_message: string;
  previous_snapshot: MemorySnapshot | null;
  session_id: string;
}

export interface AgentTurnOutput {
  response: string;
  new_snapshot: MemorySnapshot;
  memory_tags: string[];
  model_duration: number;
}

/**
 * Runs a single conversational turn with the agent.
 * Constructs the history context, queries the DeepSeek model, parses the response,
 * and formats a new MemorySnapshot.
 */
export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnOutput> {
  const { user_message, previous_snapshot, session_id } = input;

  // 1. Build memory context from the previous snapshot
  let context = 'This is a new session. No prior memory is established.';
  if (previous_snapshot) {
    const wm = previous_snapshot.agent_working_memory;
    context = `MEMORY CONTEXT (from Filecoin, CID chain of ${previous_snapshot.snapshot_index + 1} snapshots):
Key facts established so far: ${wm.key_facts.length > 0 ? wm.key_facts.join('; ') : 'None'}
Open questions: ${wm.open_questions.length > 0 ? wm.open_questions.join('; ') : 'None'}
Current focus: ${wm.current_focus || 'None'}

Full history summary: ${previous_snapshot.entries.length} exchanges recorded.`;
  }

  // 2. Build the messages payload
  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `${context}\n\nUser message: ${user_message}`,
    }
  ];

  // 3. Query the Llama model on NVIDIA NIM
  console.log('Sending agent query to Llama-3.1-8b-instruct (NVIDIA NIM)...');
  const result = await callModel(messages, { temperature: 0.2 });
  const rawContent = result.content;

  // Log reasoning output if returned
  if (result.reasoning) {
    console.log('\n--- DeepSeek Reasoning ---');
    console.log(result.reasoning);
    console.log('-------------------------\n');
  }

  // 4. Parse the structured output
  let parsed: {
    response: string;
    memory_tags: string[];
    confidence: number;
    working_memory: AgentWorkingMemory;
  };

  try {
    // Clean up potential markdown code fences from the output
    const cleanJSON = rawContent.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleanJSON);
  } catch (err) {
    console.warn('Failed to parse agent JSON output, falling back to raw response:', err);
    parsed = {
      response: rawContent,
      memory_tags: ['general'],
      confidence: 0.7,
      working_memory: {
        key_facts: previous_snapshot?.agent_working_memory.key_facts ?? [],
        open_questions: previous_snapshot?.agent_working_memory.open_questions ?? [],
        current_focus: 'Resolving parsing error',
      },
    };
  }

  // 5. Append new user and agent messages to the entries list
  const prevEntries = previous_snapshot?.entries ?? [];
  const newUserEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    role: 'user',
    content: user_message,
    memory_tags: [],
    confidence: 1.0,
  };

  const newAgentEntry: MemoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    role: 'agent',
    content: parsed.response,
    memory_tags: parsed.memory_tags,
    confidence: parsed.confidence,
  };

  const newEntries = [...prevEntries, newUserEntry, newAgentEntry];

  // 6. Generate session title if it's the first turn
  const sessionTitle = previous_snapshot?.session_title ??
    `Research: ${user_message.slice(0, 50)}${user_message.length > 50 ? '...' : ''}`;

  // 7. Assemble the new memory snapshot (prev_cid will be set by the API handler)
  const newSnapshot: MemorySnapshot = {
    version: '1.0',
    session_id,
    session_title: sessionTitle,
    snapshot_index: (previous_snapshot?.snapshot_index ?? -1) + 1,
    created_at: new Date().toISOString(),
    prev_cid: null, // to be populated before pinning
    entries: newEntries,
    agent_working_memory: parsed.working_memory,
  };

  return {
    response: parsed.response,
    new_snapshot: newSnapshot,
    memory_tags: parsed.memory_tags,
    model_duration: result.duration,
  };
}
