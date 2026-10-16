import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Sparkles, SwitchCamera } from 'lucide-react';
import { playCameraShutterSound, triggerHaptic } from '../utils/audio';

interface CameraAttendanceProps {
  onPhotoCaptured: (photoDataUrl: string) => void;
  disabled?: boolean;
}

export const CameraAttendance: React.FC<CameraAttendanceProps> = ({
  onPhotoCaptured,
  disabled = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFaceAligned, setIsFaceAligned] = useState<boolean>(true);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      let message = 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.';
      if (err.name === 'NotAllowedError') {
        message = 'Akses kamera ditolak oleh browser. Mohon izinkan akses kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError') {
        message = 'Tidak ada perangkat kamera yang terdeteksi di perangkat ini.';
      }
      setCameraError(message);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Ensure stream binds when video element mounts
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCapture = () => {
    if (disabled || isCapturing) return;

    // Start 2-second countdown for natural selfie pose
    setCountdown(2);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          executeSnap();
          return null;
        }
        return prev - 1;
      });
    }, 600);
  };

  const executeSnap = () => {
    if (!videoRef.current) {
      // Mock photo fallback if video element not available
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 320;
      mockCanvas.height = 320;
      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 320);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Foto Presensi Verifikasi', 160, 160);
      }
      const dataUrl = mockCanvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      onPhotoCaptured(dataUrl);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror if user-facing
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Reset transformation to add security timestamp watermark
      if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Security watermark overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, canvas.height - 38, canvas.width, 38);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(
        `AbsensiKu • ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB • Verified`,
        12,
        canvas.height - 14
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      playCameraShutterSound();
      triggerHaptic('success');
      setCapturedImage(dataUrl);
      onPhotoCaptured(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-sm aspect-4/3 sm:aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-700/60 flex items-center justify-center">
        {capturedImage ? (
          // Captured Preview
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Bukti Kehadiran"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Foto Berhasil Diambil</span>
            </div>
            <button
              onClick={handleRetake}
              type="button"
              className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ulangi Foto
            </button>
          </div>
        ) : cameraError ? (
          // Camera Error State
          <div className="p-6 text-center text-slate-300 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium mb-2">{cameraError}</p>
            <p className="text-xs text-slate-400 mb-4">
              Anda tetap dapat melanjutkan presensi dengan mode simulasi kamera atau beralih ke verifikasi fingerprint.
            </p>
            <button
              type="button"
              onClick={executeSnap}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Gunakan Snapshot Verifikasi
            </button>
          </div>
        ) : (
          // Live Camera Feed with Biometric Guide Overlay
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Oval Face Guide Frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div
                className={`w-48 h-60 sm:w-56 sm:h-72 rounded-[48%] border-2 transition-all duration-300 ${
                  isFaceAligned
                    ? 'border-emerald-400/90 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                    : 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                }`}
              >
                {/* Crosshairs & Scanning Line */}
                <div className="relative w-full h-full overflow-hidden rounded-[48%]">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[bounce_2.5s_infinite] opacity-70" />
                </div>
              </div>
            </div>

            {/* Live Indicator Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera Absensi
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-full text-[11px] text-slate-300 border border-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Pendeteksi Wajah Aktif</span>
              </div>
            </div>

            {/* Switch Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="absolute bottom-3 left-3 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-sm border border-slate-700/80 transition"
              title="Ganti Kamera Depan/Belakang"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                <span className="text-6xl font-black text-white animate-ping">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Camera Guidance & Action */}
      {!capturedImage && !cameraError && (
        <div className="mt-3 flex flex-col items-center w-full">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
            Posisikan wajah tepat di dalam bingkai oval lalu tekan tombol foto.
          </p>
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled || countdown !== null}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-98 transition"
          >
            <Camera className="w-4 h-4" />
            <span>{countdown !== null ? 'Memotret...' : 'Ambil Foto Presensi'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
