import { Employee, OfficeSettings } from '../types/attendance';

// Default is empty as requested by user
export const INITIAL_EMPLOYEES: Employee[] = [];

// Sample demo employees for optional quick-loading
export const SAMPLE_DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    nip: 'NIP-202401',
    name: 'Siti Rahmawati, S.Kom',
    email: 'siti.rahmawati@perusahaan.co.id',
    department: 'Human Resources',
    position: 'HR Manager & People Ops',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    hasBiometricRegistered: true,
    biometricCredentialId: 'cred-bio-001'
  },
  {
    id: 'emp-002',
    nip: 'NIP-202402',
    name: 'Budi Santoso',
    email: 'budi.santoso@perusahaan.co.id',
    department: 'Engineering & IT',
    position: 'Lead Backend Developer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    hasBiometricRegistered: true,
    biometricCredentialId: 'cred-bio-002'
  },
  {
    id: 'emp-003',
    nip: 'NIP-202403',
    name: 'Dewi Lestari',
    email: 'dewi.lestari@perusahaan.co.id',
    department: 'Product & Design',
    position: 'Senior UI/UX Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    hasBiometricRegistered: true,
    biometricCredentialId: 'cred-bio-003'
  },
  {
    id: 'emp-004',
    nip: 'NIP-202404',
    name: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@perusahaan.co.id',
    department: 'Sales & Marketing',
    position: 'Account Executive',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    hasBiometricRegistered: false
  },
  {
    id: 'emp-005',
    nip: 'NIP-202405',
    name: 'Rian Hidayat',
    email: 'rian.hidayat@perusahaan.co.id',
    department: 'Operations',
    position: 'Field Operations Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    hasBiometricRegistered: true,
    biometricCredentialId: 'cred-bio-005'
  }
];

export const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  officeName: 'Kantor Pusat PT Digital Solusi Prima',
  workStartTime: '08:30',
  lateThresholdTime: '08:45',
  workEndTime: '17:30',
  enableGpsValidation: false,
  officeCoords: {
    latitude: -6.2088,
    longitude: 106.8456, // Jakarta coordinates
    radiusMeters: 500
  }
};
