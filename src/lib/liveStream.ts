import {
  doc, collection, setDoc, deleteDoc, onSnapshot,
  updateDoc, getDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// ====== ICE SERVERS (Google STUN, gratis) ======
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// Path helpers
const configPath = () => doc(db, 'livestream', 'config');
const viewersPath = () => collection(db, 'livestream', 'config', 'viewers');
const viewerPath = (vid: string) => doc(db, 'livestream', 'config', 'viewers', vid);
const offerPath = (vid: string) => doc(db, 'livestream', 'config', 'viewers', vid, 'offer', 'sdp');
const answerPath = (vid: string) => doc(db, 'livestream', 'config', 'viewers', vid, 'answer', 'sdp');
const iceAdminPath = (vid: string) => collection(db, 'livestream', 'config', 'viewers', vid, 'ice-from-admin');
const iceViewerPath = (vid: string) => collection(db, 'livestream', 'config', 'viewers', vid, 'ice-from-viewer');

// ==================== BROADCASTER (ADMIN) ====================

export class Broadcaster {
  private stream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private cleanups: (() => void)[] = [];
  private _isActive = false;
  private onViewerCountChange?: (count: number) => void;
  private processedViewers = new Set<string>();

  get isActive() { return this._isActive; }
  get viewerCount() { return this.peers.size; }

  constructor(onViewerCountChange?: (count: number) => void) {
    this.onViewerCountChange = onViewerCountChange;
  }

  async start(mediaStream: MediaStream): Promise<void> {
    this.stream = mediaStream;
    this._isActive = true;
    this.processedViewers.clear();

    // Set live status
    await setDoc(configPath(), {
      active: true,
      startedAt: new Date().toISOString(),
      viewerCount: 0
    });

    // Clean up any stale viewer docs from previous sessions
    try {
      const oldViewers = await getDocs(viewersPath());
      const batch = writeBatch(db);
      oldViewers.forEach(d => batch.delete(d.ref));
      if (!oldViewers.empty) await batch.commit();
    } catch (e) {
      console.warn('[Broadcaster] Could not clean old viewers:', e);
    }

    // Listen for new viewers
    const unsubViewers = onSnapshot(viewersPath(), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !this.processedViewers.has(change.doc.id)) {
          this.processedViewers.add(change.doc.id);
          // Delay slightly to avoid race with viewer's own listener setup
          setTimeout(() => this.connectToViewer(change.doc.id), 300);
        } else if (change.type === 'removed') {
          this.processedViewers.delete(change.doc.id);
          this.disconnectViewer(change.doc.id);
        }
      });
    });
    this.cleanups.push(unsubViewers);

    console.log('[Broadcaster] Started, waiting for viewers...');
  }

  private async connectToViewer(viewerId: string): Promise<void> {
    if (this.peers.has(viewerId) || !this.stream || !this._isActive) return;

    console.log('[Broadcaster] Connecting to viewer:', viewerId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(viewerId, pc);
    this.notifyViewerCount();

    // Add all tracks from admin's stream
    this.stream.getTracks().forEach((track) => {
      pc.addTrack(track, this.stream!);
    });

    // Limit video bitrate to ~2 Mbps per viewer
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'video') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 2_000_000;
          params.encodings[0].maxFramerate = 30;
          sender.setParameters(params);
        } catch (e) { /* ignore */ }
      }
    });

    // Listen for viewer's ICE candidates
    const processedIce = new Set<string>();
    const unsubIceViewer = onSnapshot(iceViewerPath(viewerId), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !processedIce.has(change.doc.id)) {
          processedIce.add(change.doc.id);
          const data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
          deleteDoc(change.doc.ref).catch(() => {});
        }
      });
    });
    this.cleanups.push(unsubIceViewer);

    // Listen for viewer's answer
    const unsubAnswer = onSnapshot(answerPath(viewerId), async (docSnap) => {
      if (docSnap.exists() && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(docSnap.data() as RTCSessionDescriptionInit));
          console.log('[Broadcaster] Answer received for:', viewerId);
        } catch (e) {
          console.error('[Broadcaster] Error setting answer:', e);
        }
      }
    });
    this.cleanups.push(unsubAnswer);

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(offerPath(viewerId), {
        type: offer.type,
        sdp: offer.sdp
      });
      console.log('[Broadcaster] Offer sent to:', viewerId);
    } catch (e) {
      console.error('[Broadcaster] Error creating offer:', e);
      this.disconnectViewer(viewerId);
      return;
    }

    // Send ICE candidates to viewer
    pc.onicecandidate = (event) => {
      if (event.candidate && this._isActive) {
        const data = event.candidate.toJSON();
        setDoc(doc(iceAdminPath(viewerId)), data).catch(() => {});
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
 const state = pc.connectionState;
      console.log('[Broadcaster] Connection with', viewerId, ':', state);
      if (state === 'connected') {
        console.log('[Broadcaster] Viewer', viewerId, 'is now watching!');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.disconnectViewer(viewerId);
      }
    };
  }

  private disconnectViewer(viewerId: string): void {
    if (!this.peers.has(viewerId)) return;
    const pc = this.peers.get(viewerId)!;
    try { pc.close(); } catch (e) { /* ignore */ }
    this.peers.delete(viewerId);
    this.notifyViewerCount();
    console.log('[Broadcaster] Viewer disconnected:', viewerId);
  }

  private notifyViewerCount() {
 if (this.onViewerCountChange) {
      this.onViewerCountChange(this.peers.size);
    }
  }

  async stop(): Promise<void> {
    this._isActive = false;

    // Close all peer connections
    this.peers.forEach((pc) => { try { pc.close(); } catch (e) { /* ignore */ } });
    this.peers.clear();
    this.processedViewers.clear();

    // Clean up listeners
    this.cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    this.cleanups = [];

    // Update live status
    try {
      await setDoc(configPath(), { active: false, startedAt: null, viewerCount: 0 });
    } catch (e) { /* ignore */ }

    // Clean up all viewer docs
    try {
      const viewersSnap = await getDocs(viewersPath());
      const batch = writeBatch(db);
      viewersSnap.forEach(d => batch.delete(d.ref));
      if (!viewersSnap.empty) await batch.commit();
    } catch (e) { /* ignore */ }

    this.stream = null;
    this.notifyViewerCount();
    console.log('[Broadcaster] Stopped');
  }
}

// ==================== VIEWER (PENONTON) ====================

export type ViewerStatus = 'idle' | 'checking' | 'connecting' | 'waiting' | 'connected' | 'ended' | 'error';

export class Viewer {
  private pc: RTCPeerConnection | null = null;
  private viewerId: string;
  private cleanups: (() => void)[] = [];
  private _isConnected = false;
  private onStreamCallback: (stream: MediaStream) => void;
  private onStatusCallback: (status: ViewerStatus, message?: string) => void;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  get isConnected() { return this._isConnected; }
  get id() { return this.viewerId; }

  constructor(
    onStream: (stream: MediaStream) => void,
    onStatus: (status: ViewerStatus, message?: string) => void
  ) {
    this.viewerId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    this.onStreamCallback = onStream;
    this.onStatusCallback = onStatus;
  }

  async connect(): Promise<void> {
    this.onStatusCallback('checking', 'Mengecek status live...');

    // Check if admin is live
    try {
      const statusDoc = await getDoc(configPath());
      if (!statusDoc.exists() || !statusDoc.data()?.active) {
        this.onStatusCallback('ended', 'Stream belum dimulai. Tunggu admin mulai live.');
        // Keep listening for when admin goes live
        this.watchForLiveStart();
        return;
      }
    } catch (e) {
      this.onStatusCallback('error', 'Gagal cek status. Coba refresh.');
      return;
    }

    await this.establishConnection();
  }

  private watchForLiveStart(): void {
    const unsub = onSnapshot(configPath(), async (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.active) {
        this.onStatusCallback('connecting', 'Admin mulai live! Menghubungkan...');
        unsub(); // Stop listening
        await this.establishConnection();
      }
    });
    this.cleanups.push(unsub);
  }

  private async establishConnection(): Promise<void> {
    // Register as viewer
    try {
      await setDoc(viewerPath(this.viewerId), {
        connectedAt: new Date().toISOString()
      });
    } catch (e) {
      this.onStatusCallback('error', 'Gagal mendaftar sebagai penonton.');
      return;
    }

    // Heartbeat every 5s
    this.heartbeatInterval = setInterval(() => {
      updateDoc(viewerPath(this.viewerId), {
        lastHeartbeat: new Date().toISOString()
      }).catch(() => {});
    }, 5000);

    // Create peer connection
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle incoming remote stream
    this.pc.ontrack = (event) => {
      console.log('[Viewer] Received remote track:', event.track.kind);
      if (event.streams[0]) {
        this._isConnected = true;
        this.onStreamCallback(event.streams[0]);
        this.onStatusCallback('connected', 'Sedang menonton live!');
      }
    };

    this.pc.onconnectionstatechange = () => {
 const state = this.pc?.connectionState || 'unknown';
      console.log('[Viewer] Connection state:', state);
      if (state === 'connected') {
        this._isConnected = true;
        this.onStatusCallback('connected', 'Sedang menonton live!');
      } else if (state === 'disconnected') {
        this._isConnected = false;
        this.onStatusCallback('connecting', 'Koneksi terputus, mencoba reconnect...');
      } else if (state === 'failed') {
        this._isConnected = false;
        this.onStatusCallback('error', 'Koneksi gagal. Coba refresh halaman.');
      } else if (state === 'closed') {
        this._isConnected = false;
        this.onStatusCallback('ended', 'Stream ditutup.');
      }
    };

    // Listen for admin's offer
    const unsubOffer = onSnapshot(offerPath(this.viewerId), async (docSnap) => {
      if (docSnap.exists() && this.pc) {
        const signalingState = this.pc.signalingState;
        if (signalingState === 'stable' || signalingState === 'have-local-pranswer') {
          this.onStatusCallback('connecting', 'Menerima sinyal dari admin...');
          try {
            const offer = docSnap.data() as RTCSessionDescriptionInit;
            await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await setDoc(answerPath(this.viewerId), {
              type: answer.type,
              sdp: answer.sdp
            });
            this.onStatusCallback('waiting', 'Menunggu koneksi video...');
          } catch (e) {
            console.error('[Viewer] Error processing offer:', e);
            this.onStatusCallback('error', 'Gagal memproses sinyal.');
          }
        }
      }
    });
    this.cleanups.push(unsubOffer);

    // Listen for admin's ICE candidates
    const processedIce = new Set<string>();
    const unsubIceAdmin = onSnapshot(iceAdminPath(this.viewerId), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !processedIce.has(change.doc.id) && this.pc) {
          processedIce.add(change.doc.id);
          const data = change.doc.data();
          this.pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
          deleteDoc(change.doc.ref).catch(() => {});
        }
      });
    });
    this.cleanups.push(unsubIceAdmin);

    // Send our ICE candidates to admin
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const data = event.candidate.toJSON();
        setDoc(doc(iceViewerPath(this.viewerId)), data).catch(() => {});
      }
    };

    // Listen for live status changes (admin stops)
    const unsubStatus = onSnapshot(configPath(), (docSnap) => {
      if (!docSnap.exists() || !docSnap.data()?.active) {
        this._isConnected = false;
        this.onStatusCallback('ended', 'Stream dihentikan admin.');
      }
    });
    this.cleanups.push(unsubStatus);

    this.onStatusCallback('connecting', 'Terdaftar. Menunggu admin...');
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch (e) { /* ignore */ }
      this.pc = null;
    }
    this._isConnected = false;
    this.cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    this.cleanups = [];

    // Remove viewer registration (fire-and-forget)
    deleteDoc(viewerPath(this.viewerId)).catch(() => {});
    console.log('[Viewer] Disconnected:', this.viewerId);
  }
}

// ==================== UTILITY: Check if live ====================

export function subscribeLiveStatus(callback: (isLive: boolean) => void): () => void {
  return onSnapshot(configPath(), (docSnap) => {
    const isLive = docSnap.exists() && docSnap.data()?.active === true;
    callback(isLive);
  }, (err) => {
    console.error('[LiveStatus] Error:', err);
    callback(false);
  });
}
