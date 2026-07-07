'use client';

import React from 'react';
import { ExternalLink, Database, ShieldCheck, ShieldAlert, FileText, Activity } from 'lucide-react';
import ChainIntegrityBadge from './ChainIntegrityBadge';

export interface MemoryFeedEntry {
  cid: string;
  snapshot_index: number;
  timestamp: string;
  memory_tags: string[];
  gateway_url: string;
}

interface MemoryFeedProps {
  entries: MemoryFeedEntry[];
  chainValid: 'valid' | 'broken' | 'verifying' | 'unverified';
  onVerifyChain: () => Promise<void>;
  latestCid: string | null;
  workingMemory: {
    key_facts: string[];
    open_questions: string[];
    current_focus: string;
  } | null;
}

export default function MemoryFeed({
  entries,
  chainValid,
  onVerifyChain,
  latestCid,
  workingMemory
}: MemoryFeedProps) {
  return (
    <div className="w-[340px] flex flex-col border-l border-gray-800 bg-gray-950 font-mono text-gray-150 h-full overflow-hidden select-none">
      {/* Title Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
            <Database size={12} /> Filecoin Memory Chain
          </h2>
          <p className="text-[9px] text-gray-500 mt-0.5">{entries.length} snapshots committed</p>
        </div>
        <ChainIntegrityBadge status={chainValid} />
      </div>

      {/* Verify Action Button */}
      {latestCid && (
        <div className="px-4 py-2 bg-gray-900/30 border-b border-gray-800 shrink-0">
          <button
            onClick={onVerifyChain}
            disabled={chainValid === 'verifying'}
            className="w-full py-1.5 text-[10px] font-bold border border-green-800 text-green-400 
                       rounded bg-green-950/5 hover:bg-green-900/20 active:bg-green-900/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Activity size={10} className={chainValid === 'verifying' ? 'animate-spin' : ''} />
            Verify Chain Integrity
          </button>
        </div>
      )}

      {/* Internal Panels: Split into Working Memory & Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-850 scrollbar-thin scrollbar-thumb-gray-850 scrollbar-track-transparent">
        
        {/* Panel 1: Agent Working Memory (Agent Brain State) */}
        {workingMemory && (
          <div className="p-4 space-y-3.5 bg-green-950/5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-green-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />
              Agent Working Memory
            </h3>
            
            {workingMemory.current_focus && (
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Current Focus</p>
                <p className="text-[11px] text-gray-300 italic bg-gray-900/30 border border-gray-850/50 p-2 rounded">
                  "{workingMemory.current_focus}"
                </p>
              </div>
            )}

            {workingMemory.key_facts.length > 0 && (
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Key Facts Remembered</p>
                <ul className="text-[10px] text-gray-400 space-y-1 list-none">
                  {workingMemory.key_facts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span className="flex-1 leading-relaxed">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {workingMemory.open_questions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Open Questions</p>
                <ul className="text-[10px] text-gray-400 space-y-1 list-none">
                  {workingMemory.open_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-yellow-600 mt-0.5">?</span>
                      <span className="flex-1 leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Panel 2: Live CID Log */}
        <div className="p-4 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <FileText size={11} /> CID Pin Log
          </h3>

          <div className="space-y-2.5">
            {entries.map((entry) => (
              <div
                key={entry.cid}
                className="border border-gray-900 hover:border-green-900/50 rounded p-2.5 bg-gray-900/30 
                           transition-all duration-300 group flex justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold bg-green-950/40 text-green-400 border border-green-900/30 px-1 py-0.5 rounded leading-none">
                      #{entry.snapshot_index}
                    </span>
                    <span className="text-[9px] text-gray-600">
                      {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 font-mono break-all leading-normal group-hover:text-green-300 transition-colors">
                    {entry.cid}
                  </p>
                  {entry.memory_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.memory_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[8px] bg-gray-900/80 border border-gray-800 text-gray-500 px-1 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <a
                  href={entry.gateway_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-400 transition-colors shrink-0 flex items-start pt-0.5 cursor-pointer"
                  title="View snapshot JSON on gateway"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}

            {entries.length === 0 && (
              <div className="text-center py-10 text-gray-600 bg-gray-900/10 border border-dashed border-gray-900 rounded">
                <div className="text-base mb-1.5">💾</div>
                <p className="text-[10px]">No snapshots pinned</p>
                <p className="text-[9px] mt-1 text-gray-700 max-w-[200px] mx-auto leading-relaxed">
                  Start a new research chat to begin committing memory blocks to Filecoin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
