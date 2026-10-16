import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Download,
  ExternalLink,
  Search,
  Filter,
  Camera,
  Fingerprint,
  MapPin,
  Building,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord, Employee, GoogleSheetConfig } from '../types/attendance';

interface ManagerialReportProps {
  records: AttendanceRecord[];
  employees: Employee[];
  sheetConfig: GoogleSheetConfig | null;
  onOpenSyncModal: () => void;
}

export const ManagerialReport: React.FC<ManagerialReportProps> = ({
  records,
  employees,
  sheetConfig,
  onOpenSyncModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Daily unique attended employees
  const todayRecords = records.filter((r) => r.date === todayStr);
  const presentEmployeeIds = new Set(todayRecords.map((r) => r.employeeId));
  const totalEmployeesCount = employees.length;
  const presentCount = presentEmployeeIds.size;
  const absentCount = Math.max(0, totalEmployeesCount - presentCount);

  const onTimeCount = todayRecords.filter((r) => r.status === 'TEPAT_WAKTU' && r.type === 'MASUK').length;
  const lateCount = todayRecords.filter((r) => r.status === 'TERLAMBAT' && r.type === 'MASUK').length;
  const attendanceRate = totalEmployeesCount > 0 ? Math.round((presentCount / totalEmployeesCount) * 100) : 0;

  // Filtered records for the log table
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.nip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || record.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || record.status === selectedStatus;
    const matchesMethod = selectedMethod === 'ALL' || record.method === selectedMethod;
    return matchesSearch && matchesDept && matchesStatus && matchesMethod;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Presensi',
      'Tanggal',
      'Waktu',
      'NIP',
      'Nama Karyawan',
      'Departemen',
      'Tipe',
      'Metode',
      'Status',
      'Lokasi',
      'GPS',
      'Catatan'
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.nip}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.type}"`,
      `"${r.method}"`,
      `"${r.status}"`,
      `"${r.workLocation}"`,
      `"${r.gpsCoords ? `${r.gpsCoords.latitude},${r.gpsCoords.longitude}` : '-'}"`,
      `"${r.notes || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Absensi_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Sync Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Dashboard & Laporan Manajerial Kehadiran</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ringkasan data presensi real-time, statistik keterlambatan, dan sinkronisasi laporan otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {sheetConfig ? (
            <a
              href={sheetConfig.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Hubungkan ke Google Sheets</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Hadir */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Hadir Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{presentCount}</span>
            <span className="text-xs text-slate-400">dari {totalEmployeesCount} karyawan</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium">
            {attendanceRate}% Tingkat Kehadiran
          </div>
        </div>

        {/* Tepat Waktu */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tepat Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{onTimeCount}</span>
            <span className="text-xs text-slate-400">orang</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium">
            Memenuhi SOP jam masuk
          </div>
        </div>

        {/* Terlambat */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{lateCount}</span>
            <span className="text-xs text-slate-400">orang</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 font-medium">
            {lateCount > 0 ? 'Perlu evaluasi manajerial' : 'Nihil keterlambatan'}
          </div>
        </div>

        {/* Belum Absen */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Belum Presensi</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{absentCount}</span>
            <span className="text-xs text-slate-400">orang</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {absentCount > 0 ? 'Menunggu absensi' : 'Semua hadir'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama karyawan atau NIP..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Departemen</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="TEPAT_WAKTU">Tepat Waktu</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="PULANG_AWAL">Pulang Awal</option>
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Metode</option>
            <option value="KAMERA">Kamera HP</option>
            <option value="FINGERPRINT">Fingerprint</option>
          </select>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Log Riwayat Kehadiran Real-time</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan {filteredRecords.length} catatan kehadiran tersimpan
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
            Live Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Waktu & Tanggal</th>
                <th className="py-3.5 px-4">Karyawan</th>
                <th className="py-3.5 px-4">Tipe</th>
                <th className="py-3.5 px-4">Metode Verifikasi</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Lokasi & GPS</th>
                <th className="py-3.5 px-4">Sinkron Sheets</th>
                <th className="py-3.5 px-4 text-center">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Belum ada catatan presensi</p>
                    <p className="text-xs mt-1">Lakukan absensi menggunakan kamera atau fingerprint di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-white">{record.time} WIB</p>
                      <p className="text-[11px] text-slate-400">{record.date}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-200">{record.employeeName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{record.nip} • {record.department}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          record.type === 'MASUK'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {record.type === 'MASUK' ? 'Masuk' : 'Pulang'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {record.method === 'KAMERA' ? (
                          <>
                            <Camera className="w-3.5 h-3.5 text-blue-400" />
                            <span>Kamera HP</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                            <span>Fingerprint</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1 ${
                          record.status === 'TEPAT_WAKTU'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : record.status === 'TERLAMBAT'
                            ? 'bg-rose-500/10 text-rose-400 font-semibold'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {record.status === 'TEPAT_WAKTU'
                          ? 'Tepat Waktu'
                          : record.status === 'TERLAMBAT'
                          ? 'Terlambat'
                          : 'Pulang Awal'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-200">{record.workLocation}</p>
                          {record.gpsCoords && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {record.gpsCoords.latitude.toFixed(3)}, {record.gpsCoords.longitude.toFixed(3)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {record.syncedToGoogleSheets ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tersinkron</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Tertunda</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      {record.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setInspectPhotoUrl(record.photoUrl!)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition inline-flex items-center gap-1"
                          title="Lihat Foto Bukti"
                        >
                          <Eye className="w-4 h-4 text-indigo-400" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
                          Biometrik FIDO
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Inspection Lightbox Modal */}
      {inspectPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setInspectPhotoUrl(null)}
        >
          <div
            className="relative max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white">Bukti Foto Selfie Kehadiran</span>
              <button
                type="button"
                onClick={() => setInspectPhotoUrl(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                Tutup
              </button>
            </div>
            <img
              src={inspectPhotoUrl}
              alt="Bukti Kehadiran"
              className="w-full rounded-2xl object-cover shadow"
            />
          </div>
        </div>
      )}
    </div>
  );
};
