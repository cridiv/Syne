'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, FolderPlus, Clock, Cpu } from 'lucide-react';
import { SessionIndex } from '../lib/types';

interface SessionSidebarProps {
  currentSessionId: string;
  onSelectSession: (sessionId: string, latestCid: string) => void;
  onNewSession: () => void;
  // Trigger loading state during resume
  isResuming: boolean;
  // Let the parent provide session index updates
  sessionsIndex: SessionIndex | null;
  setSessionsIndex: React.Dispatch<React.SetStateAction<SessionIndex | null>>;
}

export default function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onNewSession,
  isResuming,
  sessionsIndex,
  setSessionsIndex
}: SessionSidebarProps) {
  
  // Load sessions index from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('syne_session_index');
      if (stored) {
        setSessionsIndex(JSON.parse(stored));
      } else {
        setSessionsIndex({ sessions: {} });
      }
    } catch (err) {
      console.error('Failed to read session index from localStorage:', err);
      setSessionsIndex({ sessions: {} });
    }
  }, [setSessionsIndex]);

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionsIndex) return;

    const confirmed = window.confirm('Are you sure you want to delete this session local index pointer? (This will not delete the data on Filecoin)');
    if (!confirmed) return;

    const updated = { ...sessionsIndex };
    delete updated.sessions[sessionId];
    
    setSessionsIndex(updated);
    localStorage.setItem('syne_session_index', JSON.stringify(updated));

    if (sessionId === currentSessionId) {
      onNewSession();
    }
  };

  const getSessionsList = () => {
    if (!sessionsIndex || !sessionsIndex.sessions) return [];
    return Object.entries(sessionsIndex.sessions).map(([id, info]) => ({
      id,
      ...info,
    })).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  };

  const sessions = getSessionsList();

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col font-mono text-gray-150 h-full overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-green-500 animate-pulse" />
          <span className="text-[12px] font-bold text-white uppercase tracking-widest">Sessions</span>
        </div>
        <button
          onClick={onNewSession}
          disabled={isResuming}
          className="p-1 text-green-400 border border-green-800/40 rounded bg-green-950/10 hover:bg-green-900/20 active:bg-green-900/30 transition-all cursor-pointer disabled:opacity-40"
          title="New session"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-850 scrollbar-track-transparent">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-650 space-y-2">
            <FolderPlus size={18} className="mx-auto text-gray-700" />
            <p className="text-[10px]">No active sessions</p>
            <p className="text-[8px] text-gray-700 leading-normal max-w-[170px] mx-auto">
              Start a new session on the right. Pinned data resides forever on Filecoin gateways.
            </p>
          </div>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === currentSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => {
                  if (!isActive && !isResuming) {
                    onSelectSession(sess.id, sess.latest_cid);
                  }
                }}
                className={`group border rounded p-2.5 flex justify-between items-start gap-2 transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? 'bg-green-950/20 border-green-800 text-green-300'
                      : 'bg-gray-900/10 border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-250'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-bold truncate leading-snug">
                    {sess.title}
                  </h4>
                  
                  <div className="flex items-center gap-1.5 mt-2 text-[8px] text-gray-500 uppercase">
                    <Clock size={8} />
                    <span>
                      {new Date(sess.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span>•</span>
                    <span>{sess.snapshot_count} blocks</span>
                  </div>
                </div>

                <button
                  onClick={(e) => deleteSession(sess.id, e)}
                  disabled={isResuming}
                  className="text-gray-700 hover:text-red-400 p-0.5 rounded hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 disabled:opacity-0"
                  title="Remove session pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Connection info footer */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/10 shrink-0 text-[8px] text-gray-650 flex flex-col gap-1 select-none">
        <div className="flex justify-between items-center">
          <span>Storage protocol:</span>
          <span className="text-green-500 font-bold">Filecoin (IPFS)</span>
        </div>
        <div className="flex justify-between items-center">
          <span>SDK client:</span>
          <span>Lighthouse Web3</span>
        </div>
        {isResuming && (
          <div className="mt-2 text-center text-yellow-500 animate-pulse text-[9px]">
            ⚡ Resolving CID chain...
          </div>
        )}
      </div>
    </div>
  );
}
