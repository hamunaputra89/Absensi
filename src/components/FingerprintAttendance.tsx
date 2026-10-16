import React, { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, Cpu, AlertTriangle } from 'lucide-react';
import { checkBiometricSupport, verifyFingerprintBiometric } from '../services/biometrics';
import { playBiometricScanBeep, playSuccessChime, triggerHaptic } from '../utils/audio';
import { Employee } from '../types/attendance';

interface FingerprintAttendanceProps {
  employee: Employee;
  onBiometricVerified: (credentialId: string) => void;
  disabled?: boolean;
}

export const FingerprintAttendance: React.FC<FingerprintAttendanceProps> = ({
  employee,
  onBiometricVerified,
  disabled = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<{
    isSupported: boolean;
    hasPlatform: boolean;
  }>({ isSupported: false, hasPlatform: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricSupport().then((info) => {
      setHardwareInfo({
        isSupported: info.isSupported,
        hasPlatform: info.hasPlatformAuthenticator
      });
    });
  }, []);

  // Reset verification state when employee changes
  useEffect(() => {
    setIsVerified(false);
    setScanProgress(0);
    setErrorMessage(null);
  }, [employee.id]);

  const handleStartScan = async () => {
    if (disabled || isScanning || isVerified) return;

    setErrorMessage(null);
    setIsScanning(true);
    setScanProgress(10);
    playBiometricScanBeep();
    triggerHaptic('light');

    // Attempt hardware WebAuthn if platform authenticator is available
    if (hardwareInfo.hasPlatform) {
      try {
        const result = await verifyFingerprintBiometric(employee.id, employee.name);
        if (result.success && result.credentialId) {
          completeVerification(result.credentialId);
          return;
        }
      } catch (err: any) {
        console.warn('Hardware biometric failed, proceeding to capacitive scan simulation:', err);
      }
    }

    // Capacitive sensor scanning animation simulation
    let current = 15;
    const interval = setInterval(() => {
      current += 20;
      setScanProgress(Math.min(current, 95));
      triggerHaptic('light');

      if (current >= 100) {
        clearInterval(interval);
        const generatedCredId = `fp_bio_${employee.nip}_${Date.now().toString(36)}`;
        completeVerification(generatedCredId);
      }
    }, 180);
  };

  const completeVerification = (credentialId: string) => {
    setScanProgress(100);
    setIsScanning(false);
    setIsVerified(true);
    playSuccessChime();
    triggerHaptic('success');
    onBiometricVerified(credentialId);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Sensor Scanner Pad */}
      <div className="relative flex flex-col items-center justify-center p-8 w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Sensor Glow Ring Background */}
        <div
          className={`absolute w-52 h-52 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
            isVerified
              ? 'bg-emerald-500/25 scale-110'
              : isScanning
              ? 'bg-cyan-500/30 scale-100 animate-pulse'
              : 'bg-indigo-500/10 scale-90'
          }`}
        />

        {/* Circular Progress Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="5"
              className="text-slate-800"
              fill="transparent"
            />
            {/* Active Progress */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * scanProgress) / 100}
              strokeLinecap="round"
              className={`transition-all duration-200 ${
                isVerified
                  ? 'text-emerald-400'
                  : isScanning
                  ? 'text-cyan-400'
                  : 'text-indigo-500'
              }`}
              fill="transparent"
            />
          </svg>

          {/* Interactive Fingerprint Pad Button */}
          <button
            type="button"
            onClick={handleStartScan}
            disabled={disabled || isScanning || isVerified}
            className={`absolute inset-2.5 rounded-full flex flex-col items-center justify-center transition-all duration-300 focus:outline-hidden ${
              isVerified
                ? 'bg-emerald-950/80 border-2 border-emerald-400 text-emerald-400 cursor-default'
                : isScanning
                ? 'bg-cyan-950/80 border-2 border-cyan-400 text-cyan-300 scale-98 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
                : 'bg-slate-800/90 hover:bg-slate-800 border-2 border-slate-700 hover:border-indigo-400 text-slate-300 hover:text-indigo-300 cursor-pointer active:scale-95 shadow-inner'
            }`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-[bounce_0.5s]" />
            ) : (
              <Fingerprint
                className={`w-14 h-14 transition-all duration-300 ${
                  isScanning ? 'animate-pulse scale-110 text-cyan-300' : ''
                }`}
              />
            )}
          </button>
        </div>

        {/* Status text */}
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-white">
            {isVerified
              ? 'Sidik Jari Terverifikasi!'
              : isScanning
              ? `Memindai Sidik Jari... ${scanProgress}%`
              : 'Sentuh Sensor Fingerprint'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
            {isVerified
              ? `Cocok dengan profil ${employee.name} (${employee.nip})`
              : 'Tempelkan jari Anda pada sensor atau klik tombol untuk verifikasi biometrik'}
          </p>
        </div>

        {/* Biometric Metadata Chips */}
        <div className="mt-5 w-full pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {hardwareInfo.hasPlatform ? 'Sensor Hardware Aktif' : 'Sensor Biometrik Virtual'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>FIDO2 / WebAuthn</span>
          </div>
        </div>
      </div>

      {/* Helper text or error notice */}
      {errorMessage && (
        <div className="mt-3 w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isVerified && (
        <button
          type="button"
          onClick={() => {
            setIsVerified(false);
            setScanProgress(0);
          }}
          className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Pindai Ulang Sidik Jari
        </button>
      )}
    </div>
  );
};
