export interface MemoryEntry {
  id: string;                    // uuid
  timestamp: string;             // ISO 8601
  role: 'user' | 'agent';
  content: string;               // Message text
  memory_tags: string[];         // Agent-extracted key concepts
  confidence: number;            // 0–1, agent self-assessed
}

export interface AgentWorkingMemory {
  key_facts: string[];
  open_questions: string[];
  current_focus: string;
}

export interface MemorySnapshot {
  version: '1.0';
  session_id: string;            // uuid, stable for the whole session
  session_title: string;         // Agent-generated after first turn
  snapshot_index: number;        // 0, 1, 2, ... increments each turn
  created_at: string;
  prev_cid: string | null;       // null for genesis snapshot
  entries: MemoryEntry[];        // Full history up to this point
  agent_working_memory: AgentWorkingMemory; // What the agent remembers going into next turn
}

export interface CIDChainNode {
  cid: string;
  snapshot_index: number;
  timestamp: string;
  session_id: string;
}

export interface SessionIndex {
  sessions: {
    [session_id: string]: {
      title: string;
      root_cid: string;           // Genesis CID (snapshot_index: 0)
      latest_cid: string;         // Most recent pinned CID
      snapshot_count: number;
      created_at: string;
      updated_at: string;
    };
  };
}
