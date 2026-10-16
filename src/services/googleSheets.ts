import { AttendanceRecord, GoogleSheetConfig } from '../types/attendance';

export const DEFAULT_SHEET_TITLE_PREFIX = 'Laporan Kehadiran Karyawan (AbsensiKu)';
export const DEFAULT_SHEET_NAME = 'Data Kehadiran';

export const ATTENDANCE_HEADERS = [
  'No',
  'ID Presensi',
  'Tanggal',
  'Waktu',
  'NIP',
  'Nama Karyawan',
  'Departemen',
  'Tipe Presensi',
  'Metode',
  'Status Kehadiran',
  'Lokasi Kerja',
  'Koordinat GPS',
  'Catatan / Keterangan',
  'Status Verifikasi'
];

/**
 * Creates a brand new Google Spreadsheet with stylized headers and frozen top row
 */
export async function createAttendanceSpreadsheet(
  accessToken: string,
  customTitle?: string
): Promise<GoogleSheetConfig> {
  const currentMonthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const title = customTitle || `${DEFAULT_SHEET_TITLE_PREFIX} - ${currentMonthYear}`;

  const requestBody = {
    properties: {
      title,
      timeZone: 'Asia/Jakarta'
    },
    sheets: [
      {
        properties: {
          title: DEFAULT_SHEET_NAME,
          gridProperties: {
            rowCount: 1000,
            columnCount: ATTENDANCE_HEADERS.length + 2,
            frozenRowCount: 1
          }
        }
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal membuat spreadsheet: ${response.statusText}`);
  }

  const sheetData = await response.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;

  // Insert Header row and apply professional corporate styling
  await insertHeaderAndStyling(accessToken, spreadsheetId, sheetId, DEFAULT_SHEET_NAME);

  const config: GoogleSheetConfig = {
    spreadsheetId,
    spreadsheetTitle: title,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName: DEFAULT_SHEET_NAME,
    lastSyncedAt: new Date().toISOString(),
    autoSync: true
  };

  return config;
}

/**
 * Formats header with indigo/slate styling, bold white text, and auto-resize
 */
async function insertHeaderAndStyling(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number,
  sheetName: string
) {
  // 1. Insert header values
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1:${String.fromCharCode(64 + ATTENDANCE_HEADERS.length)}1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [ATTENDANCE_HEADERS]
      })
    }
  );

  // 2. Batch update styles (header background, font, alignment)
  const batchRequests = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: ATTENDANCE_HEADERS.length
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.15, green: 0.23, blue: 0.36 }, // Dark Slate/Navy #273a5c
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    }
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests: batchRequests })
  });
}

/**
 * Appends a single attendance record to Google Sheets
 */
export async function appendAttendanceToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  record: AttendanceRecord,
  rowNumber: number
): Promise<boolean> {
  const gpsString = record.gpsCoords
    ? `${record.gpsCoords.latitude.toFixed(6)}, ${record.gpsCoords.longitude.toFixed(6)}`
    : 'Tidak Terlacak';

  const rowValues = [
    rowNumber,
    record.id,
    record.date,
    record.time,
    record.nip,
    record.employeeName,
    record.department,
    record.type === 'MASUK' ? 'ABSEN MASUK' : 'ABSEN PULANG',
    record.method === 'KAMERA' ? 'Kamera HP (Selfie)' : 'Fingerprint Biometrik',
    record.status === 'TEPAT_WAKTU' ? 'Tepat Waktu' : record.status === 'TERLAMBAT' ? 'Terlambat' : record.status,
    record.workLocation,
    gpsString,
    record.notes || '-',
    'Terverifikasi Otentik'
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal menyinkronkan ke Google Sheets: ${response.statusText}`);
  }

  return true;
}

/**
 * Batch syncs multiple attendance records at once
 */
export async function batchSyncAttendancesToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  records: AttendanceRecord[],
  startRowNumber: number
): Promise<number> {
  if (records.length === 0) return 0;

  const rows = records.map((record, index) => {
    const gpsString = record.gpsCoords
      ? `${record.gpsCoords.latitude.toFixed(6)}, ${record.gpsCoords.longitude.toFixed(6)}`
      : 'Tidak Terlacak';

    return [
      startRowNumber + index,
      record.id,
      record.date,
      record.time,
      record.nip,
      record.employeeName,
      record.department,
      record.type === 'MASUK' ? 'ABSEN MASUK' : 'ABSEN PULANG',
      record.method === 'KAMERA' ? 'Kamera HP (Selfie)' : 'Fingerprint Biometrik',
      record.status === 'TEPAT_WAKTU' ? 'Tepat Waktu' : record.status === 'TERLAMBAT' ? 'Terlambat' : record.status,
      record.workLocation,
      gpsString,
      record.notes || '-',
      'Terverifikasi Otentik'
    ];
  });

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal batch sinkron: ${response.statusText}`);
  }

  return records.length;
}

/**
 * Verifies spreadsheet access and fetches sheet metadata
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Tidak dapat membaca spreadsheet');
  }

  const data = await response.json();
  const title = data.properties?.title || 'Spreadsheet Absensi';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);

  return { title, sheets };
}
