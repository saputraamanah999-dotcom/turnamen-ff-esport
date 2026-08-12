import React, { useState, useRef } from 'react';
import { Video, Square, Download, AlertCircle } from 'lucide-react';

export const ScreenRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    setErrorMsg(null);
    setRecordedBlobUrl(null);
    recordedChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Browser Anda tidak mendukung Perekaman Layar (getDisplayMedia API).');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: true
      });

      const options = { mimeType: 'video/webm;codecs=vp9' };
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(timerRef.current);
        setIsRecording(false);

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedBlobUrl(url);
        }

        // Stop all tracks in the display stream
        stream.getTracks().forEach((track) => track.stop());
      };

      // Handle user stopping screen share via browser bar
      stream.getVideoTracks()[0].onended = () => {
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.start(1000); // collect 1s chunks
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Screen Record Error:', err);
      if (err.name !== 'NotAllowedError') {
        setErrorMsg(err.message || 'Gagal memulai perekaman layar.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {errorMsg && (
        <span className="text-[11px] text-red-400 font-rajdhani font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
        </span>
      )}

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all"
          title="Rekam Layar TV Broadcast Tournament"
        >
          <Video className="w-4 h-4 animate-pulse text-white" /> Rekam Layar
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-red-950/90 border border-red-500/50 px-3 py-1.5 rounded-xl animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-orbitron font-bold text-red-300">
            REC {formatTime(recordingTime)}
          </span>
          <button
            onClick={stopRecording}
            className="ml-2 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold text-[10px] uppercase flex items-center gap-1"
          >
            <Square className="w-3 h-3 fill-white" /> Stop
          </button>
        </div>
      )}

      {recordedBlobUrl && (
        <a
          href={recordedBlobUrl}
          download={`FreeFire_Tournament_Recording_${new Date().toISOString().slice(0, 10)}.webm`}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" /> Download WebM
        </a>
      )}
    </div>
  );
};
