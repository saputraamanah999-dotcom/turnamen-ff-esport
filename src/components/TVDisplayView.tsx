import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  Flame,
  Crown,
  Swords,
  Trophy,
  Radio,
  Monitor,
  Camera,
  Play,
  Volume2,
  VolumeX,
  Zap,
  Target,
  Shield,
  Star,
  TrendingUp
} from 'lucide-react';
import { CalculatedTeamScore, Round, Team, SettingsConfig, ResultItem } from '../types';
import { LiveIndicator } from './LiveIndicator';
import { ScreenRecorder } from './ScreenRecorder';
import { getRoundWinner, getRoundKillLeader } from '../lib/firestoreService';

interface TVDisplayViewProps {
  scores: CalculatedTeamScore[];
  rounds: Round[];
  settings: SettingsConfig;
  teams: Team[];
  results: ResultItem[];
  onExit?: () => void;
}

export const TVDisplayView: React.FC<TVDisplayViewProps> = ({ scores, rounds, settings, teams, results, onExit }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamMode, setStreamMode] = useState<'screen' | 'camera' | 'sample'>('screen');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [layoutStyle, setLayoutStyle] = useState<'split' | 'overlay'>('split');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const top3 = scores.slice(0, 3);
  const topBooyahTeam = useMemo(() => [...scores].sort((a, b) => b.totalBooyah - a.totalBooyah)[0], [scores]);
  const topKillsTeam = useMemo(() => [...scores].sort((a, b) => b.totalKill - a.totalKill)[0], [scores]);

  // Current round winner & kill leader (from Live Match Config)
  const currentRoundWinner = useMemo(() => {
    const rid = settings.currentRoundId;
    if (!rid) return null;
    const { team, result } = getRoundWinner(rid, teams, results);
    if (!team || !result) return null;
    const round = rounds.find(r => r.id === rid);
    return { team, result, roundLabel: round?.label || '' };
  }, [settings.currentRoundId, teams, results, rounds]);

  const currentRoundKillLeader = useMemo(() => {
    const rid = settings.currentRoundId;
    if (!rid) return null;
    const { team, result } = getRoundKillLeader(rid, teams, results);
    if (!team || !result) return null;
    return { team, result };
  }, [settings.currentRoundId, teams, results]);

  // Current round results for live display
  const currentRoundResults = useMemo(() => {
    const rid = settings.currentRoundId;
    if (!rid) return [];
    const roundResults = results.filter(r => r.roundId === rid);
    return roundResults
      .map(r => {
        const team = teams.find(t => t.id === r.teamId);
        return team ? { ...r, teamName: team.name, teamLogo: team.logoUrl || '' } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.placement === null && b!.placement === null) return 0;
        if (a!.placement === null) return 1;
        if (b!.placement === null) return -1;
        return a!.placement - b!.placement;
      }) as any[];
  }, [settings.currentRoundId, results, teams]);

  const tournamentName = settings.tournamentName || 'FREE FIRE WORLD SERIES';
  const bannerUrl = settings.bannerUrl;
  const liveStatus = settings.status || 'waiting';
  const currentRoundLabel = settings.currentRoundLabel || '';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(err => console.log(err));
      setIsFullscreen(false);
    }
  };

  const startGameplayStream = async (mode: 'screen' | 'camera') => {
    setStreamError(null);
    stopGameplayStream();
    try {
      let stream: MediaStream;
      if (mode === 'screen') {
        if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Browser tidak mendukung tangkap layar. Gunakan Chrome/Edge PC.');
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' }, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      stream.getVideoTracks()[0].onended = () => stopGameplayStream();
      setIsStreaming(true);
      setStreamMode(mode);
    } catch (err: any) {
      console.error('Stream error:', err);
      if (err.name !== 'NotAllowedError') setStreamError(err.message || 'Gagal memulai stream.');
    }
  };

  const stopGameplayStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  };

  const setSampleVideoMode = () => { stopGameplayStream(); setStreamMode('sample'); setIsStreaming(true); };

  useEffect(() => { return () => stopGameplayStream(); }, []);

  const statusConfig = {
    waiting: { label: 'WAITING', color: 'bg-amber-600', textColor: 'text-amber-100', shadow: 'shadow-amber-600/50' },
    live: { label: 'LIVE', color: 'bg-red-600', textColor: 'text-white', shadow: 'shadow-red-600/60' },
    finished: { label: 'FINISHED', color: 'bg-slate-600', textColor: 'text-slate-100', shadow: 'shadow-slate-600/30' }
  };
  const sc = statusConfig[liveStatus];

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col justify-between p-3 md:p-4 lg:p-6 select-none relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-slate-950 to-black pointer-events-none" />

      {/* ===== TOP BAR: Round Winner / Tournament Info ===== */}
      <div className="relative z-20 space-y-3 mb-3">
        {/* Banner + Tournament Name + Status */}
        <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden">
          {bannerUrl && (
            <div className="relative h-16 md:h-20 overflow-hidden">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-40" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
          )}
          <div className="px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-[0_0_20px_rgba(249,115,22,0.6)]">
                <Flame className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md ${sc.color} ${sc.textColor} font-orbitron font-extrabold text-[10px] uppercase tracking-widest shadow-lg ${sc.shadow} ${liveStatus === 'live' ? 'animate-pulse' : ''}`}>
                    {liveStatus === 'live' && <Radio className="w-3 h-3 inline mr-1" />}{sc.label}
                  </span>
                  <LiveIndicator className="hidden sm:inline-flex" />
                </div>
                <h1 className="font-orbitron font-black text-base md:text-xl lg:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 uppercase">
                  {tournamentName}
                </h1>
              </div>
            </div>

            {/* Current Round Info */}
            {currentRoundLabel && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-orange-950/60 border border-orange-500/40 font-orbitron font-bold text-xs text-orange-300">
                  {currentRoundLabel}
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2">
              <ScreenRecorder />
              <button onClick={() => setLayoutStyle(layoutStyle === 'split' ? 'overlay' : 'split')} className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-orbitron font-bold uppercase flex items-center gap-1" title="Toggle Layout">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> {layoutStyle.toUpperCase()}
              </button>
              <button onClick={toggleFullscreen} className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200" title="Fullscreen">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {onExit && <button onClick={onExit} className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/50 text-red-300 font-orbitron font-bold text-xs uppercase">Keluar</button>}
            </div>
          </div>
        </div>

        {/* ROUND WINNER BANNER (Juara Ronde Ini) */}
        <AnimatePresence mode="wait">
          {currentRoundWinner && (
            <motion.div
              key={currentRoundWinner.team.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-amber-950/90 border border-amber-400/60 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(251,191,36,0.3)] flex flex-col sm:flex-row items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                  <Crown className="w-7 h-7 md:w-8 md:h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                </motion.div>
                <div>
                  <div className="text-[10px] font-orbitron font-bold text-amber-400/80 uppercase tracking-widest">Juara Ronde Ini</div>
                  <div className="font-orbitron font-black text-lg md:text-xl text-amber-200 flex items-center gap-2">
                    <img src={currentRoundWinner.team.logoUrl} alt="" className="w-8 h-8 rounded-lg border border-amber-400/50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {currentRoundWinner.team.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-orbitron font-bold">
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> #{currentRoundWinner.result.placement}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" /> {currentRoundWinner.result.kill} Kills
                </span>
                {currentRoundWinner.result.booyah && (
                  <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-amber-950 font-extrabold flex items-center gap-1 shadow-lg shadow-amber-400/30">
                    <Star className="w-3.5 h-3.5" /> BOOYAH
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KILL LEADER BANNER */}
        <AnimatePresence mode="wait">
          {currentRoundKillLeader && currentRoundKillLeader.result && currentRoundKillLeader.result.kill > 0 && (
            <motion.div
              key={currentRoundKillLeader.team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-slate-950/90 border border-red-500/40 rounded-xl px-4 py-2 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-orbitron font-bold text-red-400/80 uppercase tracking-widest">Kill Leader</span>
              </div>
              <div className="flex items-center gap-2">
                <img src={currentRoundKillLeader.team.logoUrl} alt="" className="w-5 h-5 rounded border border-slate-600" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="font-orbitron font-bold text-sm text-slate-100">{currentRoundKillLeader.team.name}</span>
                <span className="px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-300 font-orbitron font-extrabold text-xs">
                  {currentRoundKillLeader.result.kill} KILLS
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {streamError && (
        <div className="mb-3 p-3 rounded-xl bg-red-950/90 border border-red-500 text-red-300 text-xs font-orbitron text-center z-20">
          {streamError}
        </div>
      )}

      {/* ===== MAIN GAMEPLAY & BROADCAST LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 z-10 my-auto flex-1 items-stretch">
        {/* GAMEPLAY STREAM */}
        <div className={`flex flex-col relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-950/90 shadow-2xl min-h-[320px] ${layoutStyle === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* HUD inside Game Screen */}
          <div className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full ${sc.color} ${sc.textColor} font-orbitron font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${sc.shadow} ${liveStatus === 'live' ? 'animate-pulse' : ''}`}>
                <Radio className="w-3 h-3" /> {sc.label} FEED
              </span>
              {currentRoundLabel && <span className="text-xs font-orbitron font-bold text-slate-300 hidden sm:inline">{currentRoundLabel}</span>}
            </div>
            <div className="flex items-center gap-2">
              {topBooyahTeam && (
                <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-orbitron font-bold text-[10px]">
                  <Crown className="w-3 h-3" /> MOST BOOYAH: <strong className="text-white ml-1">{topBooyahTeam.team.name}</strong> ({topBooyahTeam.totalBooyah})
                </div>
              )}
              {topKillsTeam && (
                <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 font-orbitron font-bold text-[10px]">
                  <Swords className="w-3 h-3" /> MOST KILLS: <strong className="text-white ml-1">{topKillsTeam.team.name}</strong> ({topKillsTeam.totalKill})
                </div>
              )}
            </div>
          </div>

          {/* Video / Stream Container */}
          <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[300px] overflow-hidden">
            {streamMode === 'screen' || streamMode === 'camera' ? (
              <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-contain max-h-[550px]" />
            ) : (
              <div className="relative w-full h-full min-h-[320px] flex items-center justify-center overflow-hidden">
                <iframe src="https://www.youtube.com/embed/fD-B1c2Qy_c?autoplay=1&mute=1&controls=0&loop=1&playlist=fD-B1c2Qy_c" title="Free Fire Gameplay" className="w-full h-full min-h-[320px] pointer-events-none scale-125 object-cover" allow="autoplay" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
              </div>
            )}

            {!isStreaming && streamMode !== 'sample' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-sm z-20">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mb-4 animate-bounce">
                  <Monitor className="w-7 h-7" />
                </div>
                <h3 className="font-orbitron font-black text-lg text-slate-100 mb-2">TAMPILKAN GAMEPLAY FREE FIRE</h3>
                <p className="text-xs text-slate-400 font-rajdhani font-bold max-w-md mb-5">
                  Klik <strong>"Tangkap Layar FF"</strong> untuk capture game, atau <strong>"Demo Loop"</strong> untuk simulasi.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={() => startGameplayStream('screen')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Tangkap Layar FF
                  </button>
                  <button onClick={setSampleVideoMode} className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <Play className="w-4 h-4" /> Demo Loop
                  </button>
                </div>
              </div>
            )}

            {/* Stream Controls */}
            {isStreaming && (
              <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => startGameplayStream('screen')} className={`px-2.5 py-1.5 rounded-lg font-orbitron font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${streamMode === 'screen' ? 'bg-orange-500 text-white' : 'bg-slate-900/80 text-slate-300'}`}>
                    <Monitor className="w-3 h-3" /> Screen
                  </button>
                  <button onClick={() => startGameplayStream('camera')} className={`px-2.5 py-1.5 rounded-lg font-orbitron font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${streamMode === 'camera' ? 'bg-orange-500 text-white' : 'bg-slate-900/80 text-slate-300'}`}>
                    <Camera className="w-3 h-3" /> Camera
                  </button>
                  <button onClick={setSampleVideoMode} className={`px-2.5 py-1.5 rounded-lg font-orbitron font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${streamMode === 'sample' ? 'bg-amber-500 text-amber-950 font-black' : 'bg-slate-900/80 text-slate-300'}`}>
                    <Play className="w-3 h-3" /> Demo
                  </button>
                </div>
                <button onClick={stopGameplayStream} className="px-2.5 py-1.5 rounded-lg bg-red-950/80 text-red-300 border border-red-600/50 hover:bg-red-900 text-[10px] font-orbitron font-bold">Stop</button>
              </div>
            )}

            <button onClick={() => setIsMuted(!isMuted)} className="absolute bottom-3 right-3 z-30 p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* OVERLAY MODE: Top 3 Cards */}
          {layoutStyle === 'overlay' && (
            <div className="absolute bottom-3 inset-x-3 z-30 pointer-events-none grid grid-cols-1 md:grid-cols-3 gap-2">
              {top3.map((sc, idx) => (
                <div key={sc.team.id} className={`p-2.5 rounded-2xl border backdrop-blur-xl flex items-center justify-between pointer-events-auto ${idx === 0 ? 'bg-amber-950/90 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.5)]' : idx === 1 ? 'bg-slate-950/90 border-slate-300/80' : 'bg-amber-950/70 border-amber-600/70'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg font-orbitron font-black text-xs flex items-center justify-center ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-200 text-slate-950' : 'bg-amber-700 text-amber-100'}`}>#{idx + 1}</span>
                    <div>
                      <div className="font-orbitron font-extrabold text-xs text-white truncate max-w-[100px]">{sc.team.name}</div>
                      <div className="text-[9px] text-slate-300 flex items-center gap-1.5">
                        <span><Swords className="w-2.5 h-2.5 inline text-red-400" /> {sc.totalKill}</span>
                        <span><Crown className="w-2.5 h-2.5 inline text-amber-400" /> {sc.totalBooyah}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-orbitron font-black text-xl text-amber-300">{sc.totalPoints}</div>
                    <div className="text-[8px] font-orbitron font-bold text-slate-400">PTS</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR: LEADERBOARD + CURRENT ROUND STANDINGS */}
        {layoutStyle === 'split' && (
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3 overflow-hidden">
            {/* Current Round Live Standings (if configured) */}
            {currentRoundResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/90 border border-red-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="font-orbitron font-black text-xs text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> STANDINGS RONDE INI
                  </span>
                  {liveStatus === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {currentRoundResults.slice(0, 7).map((r, idx) => (
                    <motion.div key={r.teamId} layout transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] ${r.placement === 1 ? 'bg-amber-950/50 border border-amber-400/40' : 'bg-slate-900/40'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded font-orbitron font-black text-[10px] flex items-center justify-center ${r.placement === 1 ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-slate-400'}`}>#{r.placement || '-'}</span>
                        <span className="font-orbitron font-bold text-slate-200 truncate max-w-[90px]">{r.teamName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-orbitron font-bold">
                        {r.booyah && <Crown className="w-3 h-3 text-amber-400" />}
                        <span className="text-red-400">{r.kill}<Swords className="w-2.5 h-2.5 inline ml-0.5" /></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Top 3 Podium Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-orbitron font-black text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> TOP 3 OVERALL
                </span>
                <span className="text-[9px] font-orbitron font-bold text-slate-500">LIVE SYNC</span>
              </div>
              <div className="space-y-1.5">
                {top3.map((sc, idx) => (
                  <motion.div key={sc.team.id} layout className={`flex items-center justify-between p-2 rounded-xl border ${idx === 0 ? 'bg-amber-950/40 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : idx === 1 ? 'bg-slate-900/90 border-slate-400/50' : 'bg-amber-950/20 border-amber-700/50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg font-orbitron font-black text-[10px] flex items-center justify-center ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-200 text-slate-950' : 'bg-amber-700 text-amber-100'}`}>#{idx + 1}</span>
                      <img src={sc.team.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt={sc.team.name} className="w-6 h-6 rounded-lg object-cover border border-slate-700" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'; }} />
                      <div>
                        <div className="font-orbitron font-bold text-[11px] text-white truncate max-w-[90px]">{sc.team.name}</div>
                        <div className="text-[9px] text-slate-400 font-rajdhani font-semibold">{sc.totalKill}K / {sc.totalBooyah}B</div>
                      </div>
                    </div>
                    <div className="text-right font-orbitron font-black text-base text-amber-400">{sc.totalPoints} <span className="text-[8px] text-slate-400 font-normal">PTS</span></div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Full Standings */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="font-orbitron font-bold text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-orange-500 animate-pulse" /> SQUAD STANDINGS
                </span>
                <span className="text-[9px] font-orbitron text-slate-500">{scores.length} SQUADS</span>
              </div>
              <div className="space-y-1 overflow-y-auto flex-1">
                {scores.map((sc) => (
                  <motion.div key={sc.team.id} layout transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${sc.rank === 1 ? 'bg-amber-950/40 border-amber-500/50' : 'bg-slate-900/60 border-slate-800/80'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-orbitron font-black text-slate-400 w-5 text-center">#{sc.rank}</span>
                      <span className="font-orbitron font-bold text-slate-100 truncate max-w-[100px]">{sc.team.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-orbitron font-bold">
                      <span className="text-slate-400"><Swords className="w-2.5 h-2.5 inline text-red-400" />{sc.totalKill}</span>
                      <span className="text-amber-400 min-w-[28px] text-right">{sc.totalPoints}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ticker */}
      <div className="z-20 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-xl flex items-center justify-between gap-4 text-xs font-rajdhani font-bold text-slate-300 overflow-hidden mt-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-orbitron font-black text-[9px] uppercase">LIVE</span>
        </div>
        <div className="truncate flex-1 text-slate-400 font-orbitron font-semibold text-[10px] tracking-wide">
          LEADER: <strong className="text-amber-400">{top3[0]?.team.name || '-'}</strong> ({top3[0]?.totalPoints || 0} PTS) • BOOYAH KING: <strong className="text-amber-400">{topBooyahTeam?.team.name || '-'}</strong> ({topBooyahTeam?.totalBooyah || 0}) • KILL KING: <strong className="text-red-400">{topKillsTeam?.team.name || '-'}</strong> ({topKillsTeam?.totalKill || 0})
        </div>
        <div className="shrink-0 text-slate-500 text-[9px] font-orbitron hidden sm:block">REALTIME FIRESTORE</div>
      </div>
    </div>
  );
};
