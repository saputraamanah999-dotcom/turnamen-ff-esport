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
  Tv,
  Image as ImageIcon,
  Zap
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
  const [activeTab, setActiveTab] = useState<'results' | 'teams' | 'rounds' | 'settings' | 'livematch'>('livematch');

  // Selected Round for match results input
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

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

  // Auth Functions - NO DEMO MODE, real Firebase Auth only
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
        setAuthError(err.message || 'Gagal autentikasi admin. Pastikan Email/Password provider sudah diaktifkan di Firebase Console.');
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleForceSeed = async () => {
    if (window.confirm('Buat / Reset ulang seluruh data tim, match, dan hasil poin di Firestore?')) {
      setIsSeeding(true);
      try {
        await forceReseedDatabase();
        setOperationStatus({ type: 'success', message: 'Semua data collection Firestore berhasil dibuat!' });
      } catch (err: any) {
        console.error('[Admin] Error seeding:', err);
        setOperationStatus({ type: 'error', message: 'Gagal: ' + (err.message || 'Permission denied. Pastikan Anda login sebagai admin.') });
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
      setSaveStatus('Auto-saved to Firestore');
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
      if (placementCounts[p].length > 1) {
        duplicates.push({ placement: p, teams: placementCounts[p] });
      }
    });
    return duplicates;
  };

  // CRUD Team Handlers with proper error handling
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
      console.error('[Admin] Add team error:', err);
      setOperationStatus({ type: 'error', message: 'Gagal menambah tim: ' + (err.message || 'Permission denied') });
    } finally {
      setIsAddingTeam(false);
    }
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
      setOperationStatus({ type: 'error', message: 'Gagal update tim: ' + (err.message || 'Permission denied') });
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus tim "${name}"? Semua hasil match tim ini juga akan dihapus.`)) {
      try {
        await deleteTeam(id);
        setOperationStatus({ type: 'success', message: `Tim "${name}" berhasil dihapus!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal hapus tim: ' + (err.message || 'Permission denied') });
      }
    }
  };

  // CRUD Round Handlers with proper error handling
  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundLabel.trim()) return;
    setIsAddingRound(true);
    try {
      await addRound(newRoundLabel.trim());
      setNewRoundLabel('');
      setOperationStatus({ type: 'success', message: `Ronde "${newRoundLabel.trim()}" berhasil ditambahkan!` });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal menambah ronde: ' + (err.message || 'Permission denied') });
    } finally {
      setIsAddingRound(false);
    }
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
      setOperationStatus({ type: 'error', message: 'Gagal update ronde: ' + (err.message || 'Permission denied') });
    }
  };

  const handleDeleteRound = async (id: string, label: string) => {
    if (window.confirm(`Hapus ronde "${label}" beserta seluruh hasil datanya?`)) {
      try {
        await deleteRound(id);
        setOperationStatus({ type: 'success', message: `Ronde "${label}" berhasil dihapus!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal hapus ronde: ' + (err.message || 'Permission denied') });
      }
    }
  };

  const handleResetRound = async () => {
    if (!selectedRoundId) return;
    const currentRound = rounds.find(r => r.id === selectedRoundId);
    if (window.confirm(`Kosongkan semua hasil input untuk "${currentRound?.label}"?`)) {
      try {
        await resetRoundResults(selectedRoundId);
        setOperationStatus({ type: 'success', message: `Hasil ronde "${currentRound?.label}" berhasil direset!` });
      } catch (err: any) {
        setOperationStatus({ type: 'error', message: 'Gagal reset ronde: ' + (err.message || 'Permission denied') });
      }
    }
  };

  // Settings Save Handler
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
      setOperationStatus({ type: 'error', message: 'Gagal simpan setting: ' + (err.message || 'Permission denied') });
    }
  };

  // Live Match Config Save Handler
  const handleSaveLiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRound = rounds.find(r => r.id === liveCurrentRoundId);
    const newConfig: SettingsConfig = {
      ...settings,
      tournamentName: liveTournamentName.trim() || 'FREE FIRE WORLD SERIES',
      bannerUrl: liveBannerUrl.trim(),
      currentRoundId: liveCurrentRoundId,
      currentRoundLabel: selectedRound?.label || '',
      status: liveStatus
    };
    try {
      await updateSettings(newConfig);
      setLiveSuccess(true);
      setTimeout(() => setLiveSuccess(false), 3000);
      setOperationStatus({ type: 'success', message: 'Live Match Config berhasil disimpan!' });
    } catch (err: any) {
      setOperationStatus({ type: 'error', message: 'Gagal simpan live config: ' + (err.message || 'Permission denied') });
    }
  };

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

  // Must be logged in - NO DEMO MODE
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(249,115,22,0.5)]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-orbitron font-extrabold text-xl text-slate-100">
            LOGIN ADMIN TOURNAMENT
          </h2>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">
            Masuk dengan Firebase Auth untuk mengelola tournament
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron font-bold text-slate-300 mb-1">EMAIL ADMIN</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@esports.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-orbitron font-bold text-slate-300 mb-1">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="......"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
          >
            Login Ke Admin Panel
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-rajdhani font-semibold">
          <button
            onClick={onOpenGuide}
            className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Setup Guide
          </button>
          <span className="text-slate-500">Firebase Auth Required</span>
        </div>
      </div>
    );
  }

  // ====== ADMIN DASHBOARD ======
  const duplicates = getDuplicatePlacementWarnings();

  return (
    <div className="w-full max-w-6xl mx-auto my-6 px-2">
      {/* Operation Status Toast */}
      {operationStatus && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl font-rajdhani font-bold text-sm flex items-center gap-2 animate-[fadeIn_0.3s_ease-out] ${
          operationStatus.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
            : 'bg-red-950/95 border-red-500/50 text-red-300'
        }`}>
          {operationStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {operationStatus.message}
        </div>
      )}

      {/* Admin Top Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-orange-400 uppercase tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LOGGED IN AS ADMIN
          </div>
          <h2 className="font-orbitron font-black text-2xl text-slate-100">
            FREE FIRE MATCH MANAGEMENT
          </h2>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold">
            {currentUser?.email} — Realtime sync with Firestore database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleForceSeed}
            disabled={isSeeding}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-200" />}
            {isSeeding ? 'Creating Data...' : 'Auto Create Semua Data'}
          </button>

          <ExportCSV scores={scores} rounds={rounds} />

          <button
            onClick={onOpenGuide}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-orange-400" /> Guide
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/50 text-red-300 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Admin Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('livematch')}
          className={`px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'livematch'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" /> Live Match
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'results'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Swords className="w-4 h-4" /> Input Hasil Ronde
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'teams'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Tim ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('rounds')}
          className={`px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'rounds'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" /> Ronde ({rounds.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Setting Poin
        </button>
      </div>

      {/* TAB: LIVE MATCH CONFIG */}
      {activeTab === 'livematch' && (
        <form onSubmit={handleSaveLiveConfig} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-orbitron font-bold text-lg text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-orange-500" /> LIVE MATCH CONFIGURATION
              </h3>
              <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">
                Atur tampilan TV Display & OBS Overlay — juara ronde, banner, status live
              </p>
            </div>
            {liveSuccess && (
              <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400 font-orbitron font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Live Config Disimpan!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tournament Name */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">NAMA TURNAMEN</label>
              <input
                type="text"
                value={liveTournamentName}
                onChange={(e) => setLiveTournamentName(e.target.value)}
                placeholder="FREE FIRE WORLD SERIES"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-orange-400 font-orbitron font-bold text-lg"
              />
              <span className="text-[11px] text-slate-500 block">Nama yang tampil di TV Display / OBS Overlay</span>
            </div>

            {/* Match Status */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">STATUS MATCH</label>
              <div className="flex gap-2">
                {(['waiting', 'live', 'finished'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLiveStatus(s)}
                    className={`flex-1 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition-all ${
                      liveStatus === s
                        ? s === 'live'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse'
                          : s === 'finished'
                          ? 'bg-slate-600 text-white'
                          : 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {s === 'waiting' ? 'Waiting' : s === 'live' ? 'LIVE' : 'Finished'}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 block">Status akan tampil di TV Display sebagai indikator</span>
            </div>

            {/* Current Round Selector */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">RONDE YANG SEDANG BERMAIN</label>
              <select
                value={liveCurrentRoundId}
                onChange={(e) => setLiveCurrentRoundId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-orange-500/40 text-orange-400 font-orbitron font-bold text-sm focus:outline-none"
              >
                <option value="">-- Pilih Ronde --</option>
                {rounds.map((r, idx) => (
                  <option key={r.id} value={r.id}>Match {idx + 1}: {r.label}</option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 block">Juara ronde ini akan tampil di atas TV Display</span>
            </div>

            {/* Banner URL */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">BANNER URL</label>
              <input
                type="text"
                value={liveBannerUrl}
                onChange={(e) => setLiveBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono text-sm"
              />
              {liveBannerUrl && (
                <img src={liveBannerUrl} alt="Banner Preview" className="w-full h-16 object-cover rounded-lg border border-slate-700 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span className="text-[11px] text-slate-500 block">URL gambar banner untuk TV Display (opsional)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-4 h-4" /> Simpan Live Config & Update TV Display
            </button>
          </div>
        </form>
      )}

      {/* TAB: INPUT HASIL RONDE */}
      {activeTab === 'results' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="font-orbitron font-bold text-xs text-slate-300 uppercase tracking-wider whitespace-nowrap">PILIH RONDE:</label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-orange-500/40 text-orange-400 font-orbitron font-bold text-sm focus:outline-none"
              >
                {rounds.map((r, idx) => (
                  <option key={r.id} value={r.id}>Match {idx + 1}: {r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-rajdhani font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 ${
                saveStatus === 'Saved' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' :
                saveStatus.includes('Error') ? 'bg-red-950/60 border-red-500/40 text-red-400' :
                'bg-amber-950/60 border-amber-500/40 text-amber-400'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus}
              </span>
              <button
                onClick={handleResetRound}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-600/50 text-slate-300 hover:text-red-300 text-xs font-orbitron font-bold uppercase transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Ronde
              </button>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs space-y-1">
              <div className="font-orbitron font-bold flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" /> PERINGATAN PLACEMENT GANDA
              </div>
              {duplicates.map((d, i) => (
                <p key={i} className="font-rajdhani font-semibold">
                  Rank #{d.placement} diinput oleh {d.teams.length} tim: <strong>{d.teams.join(', ')}</strong>
                </p>
              ))}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Belum ada tim. Buat tim di tab "Tim" terlebih dahulu.</p>
          ) : !selectedRoundId ? (
            <p className="text-sm text-slate-400 py-6 text-center">Belum ada ronde. Buat ronde di tab "Ronde" terlebih dahulu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 font-orbitron text-xs font-bold uppercase border-b border-slate-800">
                    <th className="py-3 px-4">TIM</th>
                    <th className="py-3 px-4 text-center">PLACEMENT (1-16)</th>
                    <th className="py-3 px-4 text-center">BOOYAH?</th>
                    <th className="py-3 px-4 text-center">KILL</th>
                    <th className="py-3 px-4 text-right">POIN RONDE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {teams.map((t) => {
                    const resKey = `${selectedRoundId}_${t.id}`;
                    const res = results.find(r => r.id === resKey);
                    const kill = res ? res.kill : 0;
                    const placement = res ? res.placement : null;
                    const booyah = res ? res.booyah : false;
                    const killPts = kill * (settings.pointPerKill ?? 1);
                    const placementPts = placement !== null ? (settings.placementPoints?.[String(placement)] ?? 0) : 0;
                    const booyahPts = booyah ? (settings.booyahBonus ?? 0) : 0;
                    const previewRoundTotal = killPts + placementPts + booyahPts;

                    return (
                      <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-orbitron font-bold text-sm text-slate-100 flex items-center gap-3">
                          <img src={t.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt={t.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-900" />
                          <span>{t.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input type="number" min="1" max="16" placeholder="-" value={placement ?? ''} onChange={(e) => handleResultChange(t.id, 'placement', e.target.value)} className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-orbitron font-bold text-sm text-slate-100 focus:border-orange-500 focus:outline-none" />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={booyah} onChange={(e) => handleResultChange(t.id, 'booyah', e.target.checked)} className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer" />
                            {booyah && <Crown className="w-4 h-4 text-amber-400" />}
                          </label>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input type="number" min="0" placeholder="0" value={kill} onChange={(e) => handleResultChange(t.id, 'kill', e.target.value)} className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-orbitron font-bold text-sm text-orange-400 focus:border-orange-500 focus:outline-none" />
                        </td>
                        <td className="py-3.5 px-4 text-right font-orbitron font-extrabold text-base text-orange-400 text-glow-orange">{previewRoundTotal} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: KELOLA TIM */}
      {activeTab === 'teams' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
          <h3 className="font-orbitron font-bold text-lg text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" /> KELOLA TIM ({teams.length})
          </h3>

          <form onSubmit={handleAddTeam} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="sm:col-span-5">
              <input type="text" placeholder="Nama Tim (ex: EVOS DIVINE)" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-5">
              <input type="text" placeholder="URL Logo Tim (Opsional)" value={newTeamLogo} onChange={(e) => setNewTeamLogo(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isAddingTeam} className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
                {isAddingTeam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isAddingTeam ? 'Menambahkan...' : 'Tambah'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {teams.map((t) => {
              const isEditing = editingTeamId === t.id;
              return (
                <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 mr-3">
                      <input type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" />
                      <input type="text" value={editTeamLogo} onChange={(e) => setEditTeamLogo(e.target.value)} className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={t.logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'} alt={t.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80'; }} />
                      <span className="font-orbitron font-bold text-base text-slate-100">{t.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveTeam(t.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingTeamId(null)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEditTeam(t)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"><Edit2 className="w-4 h-4" /></button>
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

      {/* TAB: KELOLA RONDE */}
      {activeTab === 'rounds' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
          <h3 className="font-orbitron font-bold text-lg text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" /> KELOLA RONDE ({rounds.length})
          </h3>

          <form onSubmit={handleAddRound} className="flex gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <input type="text" placeholder="Label Ronde Baru (ex: Match 6 Bermuda)" value={newRoundLabel} onChange={(e) => setNewRoundLabel(e.target.value)} className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-orange-500 focus:outline-none" />
            <button type="submit" disabled={isAddingRound} className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50">
              {isAddingRound ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAddingRound ? 'Menambahkan...' : 'Tambah Ronde'}
            </button>
          </form>

          <div className="space-y-3">
            {rounds.map((r, idx) => {
              const isEditing = editingRoundId === r.id;
              return (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  {isEditing ? (
                    <div className="flex-1 flex gap-2 mr-3">
                      <input type="text" value={editRoundLabel} onChange={(e) => setEditRoundLabel(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-orange-500 text-sm text-slate-100" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-orbitron font-bold text-sm">Match #{idx + 1}:</span>
                      <span className="font-orbitron font-bold text-sm text-slate-200">{r.label}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveRound(r.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingRoundId(null)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEditRound(r)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"><Edit2 className="w-4 h-4" /></button>
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

      {/* TAB: SETTING POIN */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-orbitron font-bold text-lg text-slate-100 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-orange-500" /> SKEMA POIN
              </h3>
              <p className="text-xs text-slate-400 font-rajdhani font-semibold">Setiap perubahan langsung menghitung ulang seluruh skor leaderboard!</p>
            </div>
            {settingsSuccess && (
              <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400 font-orbitron font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Disimpan!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">POIN PER KILL</label>
              <input type="number" min="0" value={editPointPerKill} onChange={(e) => setEditPointPerKill(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-orange-400 font-orbitron font-bold text-lg" />
              <span className="text-[11px] text-slate-500 block">Default Free Fire = 1 poin per kill</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-orbitron font-bold text-slate-200">BONUS BOOYAH</label>
              <input type="number" min="0" value={editBooyahBonus} onChange={(e) => setEditBooyahBonus(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-orbitron font-bold text-lg" />
              <span className="text-[11px] text-slate-500 block">Bonus tambahan khusus tim Booyah</span>
            </div>
          </div>

          <div>
            <h4 className="font-orbitron font-bold text-sm text-slate-200 mb-3 uppercase tracking-wider">POIN PLACEMENT RANK 1-16</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((rank) => (
                <div key={rank} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[11px] font-orbitron font-bold text-slate-400 block mb-1">#{rank}</span>
                  <input type="number" min="0" value={editPlacementPoints[String(rank)] ?? 0} onChange={(e) => setEditPlacementPoints((prev) => ({ ...prev, [String(rank)]: Number(e.target.value) }))} className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-orbitron font-bold text-sm text-amber-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Save className="w-4 h-4" /> Simpan Setting
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
