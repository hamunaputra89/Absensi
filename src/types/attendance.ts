export type AttendanceType = 'MASUK' | 'PULANG';
export type AttendanceMethod = 'KAMERA' | 'FINGERPRINT';
export type WorkLocation = 'WFO' | 'WFH' | 'DINAS';
export type AttendanceStatus = 'TEPAT_WAKTU' | 'TERLAMBAT' | 'LEMBUR' | 'PULANG_AWAL';

export interface Employee {
  id: string;
  nip: string;
  name: string;
  email: string;
  department: string;
  position: string;
  avatarUrl?: string;
  hasBiometricRegistered?: boolean;
  biometricCredentialId?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  nip: string;
  department: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  type: AttendanceType;
  method: AttendanceMethod;
  status: AttendanceStatus;
  workLocation: WorkLocation;
  photoUrl?: string; // Data URL for snapshot
  gpsCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  notes?: string;
  syncedToGoogleSheets: boolean;
  sheetsRowIndex?: number;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetName: string;
  lastSyncedAt?: string;
  autoSync: boolean;
}

export interface OfficeSettings {
  officeName: string;
  workStartTime: string; // "08:30"
  lateThresholdTime: string; // "08:45"
  workEndTime: string; // "17:30"
  enableGpsValidation: boolean;
  officeCoords: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
}
