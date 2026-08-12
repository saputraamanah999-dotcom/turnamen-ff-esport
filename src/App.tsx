import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Podium } from './components/Podium';
import { LeaderboardTable } from './components/LeaderboardTable';
import { TVDisplayView } from './components/TVDisplayView';
import { AdminPanel } from './components/AdminPanel';
import { GuideModal } from './components/GuideModal';
import { ShareLiveModal } from './components/ShareLiveModal';
import { OBSOverlayGuide } from './components/OBSOverlayGuide';
import { Team, Round, ResultItem, SettingsConfig, CalculatedTeamScore } from './types';
import {
  subscribeTeams,
  subscribeRounds,
  subscribeResults,
  subscribeSettings,
  seedInitialDataIfNeeded,
  calculateLeaderboard
} from './lib/firestoreService';
import { DEFAULT_SETTINGS } from './lib/defaultData';
import { Flame, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [settings, setSettings] = useState<SettingsConfig>(DEFAULT_SETTINGS);
  const [scores, setScores] = useState<CalculatedTeamScore[]>([]);

  const [currentView, setCurrentView] = useState<'leaderboard' | 'display' | 'watch' | 'admin'>('leaderboard');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isShareLiveOpen, setIsShareLiveOpen] = useState(false);
  const [isOBSGuideOpen, setIsOBSGuideOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync route / hash for easy direct URL access
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'display') setCurrentView('display');
      else if (hash === 'watch') setCurrentView('watch');
      else if (hash === 'admin') setCurrentView('admin');
      else if (hash === 'leaderboard') setCurrentView('leaderboard');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectView = (view: 'leaderboard' | 'display' | 'watch' | 'admin') => {
    setCurrentView(view);
    window.location.hash = view;
  };

  // Initialize Data & Realtime Firestore Listeners
  useEffect(() => {
    console.log('[App] Initializing Firestore realtime listeners...');
    seedInitialDataIfNeeded();

    let unsubTeams: () => void;
    let unsubRounds: () => void;
    let unsubResults: () => void;
    let unsubSettings: () => void;

    try {
      unsubTeams = subscribeTeams((data) => {
        setTeams(data);
        setLoading(false);
      });
      unsubRounds = subscribeRounds((data) => setRounds(data));
      unsubResults = subscribeResults((data) => setResults(data));
      unsubSettings = subscribeSettings((data) => setSettings(data));
    } catch (err) {
      console.error('[App] Firestore subscription error:', err);
      setLoading(false);
    }

    return () => {
      if (unsubTeams) unsubTeams();
      if (unsubRounds) unsubRounds();
      if (unsubResults) unsubResults();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Calculate live leaderboard
  useEffect(() => {
    if (teams.length > 0) {
      const computedScores = calculateLeaderboard(teams, rounds, results, settings);
      setScores(computedScores);
    } else {
      setScores([]);
    }
  }, [teams, rounds, results, settings]);

  // Full Screen Broadcast / TV Display Mode
  if (currentView === 'display' || currentView === 'watch') {
    return (
      <TVDisplayView
        scores={scores}
        rounds={rounds}
        settings={settings}
        teams={teams}
        results={results}
        viewerMode={currentView === 'watch'}
        onExit={() => handleSelectView('leaderboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-black font-sans">
      <Navbar
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenShareLive={() => setIsShareLiveOpen(true)}
        onOpenOBSGuide={() => setIsOBSGuideOpen(true)}
        scores={scores}
        rounds={rounds}
      />

      <main className="flex-1 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="font-orbitron font-bold text-sm tracking-wider uppercase">Connecting to Firestore Realtime Engine...</span>
          </div>
        ) : currentView === 'admin' ? (
          <AdminPanel
            teams={teams}
            rounds={rounds}
            results={results}
            settings={settings}
            scores={scores}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        ) : (
          <div>
            <Podium top3={scores.slice(0, 3)} />
            <LeaderboardTable scores={scores} rounds={rounds} />
          </div>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 font-rajdhani font-semibold">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-orbitron text-slate-300">FREE FIRE TOURNAMENT LEADERBOARD</span>
          </div>
          <p>Realtime Firestore Sync • Firebase Auth • Vite + React</p>
          <button onClick={() => setIsGuideOpen(true)} className="text-orange-400 hover:underline flex items-center gap-1 font-orbitron">
            <Sparkles className="w-3.5 h-3.5" /> Setup Guide
          </button>
        </div>
      </footer>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <ShareLiveModal isOpen={isShareLiveOpen} onClose={() => setIsShareLiveOpen(false)} />
      <OBSOverlayGuide isOpen={isOBSGuideOpen} onClose={() => setIsOBSGuideOpen(false)} />
    </div>
  );
}
