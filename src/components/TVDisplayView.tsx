import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2, Minimize2, Flame, Crown, Swords, Trophy, Radio,
  Monitor, Camera, Play, Volume2, VolumeX, Zap, Target, Star,
  RefreshCw, Users, Wifi
} from 'lucide-react';
import { CalculatedTeamScore, Round, Team, SettingsConfig, ResultItem } from '../types';
import { LiveIndicator } from './LiveIndicator';
import { ScreenRecorder } from './ScreenRecorder';
import { getRoundWinner, getRoundKillLeader } from '../lib/firestoreService';
import { Broadcaster, Viewer, ViewerStatus } from '../lib/liveStream';

interface TVDisplayViewProps {
  scores: CalculatedTeamScore[];
  rounds: Round[];
  settings: SettingsConfig;
  teams: Team[];
  results: ResultItem[];
  viewerMode?: boolean;
  onExit?: () => void;
}

export const TVDisplayView: React.FC<TVDisplayViewProps> = ({ scores, rounds, settings, teams, results, viewerMode = false, onExit }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamMode, setStreamMode] = useState<'screen' | 'camera' | 'sample'>('screen');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [layoutStyle, setLayoutStyle] = useState<'split' | 'overlay'>('split');

  // WebRTC
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [viewerLiveStatus, setViewerLiveStatus] = useState<ViewerStatus>('idle');
  const [viewerLiveMsg, setViewerLiveMsg] = useState('');
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [videoPlayBlocked, setVideoPlayBlocked] = useState(false);
  const broadcasterRef = useRef<Broadcaster | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const top3 = scores.slice(0, 3);
  const topBooyahTeam = useMemo(() => [...scores].sort((a, b) => b.totalBooyah - a.totalBooyah)[0], [scores]);
  const topKillsTeam = useMemo(() => [...scores].sort((a, b) => b.totalKill - a.totalKill)[0], [scores]);

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

  const currentRoundResults = useMemo(() => {
    const rid = settings.currentRoundId;
    if (!rid) return [];
    return results
      .filter(r => r.roundId === rid)
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
  const liveMatchStatus = settings.status || 'waiting';
  const currentRoundLabel = settings.currentRoundLabel || '';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const startGameplayStream = async (mode: 'screen' | 'camera') => {
    setStreamError(null);
    stopGameplayStream();
    try {
      let stream: MediaStream;
      if (mode === 'screen') {
        if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Browser tidak mendukung. Gunakan Chrome/Edge PC.');
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'window', width: { max: 1280 }, height: { max: 720 }, frameRate: { max: 30 } },
          audio: true
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      stream.getVideoTracks()[0].onended = () => stopGameplayStream();
      setIsStreaming(true);
      setStreamMode(mode);
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') setStreamError(err.message || 'Gagal mulai stream.');
    }
  };

  const stopGameplayStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    if (isLiveBroadcasting && broadcasterRef.current) {
      broadcasterRef.current.stop().catch(() => {});
      broadcasterRef.current = null;
      setIsLiveBroadcasting(false);
      setLiveViewerCount(0);
    }
  };

  const setSampleVideoMode = () => { stopGameplayStream(); setStreamMode('sample'); setIsStreaming(true); };

  // ====== VIEWER: attach stream directly to video element ======
  const handleViewerStream = useCallback((stream: MediaStream) => {
    console.log('[TV] Viewer got stream! Tracks:', stream.getTracks().map(t => t.kind).join(', '));
    // IMPORTANT: attach directly to video element, bypass React state timing
    const el = remoteVideoRef.current;
    if (el) {
      el.srcObject = stream;
      el.muted = true; // muted first for autoplay
      el.play().then(() => {
        console.log('[TV] Video PLAYING on viewer!');
        setVideoPlayBlocked(false);
        setHasRemoteStream(true);
      }).catch((e) => {
        console.warn('[TV] Autoplay blocked, need user tap:', e.name);
        setVideoPlayBlocked(true);
        setHasRemoteStream(true);
      });
    } else {
      console.warn('[TV] remoteVideoRef not ready yet, saving stream');
      setHasRemoteStream(true);
      // Retry after React renders the video element
      setTimeout(() => {
        const retryEl = remoteVideoRef.current;
        if (retryEl) {
          retryEl.srcObject = stream;
          retryEl.muted = true;
          retryEl.play().then(() => {
            console.log('[TV] Video playing on retry!');
            setVideoPlayBlocked(false);
          }).catch(() => setVideoPlayBlocked(true));
        }
      }, 500);
    }
  }, []);

  // Keep the video element ALWAYS rendered for viewer (hidden when no stream)
  // This way ref is always available when stream arrives
  const remoteVideoAlwaysRendered = viewerMode;

  // ====== VIEWER MODE: Auto-connect WebRTC ======
  useEffect(() => {
    if (!viewerMode) return;
    const viewer = new Viewer(
      handleViewerStream,
      (status, message) => {
        setViewerLiveStatus(status);
        setViewerLiveMsg(message || '');
      }
    );
    viewerRef.current = viewer;
    viewer.connect();
    return () => { viewer.disconnect(); viewerRef.current = null; setHasRemoteStream(false); setVideoPlayBlocked(false); };
  }, [viewerMode, handleViewerStream]);

  // ====== ADMIN: GO LIVE ======
  const handleToggleBroadcast = async () => {
    if (isLiveBroadcasting) {
      if (broadcasterRef.current) { await broadcasterRef.current.stop(); broadcasterRef.current = null; }
      setIsLiveBroadcasting(false);
      setLiveViewerCount(0);
    } else if (streamRef.current) {
      const bc = new Broadcaster((count) => setLiveViewerCount(count));
      broadcasterRef.current = bc;
      await bc.start(streamRef.current);
      setIsLiveBroadcasting(true);
    }
  };

  useEffect(() => { return () => { if (broadcasterRef.current) broadcasterRef.current.stop().catch(() => {}); }; }, []);

  // ====== TAP TO PLAY handler (mobile autoplay fix) ======
  const handleTapToPlay = () => {
    const el = remoteVideoRef.current;
    if (el) {
      el.muted = isMuted;
      el.play().then(() => {
        setVideoPlayBlocked(false);
        console.log('[TV] Playing after user tap!');
      }).catch(() => {});
    }
  };

  const statusConfig = {
    waiting: { label: 'WAITING', color: 'bg-amber-500', textColor: 'text-white', shadow: 'shadow-amber-500/50' },
    live: { label: 'LIVE', color: 'bg-red-600', textColor: 'text-white', shadow: 'shadow-red-600/60' },
    finished: { label: 'FINISHED', color: 'bg-gray-500', textColor: 'text-white', shadow: 'shadow-gray-500/30' }
  };
  const sc = statusConfig[liveMatchStatus];

  // ====== FALLBACK (no stream yet) ======
  const AnimatedFallback = ({ status, message }: { status?: string; message?: string }) => (
    <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden bg-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-100 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-red-50 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-red-600 flex items-center justify-center mb-5 shadow-lg shadow-red-600/30">
          {status === 'connected' ? <Wifi className="w-10 h-10 text-white" /> :
           status === 'connecting' || status === 'waiting' || status === 'checking' ? <RefreshCw className="w-10 h-10 text-white animate-spin" /> :
           <Flame className="w-10 h-10 text-white" />}
        </div>
        <h3 className="font-orbitron font-black text-xl md:text-3xl text-red-700 uppercase mb-3">{tournamentName}</h3>
        <p className="text-sm text-gray-600 font-rajdhani font-bold max-w-md mb-2">{message || (liveMatchStatus === 'live' ? 'Match sedang berlangsung...' : 'Menunggu stream dimulai...')}</p>
        {currentRoundLabel && <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-orbitron font-bold text-xs mt-2">{currentRoundLabel}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between p-3 md:p-4 lg:p-6 select-none relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-red-50 via-white to-white pointer-events-none" />

      {/* ===== TOP BAR ===== */}
      <div className="relative z-20 space-y-3 mb-3">
        <div className="bg-white border-2 border-red-600 rounded-2xl shadow-lg overflow-hidden">
          {bannerUrl && (
            <div className="relative h-12 md:h-16 overflow-hidden">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
            </div>
          )}
          <div className="px-4 py-2.5 flex flex-col lg:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600 shadow-md">
                <Flame className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-md ${sc.color} ${sc.textColor} font-orbitron font-extrabold text-[10px] uppercase tracking-widest shadow-lg ${sc.shadow} ${liveMatchStatus === 'live' ? 'animate-pulse' : ''}`}>
                    {liveMatchStatus === 'live' && <Radio className="w-3 h-3 inline mr-1" />}{sc.label}
                  </span>
                  {!viewerMode && <LiveIndicator className="hidden sm:inline-flex" />}
                  {isLiveBroadcasting && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-orbitron font-black text-[10px] uppercase animate-pulse flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5" /> BROADCASTING ({liveViewerCount})
                    </span>
                  )}
                  {viewerMode && hasRemoteStream && !videoPlayBlocked && (
                    <span className="px-2 py-0.5 rounded-md bg-green-600 text-white font-orbitron font-black text-[10px] uppercase flex items-center gap-1">
                      <Wifi className="w-2.5 h-2.5" /> WATCHING LIVE
                    </span>
                  )}
                </div>
                <h1 className="font-orbitron font-black text-sm md:text-xl lg:text-2xl tracking-wider text-red-700 uppercase leading-tight">{tournamentName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentRoundLabel && <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-orbitron font-bold text-xs">{currentRoundLabel}</span>}
              {!viewerMode && <ScreenRecorder />}
              {!viewerMode && <button onClick={() => setLayoutStyle(layoutStyle === 'split' ? 'overlay' : 'split')} className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-[10px] font-orbitron font-bold uppercase flex items-center gap-1"><Zap className="w-3 h-3 text-red-600" /> {layoutStyle.toUpperCase()}</button>}
              <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800"><Maximize2 className="w-4 h-4" /></button>
              {!viewerMode && onExit && <button onClick={onExit} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-orbitron font-bold text-xs uppercase">Keluar</button>}
            </div>
          </div>
        </div>

        {/* ROUND WINNER BANNER */}
        <AnimatePresence mode="wait">
          {currentRoundWinner && (
            <motion.div key={currentRoundWinner.team.id} initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-2xl px-5 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}><Crown className="w-7 h-7 md:w-8 md:h-8 text-yellow-300" /></motion.div>
                <div><div className="text-[10px] font-orbitron font-bold text-red-100 uppercase tracking-widest">Juara Ronde Ini</div><div className="font-orbitron font-black text-lg md:text-xl text-white flex items-center gap-2"><img src={currentRoundWinner.team.logoUrl} alt="" className="w-8 h-8 rounded-lg border-2 border-yellow-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />{currentRoundWinner.team.name}</div></div>
              </div>
              <div className="flex items-center gap-4 text-xs font-orbitron font-bold">
                <span className="px-3 py-1.5 rounded-lg bg-white/20 text-white flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> #{currentRoundWinner.result.placement}</span>
                <span className="px-3 py-1.5 rounded-lg bg-white/20 text-white flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> {currentRoundWinner.result.kill} Kills</span>
                {currentRoundWinner.result.booyah && <span className="px-3 py-1.5 rounded-lg bg-yellow-400 text-red-900 font-extrabold flex items-center gap-1 shadow-md"><Star className="w-3.5 h-3.5" /> BOOYAH</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KILL LEADER BANNER */}
        <AnimatePresence mode="wait">
          {currentRoundKillLeader && currentRoundKillLeader.result && currentRoundKillLeader.result.kill > 0 && (
            <motion.div key={currentRoundKillLeader.team.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-red-600" /><span className="text-[10px] font-orbitron font-bold text-red-600 uppercase tracking-widest">Kill Leader</span></div>
              <div className="flex items-center gap-2"><img src={currentRoundKillLeader.team.logoUrl} alt="" className="w-5 h-5 rounded border border-gray-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="font-orbitron font-bold text-sm text-gray-900">{currentRoundKillLeader.team.name}</span><span className="px-2 py-0.5 rounded bg-red-600 text-white font-orbitron font-extrabold text-xs">{currentRoundKillLeader.result.kill} KILLS</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {streamError && <div className="mb-3 p-3 rounded-xl bg-red-100 border-2 border-red-400 text-red-800 text-xs font-orbitron text-center z-20">{streamError}</div>}

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 z-10 my-auto flex-1 items-stretch">
        {/* VIDEO AREA */}
        <div className={`flex flex-col relative rounded-2xl overflow-hidden border-2 ${isLiveBroadcasting ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : viewerMode ? 'border-red-400' : 'border-gray-300'} bg-black shadow-lg ${layoutStyle === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'}`} style={{ minHeight: viewerMode ? '50vh' : '320px' }}>
          {/* HUD overlay */}
          <div className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/60 via-black/20 to-transparent p-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className={`px-2 py-0.5 rounded-full ${sc.color} ${sc.textColor} font-orbitron font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow ${sc.shadow} ${liveMatchStatus === 'live' ? 'animate-pulse' : ''}`}><Radio className="w-2.5 h-2.5" /> {sc.label}</span>
              {currentRoundLabel && <span className="text-[10px] font-orbitron font-bold text-white/80 hidden sm:inline bg-black/40 px-2 py-0.5 rounded-full">{currentRoundLabel}</span>}
            </div>
            {!viewerMode && (
              <div className="flex items-center gap-1 pointer-events-auto">
                {topBooyahTeam && <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-yellow-300 font-orbitron font-bold text-[9px]"><Crown className="w-2.5 h-2.5" /> {topBooyahTeam.team.name} ({topBooyahTeam.totalBooyah}B)</span>}
                {topKillsTeam && <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-red-300 font-orbitron font-bold text-[9px]"><Swords className="w-2.5 h-2.5" /> {topKillsTeam.team.name} ({topKillsTeam.totalKill}K)</span>}
              </div>
            )}
          </div>

          {/* === VIDEO CONTAINER === */}
          <div className="relative w-full flex-1 bg-black overflow-hidden">
            {viewerMode ? (
              /* ===== VIEWER: video always in DOM ===== */
              <>
                {/* Video element ALWAYS rendered (hidden via opacity when no stream) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    opacity: hasRemoteStream ? 1 : 0,
                    pointerEvents: hasRemoteStream ? 'auto' : 'none',
                    zIndex: 10
                  }}
                />
                {/* Tap to play overlay (mobile autoplay fix) */}
                {videoPlayBlocked && (
                  <div onClick={handleTapToPlay} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-3 shadow-lg shadow-red-600/40 animate-pulse">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-white font-orbitron font-bold text-sm">TAP UNTUK NONTON</p>
                  </div>
                )}
                {/* Fallback (visible when no stream) */}
                {!hasRemoteStream && (
                  <AnimatedFallback status={viewerLiveStatus} message={viewerLiveMsg} />
                )}
              </>
            ) : (
              /* ===== ADMIN MODE ===== */
              <>
                {(streamMode === 'screen' || streamMode === 'camera') ? (
                  <video ref={videoRef} autoPlay playsInline muted={isMuted} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 10 }} />
                ) : (
                  !isStreaming && <AnimatedFallback />
                )}

                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white z-20">
                    <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center mb-4 animate-bounce"><Monitor className="w-7 h-7" /></div>
                    <h3 className="font-orbitron font-black text-lg text-gray-900 mb-2">TANGKAP LAYAR</h3>
                    <p className="text-xs text-gray-600 mb-5">Klik <strong>Tangkap Layar</strong> lalu <strong>GO LIVE</strong></p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button onClick={() => startGameplayStream('screen')} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-orbitron font-bold text-xs uppercase shadow-md hover:bg-red-700 flex items-center gap-2"><Monitor className="w-4 h-4" /> Tangkap Layar</button>
                      <button onClick={() => startGameplayStream('camera')} className="px-5 py-2.5 rounded-xl bg-gray-100 border-2 border-gray-300 text-gray-800 font-orbitron font-bold text-xs uppercase flex items-center gap-2"><Camera className="w-4 h-4" /> Kamera</button>
                    </div>
                  </div>
                )}

                {isStreaming && (
                  <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startGameplayStream('screen')} className={`px-2 py-1 rounded font-orbitron font-bold text-[9px] uppercase flex items-center gap-1 ${streamMode === 'screen' ? 'bg-red-600 text-white' : 'bg-black/50 text-white'}`}><Monitor className="w-3 h-3" /> Screen</button>
                      <button onClick={() => startGameplayStream('camera')} className={`px-2 py-1 rounded font-orbitron font-bold text-[9px] uppercase flex items-center gap-1 ${streamMode === 'camera' ? 'bg-red-600 text-white' : 'bg-black/50 text-white'}`}><Camera className="w-3 h-3" /> Cam</button>
                      <button onClick={handleToggleBroadcast} className={`px-3 py-1 rounded font-orbitron font-black text-[9px] uppercase flex items-center gap-1.5 ${isLiveBroadcasting ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white hover:bg-green-500'}`}>
                        <Radio className="w-3 h-3" /> {isLiveBroadcasting ? `LIVE (${liveViewerCount})` : 'GO LIVE'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={stopGameplayStream} className="px-2 py-1 rounded bg-black/50 text-white text-[9px] font-orbitron font-bold">Stop</button>
                      <button onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }} className="p-1.5 rounded bg-black/50 text-white">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Viewer mute/unmute button */}
            {viewerMode && hasRemoteStream && !videoPlayBlocked && (
              <button onClick={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = newMuted;
                  if (!newMuted) remoteVideoRef.current.play().catch(() => {});
                }
              }} className="absolute bottom-3 right-3 z-30 p-2.5 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* OVERLAY MODE (admin only) */}
          {layoutStyle === 'overlay' && !viewerMode && (
            <div className="absolute bottom-3 inset-x-3 z-30 pointer-events-none grid grid-cols-1 md:grid-cols-3 gap-2">
              {top3.map((sc, idx) => (
                <div key={sc.team.id} className={`p-2.5 rounded-2xl border-2 backdrop-blur-md flex items-center justify-between pointer-events-auto ${idx === 0 ? 'bg-yellow-400/90 border-yellow-500' : idx === 1 ? 'bg-gray-300/90 border-gray-400' : 'bg-amber-600/90 border-amber-700'}`}>
                  <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg font-orbitron font-black text-xs flex items-center justify-center ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-gray-900' : 'bg-amber-700 text-white'}`}>#{idx + 1}</span><div><div className="font-orbitron font-extrabold text-xs text-gray-900 truncate max-w-[100px]">{sc.team.name}</div><div className="text-[9px] text-gray-700 flex items-center gap-1.5"><span><Swords className="w-2.5 h-2.5 inline text-red-600" /> {sc.totalKill}</span><span><Crown className="w-2.5 h-2.5 inline text-yellow-600" /> {sc.totalBooyah}</span></div></div></div>
                  <div className="text-right"><div className="font-orbitron font-black text-xl text-red-700">{sc.totalPoints}</div><div className="text-[8px] font-orbitron text-gray-600">PTS</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR (split layout, or always for viewer on desktop) */}
        {layoutStyle === 'split' && (
          <div className={`${viewerMode ? 'hidden lg:flex' : 'lg:flex'} lg:col-span-4 flex-col justify-between space-y-3 overflow-hidden`}>
            {currentRoundResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between border-b-2 border-red-100 pb-2 mb-2"><span className="font-orbitron font-black text-xs text-red-600 uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> STANDINGS RONDE</span>{liveMatchStatus === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}</div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto">{currentRoundResults.slice(0, 7).map((r) => (
                  <motion.div key={r.teamId} layout className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] ${r.placement === 1 ? 'bg-yellow-50 border border-yellow-400' : 'bg-gray-50'}`}><div className="flex items-center gap-1.5"><span className={`w-5 h-5 rounded font-orbitron font-black text-[10px] flex items-center justify-center ${r.placement === 1 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'}`}>#{r.placement || '-'}</span><span className="font-orbitron font-bold text-gray-900 truncate max-w-[90px]">{r.teamName}</span></div><div className="flex items-center gap-2 font-orbitron font-bold">{r.booyah && <Crown className="w-3 h-3 text-yellow-500" />}<span className="text-red-600">{r.kill}<Swords className="w-2.5 h-2.5 inline ml-0.5" /></span></div></motion.div>
                ))}</div>
              </motion.div>
            )}
            <div className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md">
              <div className="flex items-center justify-between border-b-2 border-red-100 pb-2 mb-2"><span className="font-orbitron font-black text-xs text-red-600 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> TOP 3 OVERALL</span><span className="text-[9px] font-orbitron text-gray-400">LIVE SYNC</span></div>
              <div className="space-y-1.5">{top3.map((sc, idx) => (
                <motion.div key={sc.team.id} layout className={`flex items-center justify-between p-2 rounded-xl border-2 ${idx === 0 ? 'bg-yellow-50 border-yellow-400' : idx === 1 ? 'bg-gray-100 border-gray-300' : 'bg-amber-50 border-amber-300'}`}>
                  <div className="flex items-center gap-2"><span className={`w-6 h-6 rounded-lg font-orbitron font-black text-[10px] flex items-center justify-center ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-400 text-white' : 'bg-amber-500 text-white'}`}>#{idx + 1}</span><img src={sc.team.logoUrl || ''} alt={sc.team.name} className="w-6 h-6 rounded-lg object-cover border border-gray-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><div><div className="font-orbitron font-bold text-[11px] text-gray-900 truncate max-w-[90px]">{sc.team.name}</div><div className="text-[9px] text-gray-500 font-rajdhani font-semibold">{sc.totalKill}K / {sc.totalBooyah}B</div></div></div>
                  <div className="text-right font-orbitron font-black text-base text-red-700">{sc.totalPoints} <span className="text-[8px] text-gray-400 font-normal">PTS</span></div>
                </motion.div>
              ))}</div>
            </div>
            <div className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b-2 border-red-100 pb-1.5 mb-1.5"><span className="font-orbitron font-bold text-[11px] text-gray-700 flex items-center gap-1.5"><Radio className="w-3 h-3 text-red-500 animate-pulse" /> ALL SQUADS</span><span className="text-[9px] font-orbitron text-gray-400">{scores.length} TIM</span></div>
              <div className="space-y-1 overflow-y-auto flex-1">{scores.map((sc) => (
                <motion.div key={sc.team.id} layout className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${sc.rank === 1 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center gap-1.5"><span className="font-orbitron font-black text-gray-400 w-5 text-center">#{sc.rank}</span><span className="font-orbitron font-bold text-gray-900 truncate max-w-[100px]">{sc.team.name}</span></div><div className="flex items-center gap-2 font-orbitron font-bold"><span className="text-gray-600"><Swords className="w-2.5 h-2.5 inline text-red-600" />{sc.totalKill}</span><span className="text-red-700 min-w-[28px] text-right">{sc.totalPoints}</span></div></motion.div>
              ))}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ticker - MERAH */}
      <div className="z-20 bg-red-600 px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 text-xs font-rajdhani font-bold text-white overflow-hidden mt-3">
        <div className="flex items-center gap-2 shrink-0"><span className="px-2 py-0.5 rounded bg-white text-red-600 font-orbitron font-black text-[9px] uppercase">LIVE</span></div>
        <div className="truncate flex-1 text-red-50 font-orbitron font-semibold text-[10px] tracking-wide">LEADER: <strong className="text-yellow-300">{top3[0]?.team.name || '-'}</strong> ({top3[0]?.totalPoints || 0} PTS) &bull; BOOYAH KING: <strong className="text-yellow-300">{topBooyahTeam?.team.name || '-'}</strong> ({topBooyahTeam?.totalBooyah || 0}) &bull; KILL KING: <strong className="text-yellow-300">{topKillsTeam?.team.name || '-'}</strong> ({topKillsTeam?.totalKill || 0})</div>
        <div className="shrink-0 text-red-200 text-[9px] font-orbitron hidden sm:block">FIRESTORE SYNC</div>
      </div>
    </div>
  );
};
