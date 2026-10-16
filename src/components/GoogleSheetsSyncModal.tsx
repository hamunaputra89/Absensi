import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Link as LinkIcon,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  FileCheck2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSheetConfig, AttendanceRecord } from '../types/attendance';
import {
  createAttendanceSpreadsheet,
  getSpreadsheetDetails,
  batchSyncAttendancesToSheet
} from '../services/googleSheets';
import { googleSignIn, logoutGoogle } from '../services/firebaseAuth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  sheetConfig: GoogleSheetConfig | null;
  onSaveSheetConfig: (config: GoogleSheetConfig | null) => void;
  attendanceHistory: AttendanceRecord[];
  onAttendanceSynced: (syncedIds: string[]) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessToken,
  onAuthSuccess,
  onLogout,
  sheetConfig,
  onSaveSheetConfig,
  attendanceHistory,
  onAttendanceSynced
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [existingSheetUrl, setExistingSheetUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('create');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const unsyncedRecords = attendanceHistory.filter((r) => !r.syncedToGoogleSheets);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Berhasil terhubung dengan Google (${result.user.email})`
        });
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal login ke akun Google. Silakan coba lagi.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin keluar dari akun Google? Sinkronisasi otomatis ke Google Sheets akan dijeda.'
    );
    if (!confirmed) return;

    try {
      await logoutGoogle();
      onLogout();
      setStatusMessage({
        type: 'info',
        text: 'Anda telah keluar dari akun Google.'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: 'error',
        text: 'Silakan masuk ke akun Google terlebih dahulu.'
      });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const config = await createAttendanceSpreadsheet(accessToken, customTitle || undefined);
      onSaveSheetConfig(config);
      setStatusMessage({
        type: 'success',
        text: `Spreadsheet "${config.spreadsheetTitle}" berhasil dibuat dan siap menerima data absensi!`
      });

      // Auto-sync any existing unsynced records
      if (unsyncedRecords.length > 0) {
        await handleSyncAllUnsynced(config);
      }
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal membuat Google Spreadsheet baru.'
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleConnectExisting = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: 'error',
        text: 'Silakan masuk ke akun Google terlebih dahulu.'
      });
      return;
    }

    let spreadsheetId = existingSheetUrl.trim();
    // Parse ID from full URL if pasted
    // format: https://docs.google.com/spreadsheets/d/{ID}/edit...
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    }

    if (!spreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'Masukkan URL atau ID Spreadsheet Google yang valid.'
      });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
      const defaultTab = details.sheets[0] || 'Sheet1';

      const config: GoogleSheetConfig = {
        spreadsheetId,
        spreadsheetTitle: details.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        sheetName: defaultTab,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true
      };

      onSaveSheetConfig(config);
      setStatusMessage({
        type: 'success',
        text: `Berhasil terhubung ke spreadsheet "${details.title}" (Tab: ${defaultTab})`
      });
    } catch (err: any) {
      console.error('Connect sheet error:', err);
      setStatusMessage({
        type: 'error',
        text: `Gagal menghubungkan spreadsheet: ${err.message}. Pastikan izin akses diberikan.`
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSyncAllUnsynced = async (targetConfig?: GoogleSheetConfig) => {
    const activeConfig = targetConfig || sheetConfig;
    if (!accessToken || !activeConfig) {
      setStatusMessage({
        type: 'error',
        text: 'Spreadsheet belum terhubung atau token kadaluarsa.'
      });
      return;
    }

    if (unsyncedRecords.length === 0) {
      setStatusMessage({
        type: 'info',
        text: 'Semua data absensi sudah tersinkronisasi ke Google Sheets.'
      });
      return;
    }

    setIsSyncingNow(true);
    setStatusMessage(null);

    try {
      const startRow = attendanceHistory.filter((r) => r.syncedToGoogleSheets).length + 2;
      await batchSyncAttendancesToSheet(
        accessToken,
        activeConfig.spreadsheetId,
        activeConfig.sheetName,
        unsyncedRecords,
        startRow
      );

      const syncedIds = unsyncedRecords.map((r) => r.id);
      onAttendanceSynced(syncedIds);

      onSaveSheetConfig({
        ...activeConfig,
        lastSyncedAt: new Date().toISOString()
      });

      setStatusMessage({
        type: 'success',
        text: `Berhasil menyinkronkan ${syncedIds.length} data absensi ke Google Sheets!`
      });
    } catch (err: any) {
      console.error('Batch sync error:', err);
      setStatusMessage({
        type: 'error',
        text: `Gagal menyinkronkan data: ${err.message}`
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleDisconnectSheet = () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin memutuskan tautan spreadsheet ini? Data presensi yang telah tercatat di Google Sheets tidak akan terhapus.'
    );
    if (!confirmed) return;

    onSaveSheetConfig(null);
    setStatusMessage({
      type: 'info',
      text: 'Tautan Google Sheets telah diputus.'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Sinkronisasi Otomatis Google Sheets
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan real-time untuk laporan manajerial & HR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Section 1: Google Account Connection */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              1. Akun Google Workspace
            </h4>

            {currentUser && accessToken ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-emerald-400/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                      {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {currentUser.displayName || 'Pengguna Google'}
                    </p>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Terhubung & Terverifikasi
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Masuk dengan akun Google Anda untuk mengaktifkan sinkronisasi ke spreadsheet.
                </p>

                {/* Official Material Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.8 7.3l3.7 2.9C6.4 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.5 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.8 6.3C.7 8.5 0 10.2 0 12s.7 3.5 1.8 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.6-2.1-6.5-5.1L1.8 16c1.9 3.8 5.7 7 10.2 7z"
                    />
                  </svg>
                  <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Connected Spreadsheet Status */}
          {sheetConfig ? (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-sm font-semibold text-white">
                      {sheetConfig.spreadsheetTitle}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Tab: <span className="text-slate-200 font-mono font-medium">{sheetConfig.sheetName}</span>
                  </p>
                </div>

                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5 transition"
                >
                  <span>Buka di Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Sync Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-slate-400">Status Data:</span>
                  <p className="text-white font-medium">
                    {attendanceHistory.filter((r) => r.syncedToGoogleSheets).length} Tersinkron •{' '}
                    <span className={unsyncedRecords.length > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                      {unsyncedRecords.length} Tertunda
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Sinkron Terakhir:</span>
                  <p className="text-white font-medium">
                    {sheetConfig.lastSyncedAt
                      ? new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('id-ID') + ' WIB'
                      : 'Belum pernah'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSyncAllUnsynced()}
                  disabled={isSyncingNow || unsyncedRecords.length === 0}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingNow
                      ? 'Menyinkronkan...'
                      : unsyncedRecords.length > 0
                      ? `Sinkronkan ${unsyncedRecords.length} Data Tertunda`
                      : 'Data Sudah Up-to-date'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectSheet}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-slate-700 hover:border-rose-500/30 transition"
                  title="Putuskan Spreadsheet"
                >
                  Lepas Tautan
                </button>
              </div>
            </div>
          ) : (
            /* Section 3: Connect or Create Spreadsheet */
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                2. Pilih atau Buat Google Sheet
              </h4>

              {/* Tabs */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                    activeTab === 'create'
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Buat Spreadsheet Otomatis (Direkomendasikan)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('existing')}
                  className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                    activeTab === 'existing'
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Gunakan Sheet yang Ada
                </button>
              </div>

              {activeTab === 'create' ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Judul Spreadsheet Baru:
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Contoh: Laporan Kehadiran Karyawan (AbsensiKu)"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sistem akan secara otomatis menyusun baris header terstandarisasi (ID Presensi, Waktu, NIP, Nama, Departemen, Metode Biometrik/Kamera, Status, Lokasi GPS).
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isCreatingSheet || !accessToken}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {isCreatingSheet ? 'Membuat Spreadsheet...' : 'Buat & Hubungkan Spreadsheet'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      URL atau ID Google Sheet:
                    </label>
                    <input
                      type="text"
                      value={existingSheetUrl}
                      onChange={(e) => setExistingSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdB.../edit"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pastikan akun Google yang sedang masuk memiliki hak akses edit pada sheet tersebut.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectExisting}
                    disabled={isCreatingSheet || !existingSheetUrl || !accessToken}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>
                      {isCreatingSheet ? 'Memverifikasi...' : 'Hubungkan Spreadsheet Ini'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
