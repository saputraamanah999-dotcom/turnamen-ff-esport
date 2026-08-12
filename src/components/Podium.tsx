import React from 'react';
import { motion } from 'motion/react';
import { Crown, Trophy, Swords, Flame } from 'lucide-react';
import { CalculatedTeamScore } from '../types';

interface PodiumProps {
  top3: CalculatedTeamScore[];
}

export const Podium: React.FC<PodiumProps> = ({ top3 }) => {
  if (!top3 || top3.length === 0) return null;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="w-full my-6 px-2">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/20 to-red-500/10 border border-orange-500/30 text-amber-400 font-orbitron text-xs tracking-widest uppercase">
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          <span>TOP 3 TOURNAMENT PODIUM</span>
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 max-w-5xl mx-auto min-h-[380px]">
        {/* 2nd Place - Silver */}
        {second ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full md:w-1/3 order-2 md:order-1 flex flex-col items-center"
          >
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-900 border-2 border-slate-300 p-1.5 shadow-[0_0_20px_rgba(203,213,225,0.4)] relative group">
                <img
                  src={second.team.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'}
                  alt={second.team.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-orbitron font-extrabold text-sm shadow-md">
                  #2
                </div>
              </div>
              <h3 className="mt-3 font-orbitron font-bold text-lg md:text-xl text-slate-100 text-center tracking-wide drop-shadow">
                {second.team.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-300 font-rajdhani font-semibold">
                <span className="flex items-center gap-1"><Swords className="w-3.5 h-3.5 text-slate-400" /> {second.totalKill} Kills</span>
                <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-400" /> {second.totalBooyah} Booyah</span>
              </div>
            </div>

            {/* Silver Block */}
            <div className="w-full h-40 md:h-48 rounded-t-2xl bg-gradient-to-b from-slate-300/20 via-slate-700/40 to-slate-900/80 border-t-2 border-slate-300 border-x border-slate-500/30 p-4 flex flex-col items-center justify-center backdrop-blur-md glow-silver">
              <span className="text-slate-300 font-orbitron text-xs tracking-widest font-semibold uppercase">SILVER MEDAL</span>
              <div className="text-4xl md:text-5xl font-orbitron font-black text-slate-100 mt-1 tracking-tight">
                {second.totalPoints}
              </div>
              <span className="text-[11px] font-rajdhani font-bold text-slate-400 uppercase tracking-wider">TOTAL PTS</span>
            </div>
          </motion.div>
        ) : <div className="w-full md:w-1/3 order-2 md:order-1" />}

        {/* 1st Place - Gold (Center, Taller, Prominent) */}
        {first && (
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1.05 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center z-10"
          >
            <div className="relative mb-3 flex flex-col items-center">
              <Crown className="w-10 h-10 text-amber-400 animate-bounce drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] -mb-2" />
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-amber-950/80 border-3 border-amber-400 p-1.5 shadow-[0_0_30px_rgba(251,191,36,0.6)] relative group">
                <img
                  src={first.team.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'}
                  alt={first.team.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center font-orbitron font-extrabold text-base shadow-lg border border-amber-200">
                  #1
                </div>
              </div>
              <h3 className="mt-3 font-orbitron font-extrabold text-xl md:text-2xl text-amber-300 text-center tracking-wider text-glow-gold">
                {first.team.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-amber-200 font-rajdhani font-bold">
                <span className="flex items-center gap-1"><Swords className="w-4 h-4 text-orange-400" /> {first.totalKill} Kills</span>
                <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-400" /> {first.totalBooyah} Booyah</span>
              </div>
            </div>

            {/* Gold Block */}
            <div className="w-full h-52 md:h-60 rounded-t-2xl bg-gradient-to-b from-amber-500/30 via-amber-900/50 to-amber-950/90 border-t-2 border-amber-400 border-x border-amber-500/40 p-5 flex flex-col items-center justify-center backdrop-blur-md glow-gold">
              <span className="text-amber-300 font-orbitron text-xs tracking-widest font-extrabold uppercase flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> CHAMPION PODIUM
              </span>
              <div className="text-5xl md:text-6xl font-orbitron font-black text-amber-300 mt-2 tracking-tight text-glow-gold">
                {first.totalPoints}
              </div>
              <span className="text-xs font-rajdhani font-extrabold text-amber-400/90 uppercase tracking-widest mt-1">TOTAL POINTS</span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place - Bronze */}
        {third ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full md:w-1/3 order-3 md:order-3 flex flex-col items-center"
          >
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-amber-950/40 border-2 border-amber-600 p-1.5 shadow-[0_0_20px_rgba(217,119,6,0.35)] relative group">
                <img
                  src={third.team.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'}
                  alt={third.team.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-orbitron font-extrabold text-sm shadow-md">
                  #3
                </div>
              </div>
              <h3 className="mt-3 font-orbitron font-bold text-lg md:text-xl text-amber-200 text-center tracking-wide drop-shadow">
                {third.team.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-amber-200/80 font-rajdhani font-semibold">
                <span className="flex items-center gap-1"><Swords className="w-3.5 h-3.5 text-orange-400" /> {third.totalKill} Kills</span>
                <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-400" /> {third.totalBooyah} Booyah</span>
              </div>
            </div>

            {/* Bronze Block */}
            <div className="w-full h-36 md:h-44 rounded-t-2xl bg-gradient-to-b from-amber-700/25 via-amber-900/40 to-slate-900/80 border-t-2 border-amber-600 border-x border-amber-700/30 p-4 flex flex-col items-center justify-center backdrop-blur-md glow-bronze">
              <span className="text-amber-400 font-orbitron text-xs tracking-widest font-semibold uppercase">BRONZE MEDAL</span>
              <div className="text-4xl md:text-5xl font-orbitron font-black text-amber-200 mt-1 tracking-tight">
                {third.totalPoints}
              </div>
              <span className="text-[11px] font-rajdhani font-bold text-amber-500/80 uppercase tracking-wider">TOTAL PTS</span>
            </div>
          </motion.div>
        ) : <div className="w-full md:w-1/3 order-3 md:order-3" />}
      </div>
    </div>
  );
};
