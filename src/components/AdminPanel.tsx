import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  Lock,
  LogOut,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
  Users,
  Trophy,
  Swords,
  Crown,
  Edit2,
  X,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Radio,
  Zap,
  Monitor,
  MonitorOff,
  Wifi,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { Team, Round, ResultItem, SettingsConfig, CalculatedTeamScore } from '../types';
import {
  addTeam,
  updateTeam,
  deleteTeam,
  addRound,
  updateRound,
  deleteRound,
  saveResultItem,
  resetRoundResults,
  updateSettings,
  forceReseedDatabase
} from '../lib/firestoreService';
import { ExportCSV } from './ExportCSV';
import { Broadcaster } from '../lib/liveStream';

interface AdminPanelProps {
  teams: Team[];
  rounds: Round[];
  results: ResultItem[];
  settings: SettingsConfig;
  scores: CalculatedTeamScore[];
  onOpenGuide: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  teams,
  rounds,
  results,
  settings,
  scores,
  onOpenGuide
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Admin Sub-Tab
  const [activeTab, setActiveTab] = useState<'results' | 'teams' | 'rounds' | 'settings' | 'livematch'>('results');

  // Selected Round for match results input
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  // Expanded team card on mobile
  const [expandedResultTeam, setExpandedResultTeam] = useState<string | null>(null);

  // Team CRUD State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamLogo, setEditTeamLogo] = useState('');
  const [isAddingTeam, setIsAddingTeam] = useState(false);

  // Round CRUD State
  const [newRoundLabel, setNewRoundLabel] = useState('');
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editRoundLabel, setEditRoundLabel] = useState('');
  const [isAddingRound, setIsAddingRound] = useState(false);

  // Settings Editable State
  const [editPointPerKill, setEditPointPerKill] = useState<number>(settings.pointPerKill ?? 1);
  const [editBooyahBonus, setEditBooyahBonus] = useState<number>(settings.booyahBonus ?? 0);
  const [editPlacementPoints, setEditPlacementPoints] = useState<{ [key: string]: number }>(
    settings.placementPoints || {}
  );
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Live Match Config State
  const [liveTournamentName, setLiveTournamentName] = useState(settings.tournamentName || '');
  const [liveBannerUrl, setLiveBannerUrl] = useState(settings.bannerUrl || '');
  const [liveCurrentRoundId, setLiveCurrentRoundId] = useState(settings.currentRoundId || '');
  const [liveStatus, setLiveStatus] = useState<'waiting' | 'live' | 'finished'>(settings.status || 'waiting');
  const [liveSuccess, setLiveSuccess] = useState(false);

  // WebRTC Screen Broadcast State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastViewerCount, setBroadcastViewerCount] = useState(0);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const broadcasterRef = React.useRef<Broadcaster | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);

  // Auto-save Status Indicator
  const [saveStatus, setSaveStatus] = useState<string>('Saved');

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        console.log('[Admin] Authenticated as:', user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync selected round
  useEffect(() => {
    if (rounds.length > 0 && (!selectedRoundId || !rounds.some(r => r.id === selectedRoundId))) {
      setSelectedRoundId(rounds[0].id);
    }
  }, [rounds, selectedRoundId]);

  // Sync settings when props change
  useEffect(() => {
    setEditPointPerKill(settings.pointPerKill ?? 1);
    setEditBooyahBonus(settings.booyahBonus ?? 0);
    setEditPlacementPoints(settings.placementPoints || {});
    setLiveTournamentName(settings.tournamentName || '');
    setLiveBannerUrl(settings.bannerUrl || '');
    setLiveCurrentRoundId(settings.currentRoundId || '');
    setLiveStatus(settings.status || 'waiting');
  }, [settings]);

  // Auto-hide operation status
  useEffect(() => {
    if (operationStatus) {
      const timer = setTimeout(() => setOperationStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [operationStatus]);

  // Auth Functions
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('[Admin] Auth error:', err.code, err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Firebase Auth (Email/Password) belum diaktifkan. Buka Firebase Console > Authentication > Sign-in method > Aktifkan Email/Password.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('Email atau password salah. Silakan periksa kembali.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Terlalu banyak percobaan login. Coba lagi nanti.');
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Koneksi internet bermasalah. Periksa koneksi Anda.');
      } else {
        setAuthError(err.message || 'Gagal autentikasi admin.');
      }
    }
  };

  const handleLogout = () => { signOut(auth); };

  const handleForceSeed = async () => {
    if (window.confirm('Buat / Reset ulang seluruh data tim, match, dan hasil poin di Firestore?')) {
      setIsSeeding(true);
      try {
        await forceReseedDatabase();
        setOperationStatus({ type: 'success', message: 'Semua data collection Firestore berhasil dibuat!' });
      } catch (err: any) {
        console.error('[Admin] Error seeding:', err);
        setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied.') });
      } finally {
        setIsSeeding(false);
      }
    }
  };

  // Result Auto-Save
  const handleResultChange = async (
    teamId: string,
    field: 'kill' | 'placement' | 'booyah',
    val: any
  ) => {
    if (!selectedRoundId) return;
    setSaveStatus('Saving...');

    try {
      const resKey = `${selectedRoundId}_${teamId}`;
      const existing = results.find(r => r.id === resKey) || {
        id: resKey,
        roundId: selectedRoundId,
        teamId,
        kill: 0,
        placement: null,
        booyah: false
      };

      let updatedKill = existing.kill;
      let updatedPlacement = existing.placement;
      let updatedBooyah = existing.booyah;

      if (field === 'kill') {
        updatedKill = Math.max(0, Number(val) || 0);
      } else if (field === 'placement') {
        const parsed = val === '' || val === null ? null : Math.min(16, Math.max(1, Number(val)));
        updatedPlacement = parsed;
        if (parsed === 1) updatedBooyah = true;
        else if (parsed !== null) updatedBooyah = false;
      } else if (field === 'booyah') {
        updatedBooyah = Boolean(val);
        if (updatedBooyah) updatedPlacement = 1;
      }

      await saveResultItem(selectedRoundId, teamId, updatedKill, updatedPlacement, updatedBooyah);
      setSaveStatus('Auto-saved!');
      setTimeout(() => setSaveStatus('Saved'), 1500);
    } catch (err: any) {
      console.error('[Admin] Save result error:', err);
      setSaveStatus('Error: Permission denied');
    }
  };

  // Duplicate placement check
  const getDuplicatePlacementWarnings = () => {
    if (!selectedRoundId) return [];
    const currentRoundResults = results.filter(r => r.roundId === selectedRoundId && r.placement !== null);
    const placementCounts: { [p: number]: string[] } = {};
    currentRoundResults.forEach(r => {
      if (r.placement !== null) {
        if (!placementCounts[r.placement]) placementCounts[r.placement] = [];
        const teamObj = teams.find(t => t.id === r.teamId);
        if (teamObj) placementCounts[r.placement].push(teamObj.name);
      }
    });
    const duplicates: { placement: number; teams: string[] }[] = [];
    Object.keys(placementCounts).forEach(pStr => {
      const p = Number(pStr);
      if (placementCounts[p].length > 1) duplicates.push({ placement: p, teams: placementCounts[p] });
    });
    return duplicates;
  };

  // Team CRUD
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setIsAddingTeam(true);
    try {
      await addTeam(newTeamName.trim(), newTeamLogo.trim());
      setNewTeamName('');
      setNewTeamLogo('');
      setOperationStatus({ type: 'success', message: `Tim "${newTeamName.trim()}" berhasil ditambahkan!` });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    } finally { setIsAddingTeam(false); }
  };

  const handleStartEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditTeamName(team.name);
    setEditTeamLogo(team.logoUrl || '');
  };

  const handleSaveTeam = async (id: string) => {
    if (!editTeamName.trim()) return;
    try {
      await updateTeam(id, editTeamName.trim(), editTeamLogo.trim());
      setEditingTeamId(null);
      setOperationStatus({ type: 'success', message: 'Tim berhasil diupdate!' });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (window.confirm(`Hapus tim "${name}"? Semua hasil match tim ini juga akan dihapus.`)) {
      try {
        await deleteTeam(id);
        setOperationStatus({ type: 'success', message: `Tim "${name}" berhasil dihapus!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
      }
    }
  };

  // Round CRUD
  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundLabel.trim()) return;
    setIsAddingRound(true);
    try {
      await addRound(newRoundLabel.trim());
      setNewRoundLabel('');
      setOperationStatus({ type: 'success', message: `Ronde "${newRoundLabel.trim()}" berhasil ditambahkan!` });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    } finally { setIsAddingRound(false); }
  };

  const handleStartEditRound = (round: Round) => {
    setEditingRoundId(round.id);
    setEditRoundLabel(round.label);
  };

  const handleSaveRound = async (id: string) => {
    if (!editRoundLabel.trim()) return;
    try {
      await updateRound(id, editRoundLabel.trim());
      setEditingRoundId(null);
      setOperationStatus({ type: 'success', message: 'Ronde berhasil diupdate!' });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    }
  };

  const handleDeleteRound = async (id: string, label: string) => {
    if (window.confirm(`Hapus ronde "${label}" beserta seluruh hasil datanya?`)) {
      try {
        await deleteRound(id);
        setOperationStatus({ type: 'success', message: `Ronde "${label}" berhasil dihapus!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
      }
    }
  };

  const handleResetRound = async () => {
    if (!selectedRoundId) return;
    const currentRound = rounds.find(r => r.id === selectedRoundId);
    if (window.confirm(`Kosongkan semua hasil input untuk "${currentRound?.label}"?`)) {
      try {
        await resetRoundResults(selectedRoundId);
        setOperationStatus({ type: 'success', message: `Hasil ronde "${currentRound?.label}" direset!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
      }
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: SettingsConfig = {
      ...settings,
      pointPerKill: Number(editPointPerKill),
      booyahBonus: Number(editBooyahBonus),
      placementPoints: editPlacementPoints
    };
    try {
      await updateSettings(newConfig);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    }
  };

  // Live Match Config Save
  const handleSaveLiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRound = rounds.find(r => r.id === liveCurrentRoundId);
    const newConfig: SettingsConfig = {
      ...settings,
      tournamentName: liveTournamentName.trim() || 'FREE FIRE WORLD SERIES',
      bannerUrl: liveBannerUrl.trim(),
      currentRoundId: liveCurrentRoundId,
      currentRoundLabel: selectedRound?.label || '',
      status: liveStatus,
    };
    try {
      await updateSettings(newConfig);
      setLiveSuccess(true);
      setTimeout(() => setLiveSuccess(false), 3000);
      setOperationStatus({ type: 'success', message: 'Live Config disimpan!' });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied') });
    }
  };

  // Screen Broadcast
  const handleStartBroadcast = async () => {
    setBroadcastError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Browser tidak mendukung. Gunakan Chrome/Edge di PC.');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { max: 30 } },
        audio: true
      });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0].onended = () => { handleStopBroadcast(); };
      const bc = new Broadcaster((count) => setBroadcastViewerCount(count));
      broadcasterRef.current = bc;
      await bc.start(stream);
      setIsBroadcasting(true);
      setBroadcastViewerCount(0);
      await updateSettings({ ...settings, isBroadcasting: true } as SettingsConfig);
      console.log('[Admin] Live broadcast started!');
    } catch (err: any) {
      console.error('[Admin] Broadcast error:', err);
      if (err.name === 'NotAllowedError') {
        setBroadcastError('Kamu menolak share layar. Klik tombol lagi dan pilih layar yang mau di-share.');
      } else {
        setBroadcastError(err.message || 'Gagal mulai broadcast.');
      }
    }
  };

  const handleStopBroadcast = async () => {
    if (broadcasterRef.current) {
      await broadcasterRef.current.stop();
      broadcasterRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsBroadcasting(false);
    setBroadcastViewerCount(0);
    try { await updateSettings({ ...settings, isBroadcasting: false } as SettingsConfig); } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    return () => {
      if (broadcasterRef.current) broadcasterRef.current.stop().catch(() => {});
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ====== RENDER ======

  if (authLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-orange-400 animate-pulse" />
        </div>
        <span className="font-orbitron font-bold text-sm text-slate-400 tracking-wider uppercase">
          Checking Admin Authentication...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(249,115,22,0.5)]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-orbitron font-extrabold text-xl text-slate-100">LOGIN ADMIN</h2>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">Masuk untuk mengelola tournament</p>
        </div>
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" /><span>{authError}</span>
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron font-bold text-slate-300 mb-1">EMAIL</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@esports.com" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-orbitron font-bold text-slate-300 mb-1">PASSWORD</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="......" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20">
            Login Ke Admin Panel
          </button>
        </form>
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-rajdhani font-semibold">
          <button onClick={onOpenGuide} className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Guide</button>
          <span className="text-slate-500">Firebase Auth</span>
        </div>
      </div>
    );
  }

  // ====== ADMIN DASHBOARD ======
  const duplicates = getDuplicatePlacementWarnings();

  // Helper: get team result for selected round
  const getTeamResult = (teamId: string) => {
    if (!selectedRoundId) return null;
    const resKey = `${selectedRoundId}_${teamId}`;
    return results.find(r => r.id === resKey) || null;
  };

  // Helper: calculate preview points for a team in selected round
  const getPreviewRoundTotal = (teamId: string) => {
    const res = getTeamResult(teamId);
    const kill = res ? res.kill : 0;
    const placement = res ? res.placement : null;
    const booyah = res ? res.booyah : false;
    const killPts = kill * (settings.pointPerKill ?? 1);
    const placementPts = placement !== null ? (settings.placementPoints?.[String(placement)] ?? 0) : 0;
    const booyahPts = booyah ? (settings.booyahBonus ?? 0) : 0;
    return killPts + placementPts + booyahPts;
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-6 px-2 sm:px-4">
      {/* Operation Status Toast */}
      {operationStatus && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 px-4 py-3 rounded-xl border shadow-2xl font-rajdhani font-bold text-sm flex items-center gap-2 ${
          operationStatus.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300' : 'bg-red-950/95 border-red-500/50 text-red-300'
        }`}>
          {operationStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {operationStatus.message}
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-orange-400 uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ADMIN LOGGED IN
            </div>
            <h2 className="font-orbitron font-black text-xl sm:text-2xl text-slate-100">MATCH MANAGEMENT</h2>
            <p className="text-xs text-slate-400 font-rajdhani font-semibold">{currentUser?.email} — Realtime Firestore</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleForceSeed} disabled={isSeeding} className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-orbitron font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50">
              {isSeeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isSeeding ? 'Loading...' : 'Reset Data'}
            </button>
            <ExportCSV scores={scores} rounds={rounds} />
            <button onClick={onOpenGuide} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-orbitron font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-orange-400" /> Guide
            </button>
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/50 text-red-300 font-orbitron font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Admin Sub-Tabs - scrollable on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800 -mx-2 px-2 sm:mx-0 sm:px-0">
        {([
          { key: 'results' as const, label: 'Input Hasil', icon: Swords },
          { key: 'livematch' as const, label: 'Live Match', icon: Radio },
          { key: 'teams' as const, label: `Tim (${teams.length})`, icon: Users },
          { key: 'rounds' as const, label: `Ronde (${rounds.length})`, icon: Trophy },
          { key: 'settings' as const, label: 'Setting Poin', icon: SettingsIcon },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-orbitron font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB: INPUT HASIL RONDE (Mobile Card + Desktop Table) ========== */}
      {activeTab === 'results' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-2xl backdrop-blur-md">
          {/* Round Selector + Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="font-orbitron font-bold text-[10px] sm:text-xs text-slate-300 uppercase tracking-wider whitespace-nowrap">RONDE:</label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-900 border border-orange-500/40 text-orange-400 font-orbitron font-bold text-xs sm:text-sm focus:outline-none"
              >
                {rounds.map((r, idx) => (
                  <option key={r.id} value={r.id}>Match {idx + 1}: {r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-rajdhani font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                saveStatus === 'Saved' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' :
                saveStatus.includes('Error') ? 'bg-red-950/60 border-red-500/40 text-red-400' :
                'bg-amber-950/60 border-amber-500/40 text-amber-400'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {saveStatus}
              </span>
              <button onClick={handleResetRound} className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-600/50 text-slate-300 hover:text-red-300 text-[10px] sm:text-xs font-orbitron font-bold uppercase flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs space-y-1">
              <div className="font-orbitron font-bold flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" /> PLACEMENT GANDA!
              </div>
              {duplicates.map((d, i) => (
                <p key={i} className="font-rajdhani font-semibold">Rank #{d.placement}: <strong>{d.teams.join(', ')}</strong></p>
              ))}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Belum ada tim. Buat tim di tab "Tim" dulu.</p>
          ) : !selectedRoundId ? (
            <p className="text-sm text-slate-400 py-6 text-center">Belum ada ronde.</p>
          ) : (
            <>
              {/* ===== MOBILE: Card Layout ===== */}
              <div className="sm:hidden space-y-3">
                {teams.map((t, tIdx) => {
                  const res = getTeamResult(t.id);
                  const kill = res ? res.kill : 0;
                  const placement = res ? res.placement : null;
                  const booyah = res ? res.booyah : false;
                  const previewPts = getPreviewRoundTotal(t.id);
                  const isExpanded = expandedResultTeam === t.id;

                  return (
                    <div key={t.id} className={`rounded-xl border p-3 transition-all ${
                      booyah ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]' :
                      isExpanded ? 'bg-slate-900/80 border-orange-500/40' : 'bg-slate-900/50 border-slate-800'
                    }`}>
                      {/* Card Header - always visible */}
                      <div
                        className="flex items-center justify-between"
                        onClick={() => setExpandedResultTeam(isExpanded ? null : t.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-orange-400 font-orbitron font-black text-xs">#{tIdx + 1}</span>
                          <img src={t.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-900 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'; }} />
                          <div className="min-w-0">
                            <div className="font-orbitron font-bold text-xs text-slate-100 truncate">{t.name}</div>
                            <div className="text-[10px] text-slate-400 font-rajdhani">
                              {placement ? `#${placement}` : '—'} · {kill} kill{booyah ? ' · BOOYAH' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-orbitron font-extrabold text-sm text-orange-400">{previewPts}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>

                      {/* Card Body - expanded inputs */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-orbitron font-bold text-slate-400 mb-1 uppercase">Placement (1-16)</label>
                              <input
                                type="number" min="1" max="16"
                                placeholder="-"
                                value={placement ?? ''}
                                onChange={(e) => handleResultChange(t.id, 'placement', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-center font-orbitron font-bold text-base text-slate-100 focus:border-orange-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-orbitron font-bold text-slate-400 mb-1 uppercase">Kill</label>
                              <input
                                type="number" min="0"
                                placeholder="0"
                                value={kill}
                                onChange={(e) => handleResultChange(t.id, 'kill', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-center font-orbitron font-bold text-base text-orange-400 focus:border-orange-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={booyah}
                                onChange={(e) => handleResultChange(t.id, 'booyah', e.target.checked)}
                                className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="font-orbitron font-bold text-xs text-amber-400 flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5" /> BOOYAH (Juara 1)
                              </span>
                            </label>
                            <span className="font-orbitron font-black text-lg text-orange-400">{previewPts} pts</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ===== DESKTOP: Table Layout ===== */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 font-orbitron text-xs font-bold uppercase border-b border-slate-800">
                      <th className="py-3 px-4">TIM</th>
                      <th className="py-3 px-4 text-center">PLACEMENT (1-16)</th>
                      <th className="py-3 px-4 text-center">BOOYAH?</th>
                      <th className="py-3 px-4 text-center">KILL</th>
                      <th className="py-3 px-4 text-right">POIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {teams.map((t) => {
                      const res = getTeamResult(t.id);
                      const kill = res ? res.kill : 0;
                      const placement = res ? res.placement : null;
                      const booyah = res ? res.booyah : false;
                      const previewPts = getPreviewRoundTotal(t.id);

                      return (
                        <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img src={t.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt={t.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-900" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'; }} />
                              <span className="font-orbitron font-bold text-sm text-slate-100">{t.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input type="number" min="1" max="16" placeholder="-" value={placement ?? ''} onChange={(e) => handleResultChange(t.id, 'placement', e.target.value)} className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-orbitron font-bold text-sm text-slate-100 focus:border-orange-500 focus:outline-none" />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={booyah} onChange={(e) => handleResultChange(t.id, 'booyah', e.target.checked)} className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer" />
                              {booyah && <Crown className="w-4 h-4 text-amber-400" />}
                            </label>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input type="number" min="0" placeholder="0" value={kill} onChange={(e) => handleResultChange(t.id, 'kill', e.target.value)} className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-orbitron font-bold text-sm text-orange-400 focus:border-orange-500 focus:outline-none" />
                          </td>
                          <td className="py-3 px-4 text-right font-orbitron font-extrabold text-base text-orange-400 text-glow-orange">{previewPts} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== TAB: LIVE MATCH CONFIG ========== */}
      {activeTab === 'livematch' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-orbitron font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-orange-500" /> LIVE MATCH CONFIG
              </h3>
              <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">Atur tampilan TV Display & OBS Overlay</p>
            </div>
            {liveSuccess && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400 font-orbitron font-bold text-[10px] sm:text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Disimpan!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">NAMA TURNAMEN</label>
              <input type="text" value={liveTournamentName} onChange={(e) => setLiveTournamentName(e.target.value)} placeholder="FREE FIRE WORLD SERIES" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-orange-400 font-orbitron font-bold text-sm sm:text-base focus:outline-none focus:border-orange-500" />
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">STATUS MATCH</label>
              <div className="flex gap-2">
                {(['waiting', 'live', 'finished'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setLiveStatus(s)} className={"flex-1 py-2 sm:py-2.5 rounded-xl font-orbitron font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all " + (liveStatus === s ? (s === 'live' ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse' : s === 'finished' ? 'bg-slate-600 text-white' : 'bg-amber-600 text-white') : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700')}>
                    {s === 'waiting' ? 'Waiting' : s === 'live' ? 'LIVE' : 'Finished'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">RONDE AKTIF</label>
              <select value={liveCurrentRoundId} onChange={(e) => setLiveCurrentRoundId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-orange-500/40 text-orange-400 font-orbitron font-bold text-xs sm:text-sm focus:outline-none">
                <option value="">-- Pilih --</option>
                {rounds.map((r, idx) => (
                  <option key={r.id} value={r.id}>Match {idx + 1}: {r.label}</option>
                ))}
              </select>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">BANNER URL</label>
              <input type="text" value={liveBannerUrl} onChange={(e) => setLiveBannerUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-500" />
              {liveBannerUrl && (
                <img src={liveBannerUrl} alt="" className="w-full h-14 object-cover rounded-lg border border-slate-700 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          </div>

          {/* WebRTC Broadcast Section */}
          <div className={"p-4 rounded-2xl border-2 " + (isBroadcasting ? "bg-red-950/40 border-red-500/60" : "bg-slate-900/60 border-slate-800")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                <span className="font-orbitron font-bold text-xs sm:text-sm text-slate-200">LIVE SCREEN BROADCAST</span>
              </div>
              {isBroadcasting && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-orbitron font-black text-[9px] sm:text-[10px] uppercase animate-pulse flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> ON AIR
                </span>
              )}
            </div>
            {isBroadcasting ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/50 border border-red-500/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-orbitron font-bold text-red-300">LIVE - Layar kamu di-broadcast ke penonton</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-orbitron font-bold text-[10px] text-slate-200">Viewer: <strong className="text-emerald-400">{broadcastViewerCount}</strong></span>
                  </div>
                  <button type="button" onClick={handleStopBroadcast} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-red-600/30">
                    <MonitorOff className="w-3.5 h-3.5" /> STOP
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] sm:text-xs text-slate-400 font-rajdhani font-semibold">Broadcast layar ke penonton di <strong className="text-orange-400">#watch</strong> via WebRTC (tanpa YouTube).</p>
                <button type="button" onClick={handleStartBroadcast} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-orbitron font-bold text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg shadow-emerald-600/30">
                  <Monitor className="w-4 h-4" /> MULAI BROADCAST
                </button>
                {broadcastError && (
                  <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] sm:text-xs font-rajdhani font-bold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {broadcastError}
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block">Pakai <strong>Chrome/Edge di PC</strong> untuk share layar.</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="button" onClick={(e: any) => handleSaveLiveConfig(e)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Zap className="w-4 h-4" /> Simpan Live Config
            </button>
          </div>
        </div>
      )}

      {/* ========== TAB: KELOLA TIM ========== */}
      {activeTab === 'teams' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
          <h3 className="font-orbitron font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" /> KELOLA TIM ({teams.length})
          </h3>

          <form onSubmit={handleAddTeam} className="space-y-2 sm:grid sm:grid-cols-12 sm:gap-3 sm:space-y-0 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
            <input type="text" placeholder="Nama Tim (ex: EVOS DIVINE)" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="sm:col-span-5 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            <input type="text" placeholder="URL Logo (Opsional)" value={newTeamLogo} onChange={(e) => setNewTeamLogo(e.target.value)} className="sm:col-span-5 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            <button type="submit" disabled={isAddingTeam} className="sm:col-span-2 w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
              {isAddingTeam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAddingTeam ? '...' : 'Tambah'}
            </button>
          </form>

          <div className="space-y-2">
            {teams.map((t) => {
              const isEditing = editingTeamId === t.id;
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 gap-2">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" />
                      <input type="text" value={editTeamLogo} onChange={(e) => setEditTeamLogo(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" placeholder="Logo URL" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={t.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'; }} />
                      <span className="font-orbitron font-bold text-xs sm:text-sm text-slate-100 truncate">{t.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveTeam(t.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingTeamId(null)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEditTeam(t)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteTeam(t.id, t.name)} className="p-2 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== TAB: KELOLA RONDE ========== */}
      {activeTab === 'rounds' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
          <h3 className="font-orbitron font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" /> KELOLA RONDE ({rounds.length})
          </h3>

          <form onSubmit={handleAddRound} className="flex gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <input type="text" placeholder="Label Ronde Baru" value={newRoundLabel} onChange={(e) => setNewRoundLabel(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            <button type="submit" disabled={isAddingRound} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-[10px] sm:text-xs text-white uppercase flex items-center gap-1.5 disabled:opacity-50">
              {isAddingRound ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {isAddingRound ? '...' : 'Tambah'}
            </button>
          </form>

          <div className="space-y-2">
            {rounds.map((r, idx) => {
              const isEditing = editingRoundId === r.id;
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 gap-2">
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <input type="text" value={editRoundLabel} onChange={(e) => setEditRoundLabel(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-orange-400 font-orbitron font-bold text-xs shrink-0">#{idx + 1}</span>
                      <span className="font-orbitron font-bold text-xs sm:text-sm text-slate-200 truncate">{r.label}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveRound(r.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingRoundId(null)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEditRound(r)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteRound(r.id, r.label)} className="p-2 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== TAB: SETTING POIN ========== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-orbitron font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-orange-500" /> SKEMA POIN
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-rajdhani font-semibold">Setiap perubahan langsung menghitung ulang skor!</p>
            </div>
            {settingsSuccess && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400 font-orbitron font-bold text-[10px] sm:text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Disimpan!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">POIN PER KILL</label>
              <input type="number" min="0" value={editPointPerKill} onChange={(e) => setEditPointPerKill(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-orange-400 font-orbitron font-bold text-lg" />
              <span className="text-[10px] text-slate-500 block">Default FF = 1 poin/kill</span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-[10px] sm:text-xs font-orbitron font-bold text-slate-200 uppercase">BONUS BOOYAH</label>
              <input type="number" min="0" value={editBooyahBonus} onChange={(e) => setEditBooyahBonus(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-orbitron font-bold text-lg" />
              <span className="text-[10px] text-slate-500 block">Bonus tim Booyah</span>
            </div>
          </div>

          <div>
            <h4 className="font-orbitron font-bold text-xs sm:text-sm text-slate-200 mb-3 uppercase tracking-wider">POIN PLACEMENT RANK 1-16</h4>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((rank) => (
                <div key={rank} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[10px] font-orbitron font-bold text-slate-400 block mb-1">#{rank}</span>
                  <input type="number" min="0" value={editPlacementPoints[String(rank)] ?? 0} onChange={(e) => setEditPlacementPoints((prev) => ({ ...prev, [String(rank)]: Number(e.target.value) }))} className="w-full px-1.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-orbitron font-bold text-xs sm:text-sm text-amber-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Save className="w-4 h-4" /> Simpan Setting
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
