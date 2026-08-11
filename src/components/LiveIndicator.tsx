import React from 'react';

interface LiveIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ className = '', showText = true }) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold tracking-wider ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
      </span>
      {showText && <span className="font-orbitron uppercase tracking-widest text-[10px]">LIVE REALTIME</span>}
    </div>
  );
};
