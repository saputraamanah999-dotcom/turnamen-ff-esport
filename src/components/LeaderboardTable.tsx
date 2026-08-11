import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Swords,
  Crown,
  Trophy,
  Award,
  Download,
  Image as ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { CalculatedTeamScore, Round } from '../types';

interface LeaderboardTableProps {
  scores: CalculatedTeamScore[];
  rounds: Round[];
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ scores, rounds }) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  const handleExportPNG = async () => {
    if (!tableRef.current) return;
    setIsExporting(true);
    try {
      // Capture high quality PNG image of the standings table
      const dataUrl = await toPng(tableRef.current, {
        cacheBust: true,
        quality: 0.98,
        backgroundColor: '#020617',
        pixelRatio: 2
      });

      const link = document.createElement('a');
      link.download = `FreeFire_Tournament_Leaderboard_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting leaderboard PNG:', err);
      alert('Gagal mengekspor gambar PNG. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.6)] font-black border border-amber-200';
      case 2:
        return 'bg-slate-300 text-slate-950 shadow-[0_0_10px_rgba(203,213,225,0.5)] font-black border border-white';
      case 3:
        return 'bg-amber-700 text-amber-100 shadow-[0_0_10px_rgba(217,119,6,0.5)] font-black border border-amber-500';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700 font-bold';
    }
  };

  return (
    <div className="w-full my-6 max-w-6xl mx-auto px-2">
      {/* Table Top Controls & Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-orbitron font-extrabold text-xl md:text-2xl text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-500" /> TOURNAMENT STANDINGS
          </h2>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-0.5">
            Auto-calculated live points (Placement + Kills + Booyah Bonus). Click any team for match breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
            title="Ekspor Klasemen ke Gambar PNG untuk Medsos"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {isExporting ? 'Generating PNG...' : 'Export PNG Table'}
          </button>

          <div className="hidden lg:flex items-center gap-4 text-xs font-rajdhani font-bold text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1.5"><Swords className="w-4 h-4 text-orange-400" /> Kills</span>
            <span className="flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-400" /> Booyah</span>
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" /> Points</span>
          </div>
        </div>
      </div>

      {/* Exportable Area Box */}
      <div
        ref={tableRef}
        className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md p-1"
      >
        {/* Esports Header Branding for exported image */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <span className="font-orbitron font-black text-sm text-slate-200 uppercase tracking-widest">
              OFFICIAL FREE FIRE TOURNAMENT LEADERBOARD
            </span>
          </div>
          <span className="text-[10px] font-orbitron font-bold text-slate-500 uppercase">
            LIVE KLASEMEN MATCH
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 bg-slate-900/90 text-slate-400 font-orbitron text-xs font-bold py-3.5 px-4 border-b border-slate-800 uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-1 text-center">RANK</div>
          <div className="col-span-6 sm:col-span-5 flex items-center gap-2">TEAM NAME</div>
          <div className="col-span-2 sm:col-span-2 text-center flex items-center justify-center gap-1">
            <Swords className="w-3.5 h-3.5 text-orange-400 hidden sm:inline" /> KILLS
          </div>
          <div className="hidden sm:flex col-span-2 text-center items-center justify-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> BOOYAH
          </div>
          <div className="col-span-2 sm:col-span-2 text-right pr-2">TOTAL PTS</div>
        </div>

        {/* Animated Rows with Framer Motion entry/exit & rank shifting */}
        <div className="divide-y divide-slate-800/60">
          <AnimatePresence mode="popLayout">
            {scores.map((sc) => {
              const isExpanded = expandedTeamId === sc.team.id;

              return (
                <motion.div
                  key={sc.team.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                    opacity: { duration: 0.25 },
                    y: { duration: 0.25 }
                  }}
                  className={`transition-colors duration-200 ${isExpanded ? 'bg-slate-900/80' : 'hover:bg-slate-900/40'}`}
                >
                  {/* Main Row */}
                  <div
                    onClick={() => toggleExpand(sc.team.id)}
                    className="grid grid-cols-12 items-center py-3.5 px-4 cursor-pointer select-none"
                  >
                    {/* Rank */}
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <span className={`w-8 h-8 rounded-xl font-orbitron text-sm flex items-center justify-center ${getRankBadgeStyle(sc.rank)}`}>
                        #{sc.rank}
                      </span>
                    </div>

                    {/* Team Info */}
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                      <img
                        src={sc.team.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'}
                        alt={sc.team.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-700 bg-slate-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div>
                        <h4 className="font-orbitron font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                          {sc.team.name}
                          {sc.rank === 1 && <Crown className="w-4 h-4 text-amber-400 inline" />}
                        </h4>
                        <p className="text-[11px] font-rajdhani font-semibold text-slate-400">
                          Placement Pts: {sc.totalPlacementPoints}
                        </p>
                      </div>
                    </div>

                    {/* Kills */}
                    <div className="col-span-2 sm:col-span-2 text-center font-orbitron font-bold text-sm text-slate-200">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-950/40 border border-orange-500/20 text-orange-400">
                        {sc.totalKill}
                      </span>
                    </div>

                    {/* Booyah */}
                    <div className="hidden sm:flex col-span-2 justify-center font-orbitron font-bold text-sm text-amber-300">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> {sc.totalBooyah}
                      </span>
                    </div>

                    {/* Total Points */}
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-2 pr-2">
                      <span className="font-orbitron font-extrabold text-lg sm:text-xl text-orange-400 text-glow-orange">
                        {sc.totalPoints}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Round Breakdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-3"
                      >
                        <div className="text-xs font-orbitron font-bold text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5" /> MATCH BREAKDOWN — {sc.team.name}
                        </div>

                        {rounds.length === 0 ? (
                          <p className="text-xs text-slate-500 py-2">No rounds created yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                            {sc.roundBreakdown.map((rb, idx) => (
                              <div
                                key={rb.roundId}
                                className={`p-2.5 rounded-xl border text-xs ${
                                  rb.booyah
                                    ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-950/60 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between font-orbitron font-semibold text-[11px] text-slate-300 border-b border-slate-800/80 pb-1.5 mb-1.5">
                                  <span>R{idx + 1}: {rb.roundLabel}</span>
                                  {rb.booyah && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                      <Crown className="w-2.5 h-2.5" /> BOOYAH
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 font-rajdhani font-medium text-slate-300">
                                  <div className="flex justify-between">
                                    <span>Placement:</span>
                                    <span className="font-bold text-slate-100">
                                      {rb.placement ? `#${rb.placement} (${rb.placementPoints} pts)` : '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Kills:</span>
                                    <span className="font-bold text-orange-400">
                                      {rb.kill} ({rb.killPoints} pts)
                                    </span>
                                  </div>
                                  {rb.booyahPoints > 0 && (
                                    <div className="flex justify-between text-amber-400 font-bold">
                                      <span>Booyah Bonus:</span>
                                      <span>+{rb.booyahPoints} pts</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-1 border-t border-slate-800/60 font-orbitron font-bold text-slate-100 text-xs">
                                    <span>Round Total:</span>
                                    <span className="text-orange-400">{rb.roundTotalPoints} pts</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

