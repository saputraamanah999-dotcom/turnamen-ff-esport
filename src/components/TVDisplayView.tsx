import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2, Minimize2, Flame, Crown, Swords, Trophy, Radio,
  Monitor, Camera, Play, Volume2, VolumeX, Zap, Target, Star,
  RefreshCw, Users, Wifi, WifiOff
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

  // WebRTC Live Streaming
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [liveRemoteStream, setLiveRemoteStream] = useState<MediaStream | null>(null);
  const [viewerLiveStatus, setViewerLiveStatus] = useState<ViewerStatus>('idle');
  const [viewerLiveMsg, setViewerLiveMsg] = useState('');
  const [liveViewerCount, setLiveViewerCount] = useState(0);
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
  const liveMatchStatus = settings.status || 'waiting';
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
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window', width: { max: 1280 }, height: { max: 720 }, frameRate: { max: 30 } }, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      stream.getVideoTracks()[0].onended = () => { stopGameplayStream(); };
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
    if (isLiveBroadcasting && broadcasterRef.current) {
      broadcasterRef.current.stop().catch(() => {});
      broadcasterRef.current = null;
      setIsLiveBroadcasting(false);
      setLiveViewerCount(0);
    }
  };

  const setSampleVideoMode = () => { stopGameplayStream(); setStreamMode('sample'); setIsStreaming(true); };

  // ====== VIEWER MODE: Auto-connect WebRTC ======
  useEffect(() => {
    if (!viewerMode) return;
    const viewer = new Viewer(
      (stream) => {
        setLiveRemoteStream(stream);
        // Force play on the video element
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.play().then(() => {
              console.log('[TV] Video playing!');
            }).catch(e => {
              console.warn('[TV] Auto-play blocked, clicking unmute will fix:', e);
            });
          }
        }, 100);
      },
      (status, message) => {
        setViewerLiveStatus(status);
        setViewerLiveMsg(message || '');
      }
    );
    viewerRef.current = viewer;
    viewer.connect();
    return () => { viewer.disconnect(); viewerRef.current = null; setLiveRemoteStream(null); };
  }, [viewerMode]);

  // ====== ADMIN: GO LIVE toggle ======
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

  const statusConfig = {
    waiting: { label: 'WAITING', color: 'bg-amber-500', textColor: 'text-white', shadow: 'shadow-amber-500/50' },
    live: { label: 'LIVE', color: 'bg-red-600', textColor: 'text-white', shadow: 'shadow-red-600/60' },
    finished: { label: 'FINISHED', color: 'bg-gray-500', textColor: 'text-white', shadow: 'shadow-gray-500/30' }
  };
  const sc = statusConfig[liveMatchStatus];

  // ====== ANIMATED FALLBACK COMPONENT (MERAH PUTIH - bright!) ======
  const AnimatedFallback = ({ status, message }: { status?: string; message?: string }) => (
    <div className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center overflow-hidden bg-white">
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
        <h3 className="font-orbitron font-black text-xl md:text-2xl text-red-700 uppercase mb-3">{tournamentName}</h3>
        <p className="text-sm text-gray-600 font-rajdhani font-bold max-w-md mb-2">{message || (liveMatchStatus === 'live' ? 'Match sedang berlangsung...' : 'Menunggu dimulai...')}</p>
        {currentRoundLabel && <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-orbitron font-bold text-xs">{currentRoundLabel}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between p-3 md:p-4 lg:p-6 select-none relative overflow-hidden font-sans">
      {/* Subtle red gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-50 via-white to-white pointer-events-none" />

      {/* ===== TOP BAR ===== */}
      <div className="relative z-20 space-y-3 mb-3">
        <div className="bg-white border-2 border-red-600 rounded-2xl shadow-lg overflow-hidden">
          {bannerUrl && (
            <div className="relative h-16 md:h-20 overflow-hidden">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
            </div>
          )}
          <div className="px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600 shadow-md">
                <Flame className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md ${sc.color} ${sc.textColor} font-orbitron font-extrabold text-[10px] uppercase tracking-widest shadow-lg ${sc.shadow} ${liveMatchStatus === 'live' ? 'animate-pulse' : ''}`}>
                    {liveMatchStatus === 'live' && <Radio className="w-3 h-3 inline mr-1" />}{sc.label}
                  </span>
                  <LiveIndicator className="hidden sm:inline-flex" />
                  {isLiveBroadcasting && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-orbitron font-black text-[10px] uppercase animate-pulse flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5" /> BROADCASTING
                    </span>
                  )}
                  {viewerMode && viewerLiveStatus === 'connected' && (
                    <span className="px-2 py-0.5 rounded-md bg-green-600 text-white font-orbitron font-black text-[10px] uppercase flex items-center gap-1">
                      <Wifi className="w-2.5 h-2.5" /> WATCHING LIVE
                    </span>
                  )}
                </div>
                <h1 className="font-orbitron font-black text-base md:text-xl lg:text-2xl tracking-wider text-red-700 uppercase">{tournamentName}</h1>
              </div>
            </div>
            {currentRoundLabel && <span className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-orbitron font-bold text-xs">{currentRoundLabel}</span>}
            <div className="flex items-center gap-2">
              {!viewerMode && <ScreenRecorder />}
              {!viewerMode && <button onClick={() => setLayoutStyle(layoutStyle === 'split' ? 'overlay' : 'split')} className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-xs font-orbitron font-bold uppercase flex items-center gap-1" title="Toggle Layout"><Zap className="w-3.5 h-3.5 text-red-600" /> {layoutStyle.toUpperCase()}</button>}
              <button onClick={toggleFullscreen} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800" title="Fullscreen">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
              {!viewerMode && onExit && <button onClick={onExit} className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-orbitron font-bold text-xs uppercase">Keluar</button>}
            </div>
          </div>
        </div>

        {/* ROUND WINNER BANNER */}
        <AnimatePresence mode="wait">
          {currentRoundWinner && (
            <motion.div key={currentRoundWinner.team.id} initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-2xl px-5 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}><Crown className="w-7 h-7 md:w-8 md:h-8 text-yellow-300 drop-shadow-md" /></motion.div>
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
            <motion.div key={currentRoundKillLeader.team.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-red-600" /><span className="text-[10px] font-orbitron font-bold text-red-600 uppercase tracking-widest">Kill Leader</span></div>
              <div className="flex items-center gap-2"><img src={currentRoundKillLeader.team.logoUrl} alt="" className="w-5 h-5 rounded border border-gray-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="font-orbitron font-bold text-sm text-gray-900">{currentRoundKillLeader.team.name}</span><span className="px-2 py-0.5 rounded bg-red-600 text-white font-orbitron font-extrabold text-xs">{currentRoundKillLeader.result.kill} KILLS</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {streamError && <div className="mb-3 p-3 rounded-xl bg-red-100 border-2 border-red-400 text-red-800 text-xs font-orbitron text-center z-20">{streamError}</div>}

      {/* ===== MAIN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 z-10 my-auto flex-1 items-stretch">
        <div className={`flex flex-col relative rounded-2xl overflow-hidden border-2 ${isLiveBroadcasting ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'border-gray-300'} bg-white shadow-lg min-h-[320px] ${layoutStyle === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* HUD */}
          <div className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-white/90 via-white/30 to-transparent p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full ${sc.color} ${sc.textColor} font-orbitron font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md ${sc.shadow} ${liveMatchStatus === 'live' ? 'animate-pulse' : ''}`}><Radio className="w-3 h-3" /> {sc.label} FEED</span>
              {currentRoundLabel && <span className="text-xs font-orbitron font-bold text-gray-700 hidden sm:inline">{currentRoundLabel}</span>}
              {isLiveBroadcasting && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-orbitron font-black text-[9px] flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {liveViewerCount}</span>}
            </div>
            <div className="flex items-center gap-2">
              {topBooyahTeam && <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-400 text-yellow-800 font-orbitron font-bold text-[10px]"><Crown className="w-3 h-3" /> MOST BOOYAH: <strong className="text-red-700 ml-1">{topBooyahTeam.team.name}</strong> ({topBooyahTeam.totalBooyah})</div>}
              {topKillsTeam && <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-300 text-red-800 font-orbitron font-bold text-[10px]"><Swords className="w-3 h-3" /> MOST KILLS: <strong className="text-red-700 ml-1">{topKillsTeam.team.name}</strong> ({topKillsTeam.totalKill})</div>}
            </div>
          </div>

          {/* ===== VIDEO / STREAM CONTAINER ===== */}
          <div className="relative w-full h-full flex items-center justify-center bg-gray-100 min-h-[300px] overflow-hidden">
            {viewerMode ? (
              /* ===== VIEWER MODE: WebRTC Live Stream ===== */
              liveRemoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-contain bg-black" style={{ minHeight: '300px' }} />
              ) : (
                <AnimatedFallback status={viewerLiveStatus} message={viewerLiveMsg} />
              )
            ) : (
              /* ===== ADMIN MODE ===== */
              <>
                {streamMode === 'screen' || streamMode === 'camera' ? (
                  <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-contain bg-black" style={{ minHeight: '300px' }} />
                ) : (
                  <AnimatedFallback />
                )}

                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white z-20">
                    <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center mb-4 animate-bounce"><Monitor className="w-7 h-7" /></div>
                    <h3 className="font-orbitron font-black text-lg text-gray-900 mb-2">TANGKAP LAYAR FREE FIRE</h3>
                    <p className="text-xs text-gray-600 font-rajdhani font-bold max-w-md mb-5">Klik <strong>"Tangkap Layar"</strong> lalu klik <strong>"GO LIVE"</strong> biar penonton bisa nonton.</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button onClick={() => startGameplayStream('screen')} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-md hover:bg-red-700 flex items-center gap-2"><Monitor className="w-4 h-4" /> Tangkap Layar</button>
                      <button onClick={() => startGameplayStream('camera')} className="px-5 py-2.5 rounded-xl bg-gray-100 border-2 border-gray-300 text-gray-800 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-gray-200 flex items-center gap-2"><Camera className="w-4 h-4" /> Kamera</button>
                    </div>
                  </div>
                )}

                {/* Stream Controls */}
                {isStreaming && (
                  <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startGameplayStream('screen')} className={`px-2.5 py-1.5 rounded-lg font-orbitron font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${streamMode === 'screen' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800 border border-gray-300'}`}><Monitor className="w-3 h-3" /> Screen</button>
                      <button onClick={() => startGameplayStream('camera')} className={`px-2.5 py-1.5 rounded-lg font-orbitron font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${streamMode === 'camera' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800 border border-gray-300'}`}><Camera className="w-3 h-3" /> Camera</button>
                      {/* GO LIVE BUTTON */}
                      <button onClick={handleToggleBroadcast} className={`px-3 py-1.5 rounded-lg font-orbitron font-black text-[10px] uppercase flex items-center gap-1.5 transition-all ${isLiveBroadcasting ? 'bg-red-600 text-white animate-pulse shadow-lg' : 'bg-green-600 text-white hover:bg-green-500 shadow-md'}`}>
                        <Radio className="w-3 h-3" /> {isLiveBroadcasting ? `LIVE (${liveViewerCount})` : 'GO LIVE'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={stopGameplayStream} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 text-[10px] font-orbitron font-bold">Stop</button>
                      <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-colors">{isMuted ? <VolumeX className="w-4 h-4 text-red-600" /> : <Volume2 className="w-4 h-4 text-green-600" />}</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Viewer Mute Button */}
            {viewerMode && liveRemoteStream && (
              <button onClick={() => {
                setIsMuted(!isMuted);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = !isMuted;
                  remoteVideoRef.current.play().catch(() => {});
                }
              }} className="absolute bottom-3 right-3 z-30 p-2.5 rounded-xl bg-white/90 border-2 border-gray-300 text-gray-800 hover:bg-gray-100 transition-colors shadow-md" title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX className="w-5 h-5 text-red-600" /> : <Volume2 className="w-5 h-5 text-green-600" />}
              </button>
            )}
          </div>

          {/* OVERLAY MODE */}
          {layoutStyle === 'overlay' && !viewerMode && (
            <div className="absolute bottom-3 inset-x-3 z-30 pointer-events-none grid grid-cols-1 md:grid-cols-3 gap-2">
              {top3.map((sc, idx) => (
                <div key={sc.team.id} className={`p-2.5 rounded-2xl border-2 backdrop-blur-md flex items-center justify-between pointer-events-auto ${idx === 0 ? 'bg-yellow-400 border-yellow-500 shadow-lg' : idx === 1 ? 'bg-gray-300 border-gray-400' : 'bg-amber-600 border-amber-700'}`}>
                  <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg font-orbitron font-black text-xs flex items-center justify-center ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-gray-900' : 'bg-amber-700 text-white'}`}>#{idx + 1}</span><div><div className="font-orbitron font-extrabold text-xs text-gray-900 truncate max-w-[100px]">{sc.team.name}</div><div className="text-[9px] text-gray-700 flex items-center gap-1.5"><span><Swords className="w-2.5 h-2.5 inline text-red-600" /> {sc.totalKill}</span><span><Crown className="w-2.5 h-2.5 inline text-yellow-600" /> {sc.totalBooyah}</span></div></div></div>
                  <div className="text-right"><div className="font-orbitron font-black text-xl text-red-700">{sc.totalPoints}</div><div className="text-[8px] font-orbitron font-bold text-gray-500">PTS</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        {layoutStyle === 'split' && (
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3 overflow-hidden">
            {currentRoundResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between border-b-2 border-red-100 pb-2 mb-2"><span className="font-orbitron font-black text-xs text-red-600 uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> STANDINGS RONDE INI</span>{liveMatchStatus === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}</div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto">{currentRoundResults.slice(0, 7).map((r) => (
                  <motion.div key={r.teamId} layout transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] ${r.placement === 1 ? 'bg-yellow-50 border border-yellow-400' : 'bg-gray-50'}`}><div className="flex items-center gap-1.5"><span className={`w-5 h-5 rounded font-orbitron font-black text-[10px] flex items-center justify-center ${r.placement === 1 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'}`}>#{r.placement || '-'}</span><span className="font-orbitron font-bold text-gray-900 truncate max-w-[90px]">{r.teamName}</span></div><div className="flex items-center gap-2 font-orbitron font-bold">{r.booyah && <Crown className="w-3 h-3 text-yellow-500" />}<span className="text-red-600">{r.kill}<Swords className="w-2.5 h-2.5 inline ml-0.5" /></span></div></motion.div>
                ))}</div>
              </motion.div>
            )}
            <div className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md"><div className="flex items-center justify-between border-b-2 border-red-100 pb-2 mb-2"><span className="font-orbitron font-black text-xs text-red-600 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> TOP 3 OVERALL</span><span className="text-[9px] font-orbitron font-bold text-gray-400">LIVE SYNC</span></div><div className="space-y-1.5">{top3.map((sc, idx) => (
              <motion.div key={sc.team.id} layout className={`flex items-center justify-between p-2 rounded-xl border-2 ${idx === 0 ? 'bg-yellow-50 border-yellow-400 shadow-sm' : idx === 1 ? 'bg-gray-100 border-gray-300' : 'bg-amber-50 border-amber-300'}`}><div className="flex items-center gap-2"><span className={`w-6 h-6 rounded-lg font-orbitron font-black text-[10px] flex items-center justify-center ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-400 text-white' : 'bg-amber-500 text-white'}`}>#{idx + 1}</span><img src={sc.team.logoUrl || ''} alt={sc.team.name} className="w-6 h-6 rounded-lg object-cover border border-gray-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><div><div className="font-orbitron font-bold text-[11px] text-gray-900 truncate max-w-[90px]">{sc.team.name}</div><div className="text-[9px] text-gray-500 font-rajdhani font-semibold">{sc.totalKill}K / {sc.totalBooyah}B</div></div></div><div className="text-right font-orbitron font-black text-base text-red-700">{sc.totalPoints} <span className="text-[8px] text-gray-400 font-normal">PTS</span></div></motion.div>
            ))}</div></div>
            <div className="bg-white border-2 border-red-200 rounded-2xl p-3 shadow-md flex-1 flex flex-col min-h-0"><div className="flex items-center justify-between border-b-2 border-red-100 pb-1.5 mb-1.5"><span className="font-orbitron font-bold text-[11px] text-gray-700 flex items-center gap-1.5"><Radio className="w-3 h-3 text-red-500 animate-pulse" /> SQUAD STANDINGS</span><span className="text-[9px] font-orbitron text-gray-400">{scores.length} SQUADS</span></div><div className="space-y-1 overflow-y-auto flex-1">{scores.map((sc) => (
              <motion.div key={sc.team.id} layout transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${sc.rank === 1 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center gap-1.5"><span className="font-orbitron font-black text-gray-400 w-5 text-center">#{sc.rank}</span><span className="font-orbitron font-bold text-gray-900 truncate max-w-[100px]">{sc.team.name}</span></div><div className="flex items-center gap-2 font-orbitron font-bold"><span className="text-gray-600"><Swords className="w-2.5 h-2.5 inline text-red-600" />{sc.totalKill}</span><span className="text-red-700 min-w-[28px] text-right">{sc.totalPoints}</span></div></motion.div>
            ))}</div></div>
          </div>
        )}
      </div>

      {/* Bottom Ticker */}
      <div className="z-20 bg-red-600 px-4 py-2 rounded-xl flex items-center justify-between gap-4 text-xs font-rajdhani font-bold text-white overflow-hidden mt-3">
        <div className="flex items-center gap-2 shrink-0"><span className="px-2 py-0.5 rounded bg-white text-red-600 font-orbitron font-black text-[9px] uppercase">LIVE</span></div>
        <div className="truncate flex-1 text-red-50 font-orbitron font-semibold text-[10px] tracking-wide">LEADER: <strong className="text-yellow-300">{top3[0]?.team.name || '-'}</strong> ({top3[0]?.totalPoints || 0} PTS) &bull; BOOYAH KING: <strong className="text-yellow-300">{topBooyahTeam?.team.name || '-'}</strong> ({topBooyahTeam?.totalBooyah || 0}) &bull; KILL KING: <strong className="text-yellow-300">{topKillsTeam?.team.name || '-'}</strong> ({topKillsTeam?.totalKill || 0})</div>
        <div className="shrink-0 text-red-200 text-[9px] font-orbitron hidden sm:block">REALTIME FIRESTORE</div>
      </div>
    </div>
  );
};
