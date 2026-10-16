/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Employee,
  AttendanceRecord,
  GoogleSheetConfig,
  OfficeSettings
} from './types/attendance';
import {
  INITIAL_EMPLOYEES,
  SAMPLE_DEMO_EMPLOYEES,
  DEFAULT_OFFICE_SETTINGS
} from './data/mockEmployees';
import { initAuth, setCachedAccessToken } from './services/firebaseAuth';
import { appendAttendanceToSheet } from './services/googleSheets';
import { Navbar } from './components/Navbar';
import { AttendanceCard } from './components/AttendanceCard';
import { ManagerialReport } from './components/ManagerialReport';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { EmployeeManagerModal } from './components/EmployeeManagerModal';
import {
  FileSpreadsheet,
  Shield,
  Smartphone,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'presensi' | 'laporan'>('presensi');

  // Employee list is empty by default per user request
  const [employees, setEmployees] = useState<Employee[]>(() => {
    // If previously saved in localStorage, load it, otherwise start empty []
    const saved = localStorage.getItem('absensiku_employees');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If the user asked to empty data, clear out legacy initial mock data
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id === 'emp-001') {
          localStorage.removeItem('absensiku_employees');
          return [];
        }
        return parsed;
      } catch {
        return [];
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => {
    return employees.length > 0 ? employees[0] : null;
  });

  const [officeSettings] = useState<OfficeSettings>(DEFAULT_OFFICE_SETTINGS);

  // Attendance history
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('absensiku_attendance');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Google Workspace configuration
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(() => {
    const saved = localStorage.getItem('absensiku_sheet_config');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  // Keep selectedEmployee in sync when employees list changes
  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployee(null);
    } else if (!selectedEmployee || !employees.some((e) => e.id === selectedEmployee.id)) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('absensiku_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('absensiku_attendance', JSON.stringify(attendanceHistory));
  }, [attendanceHistory]);

  useEffect(() => {
    if (sheetConfig) {
      localStorage.setItem('absensiku_sheet_config', JSON.stringify(sheetConfig));
    } else {
      localStorage.removeItem('absensiku_sheet_config');
    }
  }, [sheetConfig]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAccessToken(token);
          setCachedAccessToken(token);
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setCachedAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Record Attendance Handler with Real-time Auto-Sync to Google Sheets
  const handleRecordAttendance = useCallback(
    async (record: AttendanceRecord): Promise<boolean> => {
      let isSynced = false;

      // Check if auto-sync to Google Sheets is available
      if (accessToken && sheetConfig && sheetConfig.autoSync) {
        try {
          const rowNumber = attendanceHistory.length + 2; // +1 for 1-index, +1 for header
          await appendAttendanceToSheet(
            accessToken,
            sheetConfig.spreadsheetId,
            sheetConfig.sheetName,
            record,
            rowNumber
          );
          isSynced = true;
          setSheetConfig((prev) =>
            prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
          );
        } catch (err) {
          console.warn('Real-time sync to Google Sheets failed, queuing locally:', err);
        }
      }

      const updatedRecord: AttendanceRecord = {
        ...record,
        syncedToGoogleSheets: isSynced
      };

      setAttendanceHistory((prev) => [updatedRecord, ...prev]);
      return true;
    },
    [accessToken, sheetConfig, attendanceHistory.length]
  );

  const handleAttendanceSynced = (syncedIds: string[]) => {
    setAttendanceHistory((prev) =>
      prev.map((rec) =>
        syncedIds.includes(rec.id) ? { ...rec, syncedToGoogleSheets: true } : rec
      )
    );
  };

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    setSelectedEmployee(newEmp);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
  };

  const handleClearAllEmployees = () => {
    setEmployees([]);
    setSelectedEmployee(null);
    localStorage.removeItem('absensiku_employees');
  };

  const handleLoadSampleEmployees = () => {
    setEmployees(SAMPLE_DEMO_EMPLOYEES);
    setSelectedEmployee(SAMPLE_DEMO_EMPLOYEES[0]);
  };

  const handleToggleBiometric = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              hasBiometricRegistered: !emp.hasBiometricRegistered,
              biometricCredentialId: !emp.hasBiometricRegistered
                ? `cred-bio-${Date.now()}`
                : undefined
            }
          : emp
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sheetConfig={sheetConfig}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        employeeCount={employees.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Banner notification if Google Sheets is not yet connected */}
        {!sheetConfig && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Sinkronisasi Otomatis Google Sheets Siap Dihubungkan</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                    Otomatis
                  </span>
                </p>
                <p className="text-xs text-slate-300">
                  Hubungkan akun Google Anda agar setiap presensi karyawan langsung masuk ke spreadsheet manajerial secara real-time.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition whitespace-nowrap cursor-pointer"
            >
              <span>Hubungkan Sekarang</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Presensi Online */}
        {activeTab === 'presensi' && (
          <div className="space-y-6">
            <AttendanceCard
              employees={employees}
              selectedEmployee={selectedEmployee}
              onSelectEmployee={setSelectedEmployee}
              officeSettings={officeSettings}
              sheetConfig={sheetConfig}
              onRecordAttendance={handleRecordAttendance}
              onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
            />

            {/* Quick feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Dual Mode Kamera & Fingerprint</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mendukung verifikasi selfie kamera depan dengan timestamp watermark atau sensor sidik jari FIDO2 / WebAuthn.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tersinkron ke Google Sheets</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Data kehadiran tercatat otomatis baris demi baris di Google Sheets tanpa perlu rekap manual oleh HR.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Akurat & Anti-Fraud</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dilengkapi validasi GPS Geotagging, deteksi keterlambatan otomatis, dan status verifikasi biometrik.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Laporan Manajerial */}
        {activeTab === 'laporan' && (
          <ManagerialReport
            records={attendanceHistory}
            employees={employees}
            sheetConfig={sheetConfig}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>AbsensiKu • Sistem Presensi Biometrik & Kamera Real-time Terintegrasi Google Workspace</p>
      </footer>

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentUser={currentUser}
        accessToken={accessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
          setCachedAccessToken(token);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setAccessToken(null);
          setCachedAccessToken(null);
        }}
        sheetConfig={sheetConfig}
        onSaveSheetConfig={setSheetConfig}
        attendanceHistory={attendanceHistory}
        onAttendanceSynced={handleAttendanceSynced}
      />

      {/* Employee Manager Modal */}
      <EmployeeManagerModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onAddEmployee={handleAddEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onClearAllEmployees={handleClearAllEmployees}
        onLoadSampleEmployees={handleLoadSampleEmployees}
        onToggleBiometric={handleToggleBiometric}
      />
    </div>
  );
}
