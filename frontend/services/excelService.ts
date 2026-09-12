import * as XLSX from 'xlsx';
import { Patient } from '../types';

const GUIDE_SHEET = '안내';
const PATIENT_SHEET = '환자목록';
const BACKUP_COLUMN = '전체 데이터(JSON)';
const VISIBLE_HEADERS = [
  '차트번호', '이름', '연락처', '생년월일', '성별', '등록일', '최근 방문일',
  '다음 리콜일', '다음 리콜 내용', '내원 경로', '상세 내원 경로', '상태', '진료 건수'
];
// 엑셀 셀은 32,767자를 넘으면 저장 시 오류가 나므로, 백업 JSON이 길어지면 숨김 열을 여러 개로 나눠 담는다.
const BACKUP_CHUNK_CHARS = 30000;
const backupColumnName = (chunkIndex: number) => (chunkIndex === 0 ? BACKUP_COLUMN : `${BACKUP_COLUMN}${chunkIndex + 1}`);

type ExcelRow = Record<string, unknown>;

export interface ExcelImportResult {
  patients: Patient[];
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  errors: string[];
}

interface ExcelImportOptions {
  clinicId: string;
  existingPatients: Patient[];
}

const today = () => new Date().toISOString().split('T')[0];

const text = (value: unknown) => String(value ?? '').trim();

const escapeFormula = (value: unknown) => {
  const stringValue = String(value ?? '');
  return /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
};

const normalizeDate = (value: unknown): { value: string; valid: boolean } => {
  const input = text(value);
  if (!input) return { value: '', valid: true };

  const digits = input.replace(/[./]/g, '-').replace(/-/g, '');
  if (/^\d{8}$/.test(digits)) {
    const yyyy = Number(digits.slice(0, 4));
    const mm = Number(digits.slice(4, 6));
    const dd = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(yyyy, mm - 1, dd));
    const valid = date.getUTCFullYear() === yyyy && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd;
    return { value: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`, valid };
  }

  if (/^\d+(\.\d+)?$/.test(input)) {
    const date = XLSX.SSF.parse_date_code(Number(input));
    if (date) {
      const yyyy = String(date.y).padStart(4, '0');
      const mm = String(date.m).padStart(2, '0');
      const dd = String(date.d).padStart(2, '0');
      return { value: `${yyyy}-${mm}-${dd}`, valid: true };
    }
  }

  return { value: input, valid: false };
};

const parseBoolean = (value: unknown) => {
  const normalized = text(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === '예';
};

const getRows = (sheet: XLSX.WorkSheet): ExcelRow[] =>
  XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

const findPatientSheet = (workbook: XLSX.WorkBook) => {
  const preferred = workbook.Sheets[PATIENT_SHEET] || workbook.Sheets.Patients;
  if (preferred) return preferred;

  return workbook.SheetNames
    .map(name => workbook.Sheets[name])
    .find(sheet => {
      const headers = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0 })[0] || [];
      return headers.map(header => text(header)).includes('차트번호');
    });
};

const parseBackup = (value: unknown): Partial<Patient> | null => {
  const raw = text(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Partial<Patient> : null;
  } catch {
    return null;
  }
};

/** 여러 숨김 열(전체 데이터(JSON), 전체 데이터(JSON)2, ...)에 나뉘어 저장된 백업 JSON을 이어붙인다. */
const readBackupCell = (row: ExcelRow): string => {
  let combined = '';
  for (let i = 0; backupColumnName(i) in row; i++) {
    combined += text(row[backupColumnName(i)]);
  }
  return combined;
};

const getDate = (row: ExcelRow, header: string, fallback = '') => {
  const parsed = normalizeDate(row[header]);
  return parsed.value ? parsed : { value: fallback, valid: true };
};

const makePatient = (row: ExcelRow, clinicId: string, patientId: string): { patient?: Patient; error?: string } => {
  const backupCell = readBackupCell(row);
  const backup = parseBackup(backupCell);
  if (backupCell && !backup) return { error: '전체 백업 데이터 형식이 올바르지 않습니다.' };

  const chartNumber = text(row['차트번호']) || text(backup?.chartNumber);
  const name = text(row['이름']) || text(backup?.name);
  if (!chartNumber || !name) return { error: '차트번호와 이름은 필수입니다.' };

  const birthDate = getDate(row, '생년월일', text(backup?.birthDate));
  const registrationDate = getDate(row, '등록일', text(backup?.registrationDate) || today());
  const lastVisit = getDate(row, '최근 방문일', text(backup?.lastVisit));
  const nextRecallDate = getDate(row, '다음 리콜일', text(backup?.nextRecallDate));
  const invalidDate = [birthDate, registrationDate, lastVisit, nextRecallDate].find(date => !date.valid);
  if (invalidDate) return { error: '날짜는 YYYY-MM-DD 형식이어야 합니다.' };

  const raw = backup || {};
  const patient: Patient = {
    id: patientId,
    chartNumber,
    name,
    nameAliases: Array.isArray(raw.nameAliases) ? raw.nameAliases.filter(alias => typeof alias === 'string') : [],
    phone: text(row['연락처']) || text(raw.phone),
    birthDate: birthDate.value,
    gender: text(row['성별']) === '남' || text(row['성별']) === '여' ? text(row['성별']) as '남' | '여' : raw.gender,
    registrationDate: registrationDate.value,
    lastVisit: lastVisit.value,
    nextRecallDate: nextRecallDate.value,
    nextRecallContent: text(row['다음 리콜 내용']) || text(raw.nextRecallContent),
    nextRecallTime: text(raw.nextRecallTime) || undefined,
    appointmentHistory: Array.isArray(raw.appointmentHistory) ? raw.appointmentHistory : undefined,
    visitPath: text(row['내원 경로']) || text(raw.visitPath),
    visitPathDetail: text(row['상세 내원 경로']) || text(raw.visitPathDetail),
    treatments: Array.isArray(raw.treatments) ? raw.treatments : [],
    status: raw.status === 'inactive' || text(row['상태']) === 'inactive' ? 'inactive' : 'active',
    completedRecallDates: Array.isArray(raw.completedRecallDates) ? raw.completedRecallDates.filter(date => typeof date === 'string') : [],
    externalId: text(raw.externalId) || undefined,
    dentwebPatientId: typeof raw.dentwebPatientId === 'number' ? raw.dentwebPatientId : undefined,
    isLinked: typeof raw.isLinked === 'boolean' ? raw.isLinked : parseBoolean(raw.isLinked),
    recallExcluded: typeof raw.recallExcluded === 'boolean' ? raw.recallExcluded : parseBoolean(raw.recallExcluded),
    firstVisit: text(raw.firstVisit) || undefined,
    clinicId
  };

  return { patient };
};

const makeSheet = (rows: ExcelRow[], headers: string[]) => {
  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  if (rows.length > 0) XLSX.utils.sheet_add_json(sheet, rows, { origin: 'A2', skipHeader: true, header: headers });
  const backupColumnCount = headers.length - VISIBLE_HEADERS.length;
  sheet['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
    ...Array.from({ length: backupColumnCount }, () => ({ wch: 2, hidden: true }))
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  return sheet;
};

export const excelService = {
  exportToExcel: (patients: Patient[]) => {
    const backups = patients.map(patient => JSON.stringify(patient));
    const chunkCount = Math.max(1, ...backups.map(backup => Math.ceil(backup.length / BACKUP_CHUNK_CHARS) || 1));
    const headers = [...VISIBLE_HEADERS, ...Array.from({ length: chunkCount }, (_, i) => backupColumnName(i))];

    const rows = patients.map((patient, index) => {
      const backup = backups[index];
      const backupCells: ExcelRow = {};
      for (let i = 0; i < chunkCount; i++) {
        backupCells[backupColumnName(i)] = backup.slice(i * BACKUP_CHUNK_CHARS, (i + 1) * BACKUP_CHUNK_CHARS);
      }
      return {
        '차트번호': escapeFormula(patient.chartNumber),
        '이름': escapeFormula(patient.name),
        '연락처': escapeFormula(patient.phone),
        '생년월일': patient.birthDate,
        '성별': patient.gender || '',
        '등록일': patient.registrationDate,
        '최근 방문일': patient.lastVisit,
        '다음 리콜일': patient.nextRecallDate,
        '다음 리콜 내용': escapeFormula(patient.nextRecallContent),
        '내원 경로': escapeFormula(patient.visitPath || ''),
        '상세 내원 경로': escapeFormula(patient.visitPathDetail || ''),
        '상태': patient.status,
        '진료 건수': patient.treatments?.length || 0,
        ...backupCells
      };
    });

    const guide = XLSX.utils.aoa_to_sheet([
      ['DentistCare 환자 전체 백업'],
      ['형식 버전', '2'],
      ['내보낸 시각', new Date().toLocaleString('ko-KR')],
      ['환자 수', patients.length],
      ['안내', '환자목록 시트에는 기본 정보와 진료·수납·메모를 포함한 전체 백업 데이터가 숨김 열에 함께 저장됩니다.'],
      ['복원 방법', '환자 관리 > 엑셀 가져오기에서 이 파일을 선택하세요. 이미 있는 차트번호는 건너뜁니다.']
    ]);
    guide['!cols'] = [{ wch: 18 }, { wch: 100 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, guide, GUIDE_SHEET);
    XLSX.utils.book_append_sheet(workbook, makeSheet(rows, headers), PATIENT_SHEET);
    XLSX.writeFile(workbook, `DentistCare_환자전체백업_${today()}.xlsx`);
  },

  importFromExcel: async (file: File, options: ExcelImportOptions): Promise<ExcelImportResult> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          const patientSheet = findPatientSheet(workbook);
          if (!patientSheet) throw new Error('차트번호 열이 있는 환자목록 시트를 찾을 수 없습니다.');

          const rows = getRows(patientSheet);
          const existingChartNumbers = new Set(options.existingPatients.map(patient => patient.chartNumber.trim()));
          const existingIds = new Set(options.existingPatients.map(patient => patient.id));
          const fileChartNumbers = new Set<string>();
          const patients: Patient[] = [];
          const errors: string[] = [];
          let skippedCount = 0;
          let invalidCount = 0;

          rows.forEach((row, index) => {
            const backup = parseBackup(readBackupCell(row));
            const chartNumber = text(row['차트번호']) || text(backup?.chartNumber);
            if (existingChartNumbers.has(chartNumber) || fileChartNumbers.has(chartNumber)) {
              skippedCount++;
              return;
            }

            const backupId = text(backup?.id);
            const patientId = backupId && !existingIds.has(backupId) ? backupId : crypto.randomUUID();
            const result = makePatient(row, options.clinicId, patientId);
            if (!result.patient) {
              invalidCount++;
              if (errors.length < 5) errors.push(`${index + 2}행: ${result.error}`);
              return;
            }

            fileChartNumbers.add(result.patient.chartNumber);
            existingIds.add(patientId);
            patients.push(result.patient);
          });

          resolve({
            patients,
            totalRows: rows.length,
            importedCount: patients.length,
            skippedCount,
            invalidCount,
            errors
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
      reader.readAsArrayBuffer(file);
    });
  }
};
