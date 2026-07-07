'use client';

import React, { useState, useEffect } from 'react';
import SessionSidebar from '../components/SessionSidebar';
import ChatPanel from '../components/ChatPanel';
import MemoryFeed, { MemoryFeedEntry } from '../components/MemoryFeed';
import { SessionIndex, MemorySnapshot } from '../lib/types';

export default function Home() {
  // Core State
  const [sessionId, setSessionId] = useState<string>('');
  const [latestCid, setLatestCid] = useState<string | null>(null);
  
  // Chat & Memory State
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([]);
  const [memoryFeed, setMemoryFeed] = useState<MemoryFeedEntry[]>([]);
  const [chainValid, setChainValid] = useState<'valid' | 'broken' | 'verifying' | 'unverified'>('unverified');
  const [workingMemory, setWorkingMemory] = useState<{
    key_facts: string[];
    open_questions: string[];
    current_focus: string;
  } | null>(null);

  // UI Control State
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [sessionsIndex, setSessionsIndex] = useState<SessionIndex | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<MemorySnapshot | null>(null);

  // Initialize a session ID on mount
  useEffect(() => {
    setSessionId(self.crypto.randomUUID());
  }, []);

  // Handler for when the agent successfully pins a turn to Filecoin
  const handleMemoryWritten = (data: {
    cid: string;
    snapshot_index: number;
    timestamp: string;
    memory_tags: string[];
    gateway_url: string;
    working_memory: any;
    session_title?: string;
    new_snapshot: MemorySnapshot;
  }) => {
    // 1. Update Head pointer
    setLatestCid(data.cid);
    setLatestSnapshot(data.new_snapshot);
    
    // 2. Prepend to live feed
    const newFeedEntry: MemoryFeedEntry = {
      cid: data.cid,
      snapshot_index: data.snapshot_index,
      timestamp: data.timestamp,
      memory_tags: data.memory_tags,
      gateway_url: data.gateway_url,
    };
    setMemoryFeed((prev) => [newFeedEntry, ...prev]);

    // 3. Update active working memory
    setWorkingMemory(data.working_memory);
    setChainValid('unverified'); // Unverified until run through explicit chain walk audit

    // 4. Update and Persist Session Index
    if (sessionsIndex) {
      const existingSession = sessionsIndex.sessions[sessionId];
      const title = data.session_title || existingSession?.title || `Research Session #${data.snapshot_index}`;
      
      const updatedIndex: SessionIndex = {
        sessions: {
          ...sessionsIndex.sessions,
          [sessionId]: {
            title,
            root_cid: existingSession?.root_cid || data.cid,
            latest_cid: data.cid,
            snapshot_count: data.snapshot_index + 1,
            created_at: existingSession?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }
      };

      setSessionsIndex(updatedIndex);
      localStorage.setItem('syne_session_index', JSON.stringify(updatedIndex));
    }
  };

  // Handler to resume a past session by walking its CID chain
  const handleSelectSession = async (id: string, cid: string) => {
    setIsResuming(true);
    setStatusMessage('Reconnecting to Filecoin storage gateway...');
    
    try {
      const res = await fetch(`/api/session/resume?cid=${cid}`);
      if (!res.ok) {
        throw new Error('Failed to resolve CID chain from gateway');
      }

      const data = await res.json();
      
      // 1. Reconstruct chat history entries from snapshots
      const snapshots = data.snapshots || [];
      const latestSnapshot = snapshots[snapshots.length - 1];

      if (latestSnapshot && latestSnapshot.entries) {
        // Map Snapshot entries back into the local chat bubbles
        const loadedMessages = latestSnapshot.entries.map((ent: any) => ({
          role: ent.role,
          content: ent.content,
        }));
        setMessages(loadedMessages);
        setWorkingMemory(latestSnapshot.agent_working_memory);
        setLatestSnapshot(latestSnapshot);
      } else {
        setMessages([]);
        setWorkingMemory(null);
        setLatestSnapshot(null);
      }

      // 2. Reconstruct Memory Feed in reverse chronological order (newest first)
      const feedEntries: MemoryFeedEntry[] = snapshots.map((snap: any) => ({
        cid: snap.prev_cid || 'Genesis', // we can use the actual CID of the snapshot here
        snapshot_index: snap.snapshot_index,
        timestamp: snap.created_at,
        memory_tags: snap.entries.find((ent: any) => ent.role === 'agent')?.memory_tags || [],
        gateway_url: `https://gateway.lighthouse.storage/ipfs/${snap.prev_cid || ''}`, // will override
      }));

      // Wait, let's fix the feedEntries CID assignments:
      // When we walk the chain, we have an array of snapshots. But snapshots don't store their own CID inside!
      // They only store prev_cid. However, the resume API returns the snapshots in order.
      // Let's refine how we populate CIDs in feed. The walkChain doesn't return the CIDs of each block,
      // it returns the content. But we can match them if the API returned CIDs, or we can resolve it.
      // Wait, let's see what the resume API returns:
      // app/api/session/resume/route.ts returns `{ snapshots, integrity }`
      // Where `snapshots` is an array of `MemorySnapshot` returned by `walkChain`.
      // Wait! `walkChain` fetches the snapshots but doesn't attach the CIDs of each snapshot to them.
      // However, we can reconstruct the CIDs in order if we know the chain!
      // Let's check how the chain links: genesis has prev_cid = null. Snapshot 1 has prev_cid = genesis CID.
      // So the CID of snapshot[i] is the `prev_cid` of snapshot[i+1]!
      // And the CID of the latest snapshot is the `cid` parameter we passed to the API.
      // This is a beautiful property of the linked list! Let's reconstruct the CIDs:
      const reconstructedCids: string[] = [];
      let nextCid = cid;
      for (let i = snapshots.length - 1; i >= 0; i--) {
        reconstructedCids[i] = nextCid;
        nextCid = snapshots[i].prev_cid; // moves backwards
      }

      const formattedFeed: MemoryFeedEntry[] = snapshots.map((snap: any, index: number) => {
        const snapCid = reconstructedCids[index];
        // Extract tags of the agent response in this snapshot
        const agentEntry = snap.entries.find((ent: any) => ent.role === 'agent');
        
        return {
          cid: snapCid,
          snapshot_index: snap.snapshot_index,
          timestamp: snap.created_at,
          memory_tags: agentEntry?.memory_tags || [],
          gateway_url: `https://gateway.lighthouse.storage/ipfs/${snapCid}`
        };
      }).reverse(); // newest first

      setMemoryFeed(formattedFeed);

      // 3. Set Session state
      setSessionId(id);
      setLatestCid(cid);
      setChainValid(data.integrity.valid ? 'valid' : 'broken');
      setStatusMessage(`✓ Session "${data.session_title}" successfully restored from Filecoin!`);

      setTimeout(() => setStatusMessage(''), 4000);

    } catch (err: any) {
      console.error(err);
      alert(`Could not resume session: ${err.message || 'Verification failure'}`);
      setStatusMessage('Resume connection failed');
    } finally {
      setIsResuming(false);
    }
  };

  // Handler to initialize a new session
  const handleNewSession = () => {
    setSessionId(self.crypto.randomUUID());
    setLatestCid(null);
    setLatestSnapshot(null);
    setMessages([]);
    setMemoryFeed([]);
    setWorkingMemory(null);
    setChainValid('unverified');
    setStatusMessage('New research environment initialized.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Handler to perform full cryptographic walk & audit on demand
  const handleVerifyChain = async () => {
    if (!latestCid) return;
    setChainValid('verifying');
    
    try {
      const res = await fetch(`/api/session/resume?cid=${latestCid}`);
      if (!res.ok) throw new Error('Gateway check failed');
      const data = await res.json();
      
      setChainValid(data.integrity?.valid ? 'valid' : 'broken');
      setStatusMessage(
        data.integrity?.valid 
          ? `✓ Audited ${data.integrity.checked} chain nodes: Cryptographically secure & intact!`
          : `⚠️ Verification failed: Chain broken at CID ${data.integrity.broken_at}`
      );
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setChainValid('broken');
      setStatusMessage('⚠️ Chain verification failed due to gateway timeout.');
    }
  };

  return (
    <main className="flex h-screen w-screen bg-gray-950 text-gray-200 overflow-hidden font-mono select-none">
      {/* 1. Left Sidebar: Local pointer indexes */}
      <SessionSidebar
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isResuming={isResuming}
        sessionsIndex={sessionsIndex}
        setSessionsIndex={setSessionsIndex}
      />

      {/* 2. Center Chat panel */}
      <div className="flex-1 h-full border-r border-gray-800">
        <ChatPanel
          sessionId={sessionId}
          latestCid={latestCid}
          latestSnapshot={latestSnapshot}
          messages={messages}
          setMessages={setMessages}
          onMemoryWritten={handleMemoryWritten}
          statusMessage={statusMessage}
        />
      </div>

      {/* 3. Right Sidebar: Filecoin Memory feed */}
      <MemoryFeed
        entries={memoryFeed}
        chainValid={chainValid}
        onVerifyChain={handleVerifyChain}
        latestCid={latestCid}
        workingMemory={workingMemory}
      />
    </main>
  );
}
