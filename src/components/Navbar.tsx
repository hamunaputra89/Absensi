import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  FileSpreadsheet,
  Users,
  Clock,
  Sparkles,
  BarChart3,
  CalendarCheck2
} from 'lucide-react';
import { GoogleSheetConfig } from '../types/attendance';

interface NavbarProps {
  activeTab: 'presensi' | 'laporan';
  onTabChange: (tab: 'presensi' | 'laporan') => void;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSyncModal: () => void;
  onOpenEmployeeModal: () => void;
  employeeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  sheetConfig,
  onOpenSyncModal,
  onOpenEmployeeModal,
  employeeCount
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Fingerprint className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  AbsensiKu
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Real-time
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">
                Presensi Kamera & Biometrik Karyawan
              </p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => onTabChange('presensi')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'presensi'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Presensi</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('laporan')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'laporan'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Laporan Manajerial</span>
            </button>
          </div>

          {/* Actions & Live Clock */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Live Clock */}
            <div className="hidden lg:flex flex-col items-end pr-2 text-right">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentTime || 'Loading...'}</span>
              </div>
              <span className="text-[10px] text-slate-400">{currentDate}</span>
            </div>

            {/* Employee Management Button */}
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
              title="Kelola Karyawan"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Karyawan ({employeeCount})</span>
            </button>

            {/* Google Sheets Sync Status Button */}
            <button
              type="button"
              onClick={onOpenSyncModal}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                sheetConfig
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">
                {sheetConfig ? 'Sheets Terhubung' : 'Google Sheets'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetConfig ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
