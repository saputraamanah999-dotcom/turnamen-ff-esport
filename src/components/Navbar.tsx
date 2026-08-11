import React from 'react';
import { Flame, Monitor, Shield, Trophy, HelpCircle, Share2, Tv } from 'lucide-react';
import { LiveIndicator } from './LiveIndicator';
import { ExportCSV } from './ExportCSV';
import { ScreenRecorder } from './ScreenRecorder';
import { CalculatedTeamScore, Round } from '../types';

interface NavbarProps {
  currentView: 'leaderboard' | 'display' | 'admin';
  onSelectView: (view: 'leaderboard' | 'display' | 'admin') => void;
  onOpenGuide: () => void;
  onOpenShareLive: () => void;
  onOpenOBSGuide: () => void;
  scores: CalculatedTeamScore[];
  rounds: Round[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView, onSelectView, onOpenGuide, onOpenShareLive, onOpenOBSGuide, scores, rounds
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div onClick={() => onSelectView('leaderboard')} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 via-red-600 to-amber-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-orbitron font-black text-lg md:text-xl text-slate-100 tracking-wider group-hover:text-amber-400 transition-colors flex items-center gap-2">
                FREE FIRE <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">LEADERBOARD</span>
              </h1>
              <p className="text-[10px] font-rajdhani font-bold text-slate-400 uppercase tracking-widest">OFFICIAL ESPORTS TOURNAMENT ENGINE</p>
            </div>
          </div>
          <LiveIndicator className="ml-2 hidden lg:inline-flex" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <ScreenRecorder />
          <button onClick={onOpenOBSGuide} className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-orange-400 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm" title="OBS Overlay Guide">
            <Tv className="w-4 h-4 text-orange-400" /> OBS Overlay
          </button>
          <button onClick={onOpenShareLive} className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm" title="Share Live">
            <Share2 className="w-4 h-4 text-amber-400" /> Share Live
          </button>
          <button onClick={() => onSelectView('leaderboard')} className={`px-3 py-2 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${currentView === 'leaderboard' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'}`}>
            <Trophy className="w-4 h-4" /> Standings
          </button>
          <button onClick={() => onSelectView('display')} className={`px-3 py-2 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${currentView === 'display' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'}`}>
            <Monitor className="w-4 h-4 text-amber-400" /> TV Display
          </button>
          <button onClick={() => onSelectView('admin')} className={`px-3 py-2 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${currentView === 'admin' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'}`}>
            <Shield className="w-4 h-4 text-emerald-400" /> Admin
          </button>
          <div className="hidden sm:block"><ExportCSV scores={scores} rounds={rounds} /></div>
          <button onClick={onOpenGuide} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors" title="Guide">
            <HelpCircle className="w-4 h-4 text-orange-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
