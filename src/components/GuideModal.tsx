import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, ShieldCheck, Server, Cloud, AlertTriangle } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedRules, setCopiedRules] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null;
    }
    match /teams/{teamId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    match /rounds/{roundId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    match /results/{resultId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    match /settings/{settingId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}`;

  const envSnippet = `VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="your-database-id"`;

  const handleCopy = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30"><Cloud className="w-5 h-5" /></div>
            <div>
              <h2 className="font-orbitron font-extrabold text-lg text-slate-100">PANDUAN SETUP FIREBASE</h2>
              <p className="text-xs text-slate-400 font-rajdhani font-semibold">Langkah lengkap deployment & setup Firebase</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 font-sans">
          {/* Step 0: Auto Setup */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
            <h3 className="font-orbitron font-bold text-base text-emerald-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs flex items-center justify-center">0</span>
              CARA PALING MUDAH: Auto Setup
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <li>Buka file <strong className="text-emerald-300">setup-firebase.html</strong> di browser (Chrome).</li>
              <li>Klik <strong className="text-emerald-300">"Jalankan Setup Lengkap"</strong> — ini otomatis:
                <ul className="ml-4 mt-1 space-y-0.5 text-slate-400">
                  <li>Membuat akun admin Firebase Auth</li>
                  <li>Membuat collection: teams, rounds, results, settings</li>
                  <li>Menyimpan data sample (7 tim, 5 ronde, hasil lengkap)</li>
                </ul>
              </li>
              <li>Selesai! Login ke Admin Panel dengan email admin.</li>
            </ol>
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Syarat:</strong> Firebase Auth {'>'} Sign-in method {'>'} Email/Password harus sudah diaktifkan sebelum menjalankan setup.</span>
            </div>
          </div>

          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="font-orbitron font-bold text-base text-amber-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center">1</span>
              Setup Firebase Console
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Aktifkan <strong>Firestore Database</strong> (Production mode, lokasi: asia-southeast1).</li>
              <li>Aktifkan <strong>Authentication</strong> {'>'} <strong>Email / Password</strong> {'>'} Enable.</li>
              <li>Project Settings {'>'} General {'>'} Web App {'>'} Dapatkan Firebase Config.</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-orbitron font-bold text-base text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Firestore Security Rules
              </h3>
              <button onClick={() => handleCopy(firestoreRulesSnippet, setCopiedRules)} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors">
                {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRules ? 'Copied!' : 'Copy Rules'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">{firestoreRulesSnippet}</pre>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-orbitron font-bold text-base text-amber-400 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-400" /> Environment Variables (.env.local)
              </h3>
              <button onClick={() => handleCopy(envSnippet, setCopiedEnv)} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors">
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEnv ? 'Copied!' : 'Copy .env.local'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-orange-300 overflow-x-auto">{envSnippet}</pre>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="font-orbitron font-bold text-base text-amber-400 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> Deploy ke Vercel (Gratis)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>Upload ke GitHub repository.</li>
              <li>Import di <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold inline-flex items-center gap-1">Vercel.com <ExternalLink className="w-3 h-3" /></a>.</li>
              <li>Masukkan Environment Variables Firebase.</li>
              <li>Deploy!</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-orbitron font-bold text-xs text-white uppercase tracking-wider hover:opacity-90 transition-opacity">Tutup</button>
        </div>
      </div>
    </div>
  );
};
