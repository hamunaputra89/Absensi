import React, { useState } from 'react';
import { UserPlus, Fingerprint, Trash2, X, AlertCircle, RotateCcw } from 'lucide-react';
import { Employee } from '../types/attendance';

interface EmployeeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onClearAllEmployees: () => void;
  onLoadSampleEmployees: () => void;
  onToggleBiometric: (employeeId: string) => void;
}

export const EmployeeManagerModal: React.FC<EmployeeManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onAddEmployee,
  onDeleteEmployee,
  onClearAllEmployees,
  onLoadSampleEmployees,
  onToggleBiometric
}) => {
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [department, setDepartment] = useState('Engineering & IT');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nip.trim()) {
      setErrorMsg('Nama dan NIP wajib diisi');
      return;
    }

    if (employees.some((emp) => emp.nip.toLowerCase() === nip.trim().toLowerCase())) {
      setErrorMsg('NIP ini sudah terdaftar');
      return;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now().toString(36)}`,
      nip: nip.trim(),
      name: name.trim(),
      email: email.trim() || `${nip.toLowerCase()}@perusahaan.co.id`,
      department,
      position: position.trim() || 'Staff Karyawan',
      hasBiometricRegistered: true,
      biometricCredentialId: `cred-bio-${Date.now()}`
    };

    onAddEmployee(newEmp);
    setName('');
    setNip('');
    setPosition('');
    setEmail('');
    setErrorMsg('');
  };

  const handleConfirmClearAll = () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin mengosongkan seluruh data karyawan? Tindakan ini akan menghapus daftar karyawan dari sistem.'
    );
    if (confirmed) {
      onClearAllEmployees();
    }
  };

  const handleConfirmDelete = (emp: Employee) => {
    const confirmed = window.confirm(
      `Hapus karyawan "${emp.name}" (${emp.nip}) dari sistem?`
    );
    if (confirmed) {
      onDeleteEmployee(emp.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Manajemen Data Karyawan</h3>
              <p className="text-xs text-slate-400">
                Tambah karyawan baru dan kelola pendaftaran sidik jari biometrik
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

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Add Employee Form */}
          <form onSubmit={handleAdd} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
              Tambah Karyawan Baru
            </h4>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Nomor Induk Pegawai (NIP):
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: NIP-202409"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Nama Lengkap:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Hendra Pratama"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Departemen:
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Engineering & IT">Engineering & IT</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Jabatan / Posisi:
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Contoh: QA Engineer"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Simpan Karyawan Baru</span>
            </button>
          </form>

          {/* Employee Directory List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Daftar Karyawan Terdaftar ({employees.length})
              </h4>

              <div className="flex items-center gap-2">
                {employees.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleConfirmClearAll}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Semua Data</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onLoadSampleEmployees}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Muat Contoh Karyawan (Demo)</span>
                  </button>
                )}
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400 mb-3">
                  Data karyawan kosong. Anda dapat menambahkan karyawan baru pada form di atas atau memuat data contoh untuk simulasi.
                </p>
                <button
                  type="button"
                  onClick={onLoadSampleEmployees}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 inline-flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Muat Data Contoh (5 Karyawan)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-300 font-bold flex items-center justify-center text-xs">
                        {emp.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{emp.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {emp.nip} • {emp.department} • {emp.position}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Biometric Toggle Registration */}
                      <button
                        type="button"
                        onClick={() => onToggleBiometric(emp.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                          emp.hasBiometricRegistered
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Klik untuk ubah registrasi sidik jari"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>
                          {emp.hasBiometricRegistered ? 'Sidik Jari Aktif' : 'Daftarkan Sidik Jari'}
                        </span>
                      </button>

                      {/* Delete Individual Employee Button */}
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(emp)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                        title="Hapus Karyawan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
