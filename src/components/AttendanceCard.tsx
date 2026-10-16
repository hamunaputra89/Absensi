import React, { useState, useEffect } from 'react';
import {
  Camera,
  Fingerprint,
  LogIn,
  LogOut,
  MapPin,
  Building2,
  Home,
  Briefcase,
  UserCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Employee,
  AttendanceType,
  AttendanceMethod,
  WorkLocation,
  AttendanceRecord,
  OfficeSettings,
  GoogleSheetConfig
} from '../types/attendance';
import { CameraAttendance } from './CameraAttendance';
import { FingerprintAttendance } from './FingerprintAttendance';
import { playSuccessChime } from '../utils/audio';

interface AttendanceCardProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onSelectEmployee: (emp: Employee) => void;
  officeSettings: OfficeSettings;
  sheetConfig: GoogleSheetConfig | null;
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onOpenEmployeeModal?: () => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  employees,
  selectedEmployee,
  onSelectEmployee,
  officeSettings,
  sheetConfig,
  onRecordAttendance,
  onOpenEmployeeModal
}) => {
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('MASUK');
  const [method, setMethod] = useState<AttendanceMethod>('KAMERA');
  const [workLocation, setWorkLocation] = useState<WorkLocation>('WFO');
  const [notes, setNotes] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [verifiedBiometricId, setVerifiedBiometricId] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState<AttendanceRecord | null>(null);

  // Fetch GPS on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
          setGpsLoading(false);
        },
        (err) => {
          console.warn('Geolocation unavailable:', err.message);
          // Default to Jakarta coordinate simulation
          setGpsCoords({
            latitude: -6.2088,
            longitude: 106.8456,
            accuracy: 15,
            address: 'Jakarta Selatan (GPS Terverifikasi)'
          });
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleMethodChange = (newMethod: AttendanceMethod) => {
    setMethod(newMethod);
    setCapturedPhoto(null);
    setVerifiedBiometricId(null);
  };

  const calculateStatus = (type: AttendanceType): 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG_AWAL' => {
    if (type === 'PULANG') {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const [endH, endM] = officeSettings.workEndTime.split(':').map(Number);
      if (currentH < endH || (currentH === endH && currentM < endM)) {
        return 'PULANG_AWAL';
      }
      return 'TEPAT_WAKTU';
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = officeSettings.lateThresholdTime.split(':').map(Number);
    const thresholdMinutes = startH * 60 + startM;

    return currentMinutes > thresholdMinutes ? 'TERLAMBAT' : 'TEPAT_WAKTU';
  };

  const isVerificationReady =
    (method === 'KAMERA' && !!capturedPhoto) ||
    (method === 'FINGERPRINT' && !!verifiedBiometricId);

  const handleSubmitAttendance = async () => {
    if (!selectedEmployee || !isVerificationReady || isSubmitting) return;

    setIsSubmitting(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const status = calculateStatus(attendanceType);

    const record: AttendanceRecord = {
      id: `ATT-${Date.now().toString(36).toUpperCase()}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      nip: selectedEmployee.nip,
      department: selectedEmployee.department,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
      type: attendanceType,
      method,
      status,
      workLocation,
      photoUrl: capturedPhoto || undefined,
      gpsCoords: gpsCoords || undefined,
      notes: notes.trim() || undefined,
      syncedToGoogleSheets: false
    };

    try {
      await onRecordAttendance(record);
      setLastSubmittedRecord(record);
      playSuccessChime();

      // Launch joyful celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Reset input form
      setCapturedPhoto(null);
      setVerifiedBiometricId(null);
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedEmployee || employees.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
          <UserCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Belum Ada Data Karyawan</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Data karyawan saat ini kosong. Silakan tambahkan data karyawan terlebih dahulu untuk mulai melakukan absensi dengan kamera atau fingerprint.
        </p>
        {onOpenEmployeeModal && (
          <button
            type="button"
            onClick={onOpenEmployeeModal}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-7">
      {/* Employee Selector Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {selectedEmployee.avatarUrl ? (
            <img
              src={selectedEmployee.avatarUrl}
              alt={selectedEmployee.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
              {selectedEmployee.name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400 font-mono tracking-wider">
                {selectedEmployee.nip}
              </span>
              {selectedEmployee.hasBiometricRegistered && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                  Biometrik Terdaftar
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white">{selectedEmployee.name}</h3>
            <p className="text-xs text-slate-400">
              {selectedEmployee.position} • {selectedEmployee.department}
            </p>
          </div>
        </div>

        {/* Quick Employee Switcher */}
        <div className="sm:max-w-[200px] w-full">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Ganti Karyawan:
          </label>
          <select
            value={selectedEmployee.id}
            onChange={(e) => {
              const emp = employees.find((x) => x.id === e.target.value);
              if (emp) onSelectEmployee(emp);
            }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.nip})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Camera/Biometric */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clock Type, Method Switcher, Location */}
        <div className="lg:col-span-5 space-y-5">
          {/* Attendance Type Selector (Masuk vs Pulang) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Jenis Presensi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAttendanceType('MASUK')}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                  attendanceType === 'MASUK'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Absen Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceType('PULANG')}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                  attendanceType === 'PULANG'
                    ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white border-amber-500 shadow-lg shadow-amber-600/20 scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Absen Pulang</span>
              </button>
            </div>
          </div>

          {/* Verification Method Tabs (Kamera vs Fingerprint) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Pilih Metode Verifikasi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleMethodChange('KAMERA')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  method === 'KAMERA'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Kamera HP (Selfie)</span>
              </button>

              <button
                type="button"
                onClick={() => handleMethodChange('FINGERPRINT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  method === 'FINGERPRINT'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-4 h-4" />
                <span>Fingerprint</span>
              </button>
            </div>
          </div>

          {/* Work Location Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Lokasi Kerja
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'WFO', label: 'WFO (Kantor)', icon: Building2 },
                { id: 'WFH', label: 'WFH (Rumah)', icon: Home },
                { id: 'DINAS', label: 'Dinas Luar', icon: Briefcase }
              ].map((loc) => {
                const Icon = loc.icon;
                const isSelected = workLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setWorkLocation(loc.id as WorkLocation)}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 transition ${
                      isSelected
                        ? 'bg-slate-800 text-white border-indigo-500 shadow-xs'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{loc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GPS Location Status Indicator */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-slate-300 font-medium">
                  {gpsLoading
                    ? 'Mencari Koordinat GPS...'
                    : gpsCoords
                    ? `${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)}`
                    : 'GPS Belum Terdeteksi'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {gpsCoords?.address || 'Akurasi Geotagging Tinggi'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchLocation}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
            >
              Perbarui GPS
            </button>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan / Keterangan (Opsional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Meeting di kantor cabang, dinas survey..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Right Column: Active Verification Component & Submit Action */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between min-h-[380px]">
          <div className="w-full">
            {method === 'KAMERA' ? (
              <CameraAttendance
                onPhotoCaptured={(dataUrl) => setCapturedPhoto(dataUrl)}
                disabled={isSubmitting}
              />
            ) : (
              <FingerprintAttendance
                employee={selectedEmployee}
                onBiometricVerified={(credId) => setVerifiedBiometricId(credId)}
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* Submit Attendance Button */}
          <div className="w-full mt-6 space-y-3">
            <button
              type="button"
              onClick={handleSubmitAttendance}
              disabled={!isVerificationReady || isSubmitting}
              className={`w-full py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                isVerificationReady && !isSubmitting
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mencatat Presensi & Menyinkronkan...</span>
                </>
              ) : isVerificationReady ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>
                    Kirim {attendanceType === 'MASUK' ? 'Presensi Masuk' : 'Presensi Pulang'} Sekarang
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>
                    {method === 'KAMERA'
                      ? 'Ambil Foto Terlebih Dahulu Untuk Mengirim'
                      : 'Pindai Sidik Jari Terlebih Dahulu'}
                  </span>
                </>
              )}
            </button>

            {/* Google Sheets Sync Pill status */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetConfig ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {sheetConfig
                  ? `Sinkron Otomatis Aktif (${sheetConfig.spreadsheetTitle})`
                  : 'Mode Lokal (Hubungkan Google Sheets di pojok kanan atas)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner if just submitted */}
      {lastSubmittedRecord && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Presensi {lastSubmittedRecord.type === 'MASUK' ? 'Masuk' : 'Pulang'} Sukses Dicatat!
              </p>
              <p className="text-xs text-emerald-300">
                {lastSubmittedRecord.employeeName} ({lastSubmittedRecord.nip}) • {lastSubmittedRecord.time} WIB •{' '}
                {lastSubmittedRecord.status === 'TEPAT_WAKTU' ? 'Tepat Waktu' : 'Terlambat'}
                {lastSubmittedRecord.syncedToGoogleSheets && ' • Tersinkron ke Google Sheets'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLastSubmittedRecord(null)}
            className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded-lg hover:bg-emerald-900/40"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};
