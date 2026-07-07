import React from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

interface ChainIntegrityBadgeProps {
  status: 'valid' | 'broken' | 'verifying' | 'unverified';
}

export default function ChainIntegrityBadge({ status }: ChainIntegrityBadgeProps) {
  if (status === 'verifying') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/40 animate-pulse">
        <Loader2 size={12} className="animate-spin" /> Verifying...
      </span>
    );
  }

  if (status === 'valid') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-950/40 text-green-400 border border-green-800/40 shadow-sm shadow-green-900/20">
        <ShieldCheck size={13} className="text-green-400" /> Chain valid
      </span>
    );
  }

  if (status === 'broken') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-950/40 text-red-400 border border-red-800/40 shadow-sm shadow-red-900/20">
        <ShieldAlert size={13} className="text-red-400" /> Chain broken
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-900/50 text-gray-500 border border-gray-800/40">
      Unverified
    </span>
  );
}
