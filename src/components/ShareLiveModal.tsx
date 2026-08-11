import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Tv, Smartphone, ExternalLink, Maximize } from 'lucide-react';

interface ShareLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLiveModal: React.FC<ShareLiveModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;
  const tvDisplayUrl = `${window.location.origin}/?mode=display`;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="font-orbitron font-extrabold text-xl text-slate-100">
            STREAMING LIVE TV & HP
          </h3>
          <p className="text-xs text-slate-400 font-rajdhani font-semibold mt-1">
            Nonton hasil match & leaderboard real-time di HP penonton atau Layar Monitor/TV
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center mb-6 text-center">
          <div className="p-4 bg-white rounded-xl shadow-xl mb-3">
            <QRCodeSVG value={currentUrl} size={180} level="H" includeMargin={true} />
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-orange-400">
            <Smartphone className="w-4 h-4" /> SCAN DENGAN KAMERA HP UNTUK NONTON
          </div>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-orbitron font-bold text-slate-300">
            LINK BROADCAST TV / MONITOR LAIN:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={tvDisplayUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none"
            />
            <button
              onClick={() => handleCopy(tvDisplayUrl)}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-orbitron font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleFullscreen}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Maximize className="w-4 h-4 text-orange-400" /> Fullscreen TV View
          </button>

          <a
            href={tvDisplayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <ExternalLink className="w-4 h-4" /> Buka Tab Layar TV
          </a>
        </div>
      </div>
    </div>
  );
};
