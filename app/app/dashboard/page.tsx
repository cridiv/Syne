'use client';

import React, { useState, useEffect } from 'react';
import SessionSidebar from '../../components/SessionSidebar';
import ChatPanel from '../../components/ChatPanel';
import MemoryFeed, { MemoryFeedEntry } from '../../components/MemoryFeed';
import { SessionIndex, MemorySnapshot } from '../../lib/types';
import Navbar from '../components/Navbar';

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

        // Cache the snapshot in localStorage by CID for instant local resume (avoids gateway reads)
        try {
            localStorage.setItem(`syne_snap_${data.cid}`, JSON.stringify(data.new_snapshot));
        } catch {/* storage quota exceeded, non-critical */ }

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
        setStatusMessage('Loading session from local cache...');

        try {
            // --- LOCAL WALK: Walk the chain from localStorage (instant, no gateway needed) ---
            const localSnapshots: any[] = [];
            let currentCid: string | null = cid;
            const reconstructedCids: string[] = [];

            while (currentCid) {
                const cached = localStorage.getItem(`syne_snap_${currentCid}`);
                if (!cached) break; // CID not in local cache, need to fall back to gateway
                const snap = JSON.parse(cached);
                localSnapshots.unshift(snap); // prepend (oldest first)
                reconstructedCids.unshift(currentCid);
                currentCid = snap.prev_cid || null;
            }

            if (localSnapshots.length > 0 && reconstructedCids[reconstructedCids.length - 1] === cid) {
                // Full chain recovered from localStorage
                setStatusMessage('✓ Session restored from local cache!');
                const latestSnap = localSnapshots[localSnapshots.length - 1];

                const loadedMessages = latestSnap.entries.map((ent: any) => ({
                    role: ent.role,
                    content: ent.content,
                }));
                setMessages(loadedMessages);
                setWorkingMemory(latestSnap.agent_working_memory);
                setLatestSnapshot(latestSnap);

                const formattedFeed: MemoryFeedEntry[] = localSnapshots.map((snap: any, index: number) => {
                    const snapCid = reconstructedCids[index];
                    const agentEntry = snap.entries.find((ent: any) => ent.role === 'agent');
                    return {
                        cid: snapCid,
                        snapshot_index: snap.snapshot_index,
                        timestamp: snap.created_at,
                        memory_tags: agentEntry?.memory_tags || [],
                        gateway_url: `https://gateway.lighthouse.storage/ipfs/${snapCid}`,
                    };
                }).reverse();

                setMemoryFeed(formattedFeed);
                setSessionId(id);
                setLatestCid(cid);
                setChainValid('valid'); // locally consistent
                setTimeout(() => setStatusMessage(''), 3000);
                return;
            }

            // --- GATEWAY FALLBACK: Local cache incomplete, try the resume API ---
            setStatusMessage('Reconnecting to Filecoin storage gateway...');
            const res = await fetch(`/api/session/resume?cid=${cid}`);
            if (!res.ok) {
                throw new Error('Failed to resolve CID chain from gateway');
            }

            const data = await res.json();

            // 1. Reconstruct chat history entries from snapshots
            const snapshots = data.snapshots || [];
            const latestSnapshot = snapshots[snapshots.length - 1];

            if (latestSnapshot && latestSnapshot.entries) {
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

            const snapCids: string[] = [];
            let nextCid = cid;
            for (let i = snapshots.length - 1; i >= 0; i--) {
                snapCids[i] = nextCid;
                nextCid = snapshots[i].prev_cid;
            }

            const formattedFeed: MemoryFeedEntry[] = snapshots.map((snap: any, index: number) => {
                const snapCid = snapCids[index];
                const agentEntry = snap.entries.find((ent: any) => ent.role === 'agent');
                return {
                    cid: snapCid,
                    snapshot_index: snap.snapshot_index,
                    timestamp: snap.created_at,
                    memory_tags: agentEntry?.memory_tags || [],
                    gateway_url: `https://gateway.lighthouse.storage/ipfs/${snapCid}`,
                };
            }).reverse();

            setMemoryFeed(formattedFeed);
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
        setStatusMessage('Querying Lighthouse network to verify pinned nodes...');

        try {
            // 1. Gather all CIDs in the chain from localStorage
            const cidsToVerify: string[] = [];
            let currentCid: string | null = latestCid;

            while (currentCid) {
                cidsToVerify.push(currentCid);
                const cached = localStorage.getItem(`syne_snap_${currentCid}`);
                if (!cached) break;
                const snap = JSON.parse(cached);
                currentCid = snap.prev_cid || null;
            }

            // 2. Query the verify API to check if these CIDs are actively pinned on Filecoin/Lighthouse
            const res = await fetch('/api/session/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cids: cidsToVerify })
            });

            if (!res.ok) {
                let errorMsg = 'Verification failed';
                try {
                    const text = await res.text();
                    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
                    const h1Match = text.match(/<h1>([^<]+)<\/h1>/i);
                    if (titleMatch && titleMatch[1]) {
                        errorMsg = titleMatch[1].trim();
                    } else if (h1Match && h1Match[1]) {
                        errorMsg = h1Match[1].trim();
                    } else {
                        errorMsg = `HTTP Error ${res.status}`;
                    }
                } catch (_) {
                    errorMsg = `HTTP Error ${res.status}`;
                }
                throw new Error(errorMsg);
            }
            const data = await res.json();

            setChainValid(data.valid ? 'valid' : 'broken');
            setStatusMessage(
                data.valid
                    ? `✓ Verified all ${data.checked} chain nodes: Pinned & intact on Filecoin/Lighthouse!`
                    : `⚠️ Verification failed: Chain broken at CID ${data.broken_at}`
            );
            setTimeout(() => setStatusMessage(''), 5000);
        } catch (err) {
            console.error(err);
            setChainValid('broken');
            setStatusMessage('⚠️ Chain verification failed due to network error.');
        }
    };

    return (
        <div 
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                width: "100vw",
                background: "var(--bg)",
                color: "var(--text)",
                overflow: "hidden",
                userSelect: "none",
            }}
        >
            <Navbar />
            <div 
                style={{
                    display: "flex",
                    flex: 1,
                    height: "calc(100vh - 56px)",
                    overflow: "hidden",
                }}
            >
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
                <div 
                    style={{
                        flex: 1,
                        height: "100%",
                        borderRight: "1px solid var(--border)",
                    }}
                >
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
            </div>
        </div>
    );
}
