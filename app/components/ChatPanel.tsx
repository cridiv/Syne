'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Brain, Check, Terminal } from 'lucide-react';
import { MemoryEntry } from '../lib/types';

interface ChatPanelProps {
  sessionId: string;
  latestCid: string | null;
  messages: { role: 'user' | 'agent'; content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'agent'; content: string }[]>>;
  onMemoryWritten: (entry: {
    cid: string;
    snapshot_index: number;
    timestamp: string;
    memory_tags: string[];
    gateway_url: string;
    working_memory: any;
  }) => void;
  statusMessage?: string;
}

export default function ChatPanel({
  sessionId,
  latestCid,
  messages,
  setMessages,
  onMemoryWritten,
  statusMessage
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, status]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setStatus('Thinking...');

    try {
      // 1. Loading state transitions
      setTimeout(() => setStatus('Pinning memory to Filecoin...'), 1500);

      // 2. Fetch agent turn API
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          session_id: sessionId,
          latest_cid: latestCid,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await res.json();

      // 3. Append response
      setMessages((prev) => [...prev, { role: 'agent', content: data.response }]);
      setStatus(`✓ Pinned to Filecoin — CID #${data.snapshot_index}`);

      // 4. Callback to update feed and latestCid
      onMemoryWritten({
        cid: data.new_cid,
        snapshot_index: data.snapshot_index,
        timestamp: new Date().toISOString(),
        memory_tags: data.memory_tags || [],
        gateway_url: data.gateway_url,
        working_memory: data.working_memory,
      });

      // Clear status after 4 seconds
      setTimeout(() => setStatus(''), 4000);

    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message || 'Check console logs'}`);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: `⚠️ Error occurred: ${err.message || 'Unable to complete agent turn.'}` }
      ]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 font-mono select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <div>
            <h1 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={12} className="text-green-400" /> Syne_Terminal v1.0
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Decentralized memory agent pipeline active
            </p>
          </div>
        </div>
        {latestCid && (
          <div className="text-[9px] px-2 py-0.5 rounded bg-green-950/20 border border-green-900/30 text-green-400 max-w-[150px] truncate" title={latestCid}>
            HEAD: {latestCid.slice(0, 8)}...{latestCid.slice(-6)}
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-3">
            <div className="h-10 w-10 rounded-lg bg-green-900/10 border border-green-800/30 flex items-center justify-center text-green-400 animate-pulse">
              <Brain size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Initialize Connection</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Send a message to spin up the agent. Every thought, fact, and response is written permanently to Filecoin and chained cryptographically.
              </p>
            </div>
            <div className="w-full text-left bg-gray-900/40 border border-gray-800/50 rounded p-2.5 text-[10px] text-gray-500">
              <span className="text-green-400"># Try asking:</span>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>"Research the Filecoin ecosystem and proof mechanisms."</li>
                <li>"Analyze Lighthouse.storage and its decentralized benefits."</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded border p-3 text-[12px] leading-relaxed shadow-sm transition-all duration-300
                ${
                  m.role === 'user'
                    ? 'bg-green-950/30 text-green-100 border-green-800/50 shadow-green-950/10'
                    : 'bg-gray-900/50 text-gray-200 border-gray-800/60 shadow-black/20'
                }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[9px] uppercase tracking-widest select-none">
                <span className={m.role === 'user' ? 'text-green-500' : 'text-gray-500'}>
                  [{m.role}]
                </span>
                <span className="text-gray-600">
                  {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="whitespace-pre-wrap selection:bg-green-800 selection:text-white">
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900/40 border border-gray-850 rounded p-3 flex items-center gap-2.5 text-[11px] text-gray-400">
              <Loader2 size={13} className="animate-spin text-green-400" />
              <span>{status}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className="px-4 py-1.5 border-t border-gray-800 text-[10px] text-green-400 bg-green-950/10 flex items-center gap-1.5 animate-fadeIn">
          <Check size={10} />
          {statusMessage}
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-gray-800 bg-gray-950">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
            placeholder={loading ? 'Agent resolving turn...' : 'Enter prompt query...'}
            className="flex-1 bg-gray-900/60 border border-gray-800 rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-650 focus:outline-none focus:border-green-800/80 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 bg-green-800 text-green-100 hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-800 rounded transition-colors flex items-center justify-center"
            title="Send query"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
