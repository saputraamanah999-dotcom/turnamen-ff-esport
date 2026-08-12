import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Tv, Smartphone, ExternalLink, Maximize, Link2, Share2 } from 'lucide-react';

interface ShareLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLiveModal: React.FC<ShareLiveModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = window.location.origin + window.location.pathname;
  const watchUrl = `${origin}#watch`;
  const displayUrl = `${origin}#display`;
  const adminUrl = `${origin}#admin`;

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Free Fire Tournament - LIVE',
          text: 'Nonton tournament Free Fire LIVE real-time!',
          url: watchUrl
        });
      } catch (e) {
        // User cancelled or error - fallback to copy
        handleCopy(watchUrl, 'watch');
      }
    } else {
      handleCopy(watchUrl, 'watch');
    }
  };

  const handleFullscreen = () => {
    window.open(watchUrl, '_blank', 'fullscreen=yes,menubar=no,toolbar=no');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 via-red-600/30 to-amber-500/30 text-orange-400 border border-orange-500/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="font-orbitron font-extrabold text-xl text-slate-100">
            SHARE LINK LIVE
          </h3>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">
            Kirim link ini ke siapa aja buat nonton tournament real-time
          </p>
        </div>

        {/* QR Code - points to WATCH URL for viewers */}
        <div className="bg-slate-900/90 border border-orange-500/30 p-5 rounded-2xl flex flex-col items-center justify-center mb-5 text-center">
          <div className="p-3 bg-white rounded-xl shadow-xl mb-3">
            <QRCodeSVG value={watchUrl} size={160} level="H" includeMargin={true} />
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-orange-400">
            <Smartphone className="w-4 h-4" /> SCAN BUAT NONTON DI HP
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-rajdhani">Penonton akan langsung buka mode Watch (real-time)</p>
        </div>

        {/* LINK NONTON (Watch) - Main shareable link */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <label className="text-xs font-orbitron font-bold text-red-400 uppercase tracking-wider">
              Link Nonton Penonton (Share Ini)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs font-mono truncate">
              {watchUrl}
            </div>
            <button
              onClick={() => handleCopy(watchUrl, 'watch')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-orbitron font-bold text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
            >
              {copied === 'watch' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'watch' ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        {/* LINK TV DISPLAY */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <label className="text-xs font-orbitron font-bold text-amber-400 uppercase tracking-wider">
              Link TV Display / Monitor
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono truncate">
              {displayUrl}
            </div>
            <button
              onClick={() => handleCopy(displayUrl, 'display')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-orbitron font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
            >
              {copied === 'display' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'display' ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        {/* LINK ADMIN */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <label className="text-xs font-orbitron font-bold text-emerald-400 uppercase tracking-wider">
              Link Admin (Input Skor)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono truncate">
              {adminUrl}
            </div>
            <button
              onClick={() => handleCopy(adminUrl, 'admin')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-orbitron font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
            >
              {copied === 'admin' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'admin' ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handleShareNative}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
          >
            <Share2 className="w-4 h-4" /> Share ke WhatsApp/IG
          </button>

          <a
            href={watchUrl}
            target="blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-orange-400" /> Buka Mode Nonton
          </a>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-[10px] text-slate-500 font-rajdhani font-bold leading-relaxed">
            <span className="text-orange-400">#watch</span> = Mode penonton (read-only, real-time)<br/>
            <span className="text-amber-400">#display</span> = Mode TV Display (bisa screen capture + kontrol)<br/>
            <span className="text-emerald-400">#admin</span> = Mode Admin (input skor & atur live config)<br/>
            Semua data tersinkronisasi otomatis via Firebase Firestore real-time.
          </p>
        </div>
      </div>
    </div>
  );
};
