import React, { useState } from 'react';
import {
  X,
  Tv,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Settings,
  Radio,
  Sliders,
  MonitorCheck,
  Video
} from 'lucide-react';

interface OBSOverlayGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OBSOverlayGuide: React.FC<OBSOverlayGuideProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<'display' | 'leaderboard'>('display');

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const obsUrl = `${baseUrl}/?mode=${activePreset}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] font-orbitron font-extrabold text-orange-400 uppercase tracking-widest">
                OBS STUDIO INTEGRATION
              </span>
              <span className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> READY
              </span>
            </div>
            <h3 className="font-orbitron font-black text-xl md:text-2xl text-slate-100">
              OBS BROADCAST OVERLAY GUIDE
            </h3>
          </div>
        </div>

        {/* Mode Selector Preset */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-6 space-y-3">
          <label className="block text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider">
            1. PILIH TAMPILAN OBS SOURCE:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActivePreset('display')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activePreset === 'display'
                  ? 'bg-orange-950/60 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-orbitron font-bold text-xs uppercase flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-orange-400" /> Full Esports Stream HUD
              </div>
              <p className="text-[11px] font-rajdhani text-slate-400">
                Tampilan TV Display + Stream Layar Game + Leaderboard Side panel untuk OBS Browser Source.
              </p>
            </button>

            <button
              onClick={() => setActivePreset('leaderboard')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activePreset === 'leaderboard'
                  ? 'bg-orange-950/60 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-orbitron font-bold text-xs uppercase flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-amber-400" /> Standings Leaderboard Only
              </div>
              <p className="text-[11px] font-rajdhani text-slate-400">
                Hanya tabel Klasemen Poin & Ranking untuk Caster / Analysis Desk di OBS.
              </p>
            </button>
          </div>
        </div>

        {/* OBS URL Input */}
        <div className="mb-6 space-y-2">
          <label className="block text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider">
            2. SALIN URL BROWSER SOURCE UTK OBS:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={obsUrl}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-orange-300 font-mono text-xs focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin URL'}
            </button>
          </div>
        </div>

        {/* Step-by-Step Setup Instructions */}
        <div className="space-y-4 mb-6">
          <h4 className="font-orbitron font-extrabold text-sm text-slate-200 flex items-center gap-2 uppercase">
            <Settings className="w-4 h-4 text-orange-400" /> LANGKAH-LANGKAH PENGATURAN DI OBS STUDIO:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-rajdhani text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="font-orbitron font-bold text-orange-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px]">1</span>
                Tambah Browser Source
              </div>
              <p className="text-slate-300">
                Di OBS Studio, buka panel <strong>Sources</strong>, klik ikon <strong>+</strong> lalu pilih <strong>Browser</strong>. Beri nama "FF Tournament Overlay".
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="font-orbitron font-bold text-orange-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px]">2</span>
                Tempelkan URL & Resolusi
              </div>
              <p className="text-slate-300">
                Tempel URL yang sudah disalin di atas. Atur <strong>Width: 1920</strong> dan <strong>Height: 1080</strong>, dengan FPS <strong>60</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="font-orbitron font-bold text-orange-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px]">3</span>
                Audio & Cache
              </div>
              <p className="text-slate-300">
                Centang opsi <em>"Control audio via OBS"</em> jika ingin mengatur volume game/sound effect turnamen langsung lewat Audio Mixer OBS.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="font-orbitron font-bold text-orange-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px]">4</span>
                Realtime Auto-Sync
              </div>
              <p className="text-slate-300">
                Setiap kali admin memperbarui poin di Admin Panel, OBS Browser Source akan ter-update secara otomatis secara realtime!
              </p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <a
            href={obsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-orbitron font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" /> Uji Tampilan di Tab Baru
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-orbitron font-bold text-xs uppercase"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
