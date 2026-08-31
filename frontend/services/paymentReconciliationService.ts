import * as XLSX from 'xlsx';

export interface AppPaymentForReconciliation {
  patientId: string;
  patientName: string;
  nameAliases?: string[];
  chartNumber: string;
  paymentDate: string;
  paymentAmount: number;
  paymentNote?: string;
}

export interface ExcelPaymentForReconciliation {
  sourceSheet: string;
  sourceRow: number;
  paymentDate: string;
  patientName: string;
  paymentAmount: number;
  memo?: string;
}

export type ReconciliationStatus = 'matched' | 'split-matched' | 'excel-only' | 'app-only' | 'date-mismatch' | 'amount-mismatch';

export interface ReconciliationItem {
  status: ReconciliationStatus;
  excel?: ExcelPaymentForReconciliation;
  app?: AppPaymentForReconciliation;
  excelEntries?: ExcelPaymentForReconciliation[];
  appEntries?: AppPaymentForReconciliation[];
}

export interface PaymentReconciliationResult {
  fileName: string;
  fileRowCount: number;
  ignoredRowCount: number;
  items: ReconciliationItem[];
  matchedCount: number;
  splitMatchedCount: number;
  excelOnlyCount: number;
  appOnlyCount: number;
  dateMismatchCount: number;
  amountMismatchCount: number;
  excelTotal: number;
  appTotal: number;
  sourceExcelEntries?: ExcelPaymentForReconciliation[];
  sourceAppEntries?: AppPaymentForReconciliation[];
}

type ExcelRow = Record<string, unknown>;

const dateHeaders = ['\uC218\uB0A9\uC77C', '\uC218\uB0A9\uC77C\uC790', '\uC218\uB0A9\uB0A0\uC9DC', '\uB0A0\uC9DC', '\uC785\uAE08\uC77C', '\uACB0\uC81C\uC77C', 'date'];
const nameHeaders = ['\uD658\uC790\uBA85', '\uD658\uC790', '\uACE0\uAC1D\uBA85', '\uC131\uBA85', '\uC774\uB984', 'name'];
const amountHeaders = ['\uC218\uB0A9\uAE08\uC561', '\uC218\uB0A9\uC561', '\uAE08\uC561', '\uC785\uAE08\uC561', '\uACB0\uC81C\uAE08\uC561', 'amount'];
const memoHeaders = ['\uBE44\uACE0', '\uB0B4\uC6A9', '\uBA54\uBAA8', 'memo', 'note'];

const text = (value: unknown) => String(value ?? '').trim();
const normalizedHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_\-()\[\]]/g, '');
const normalizedName = (value: string) => value
  .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
  .replace(/\s/g, '')
  .toLowerCase();

const findHeader = (headers: string[], candidates: string[]) => {
  const normalizedCandidates = candidates.map(normalizedHeader);
  return headers.find(header => normalizedCandidates.includes(normalizedHeader(header))) || '';
};

const normalizeDate = (value: unknown): string => {
  const input = text(value);
  if (!input) return '';

  const digits = input.replace(/[^0-9]/g, '');
  if (/^\d{8}$/.test(digits)) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
  }

  if (/^\d+(\.\d+)?$/.test(input)) {
    const excelDate = XLSX.SSF.parse_date_code(Number(input));
    if (excelDate) {
      return `${String(excelDate.y).padStart(4, '0')}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  return '';
};

const normalizeAmount = (value: unknown): number => {
  const parsed = Number(text(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

const namesMatch = (app: AppPaymentForReconciliation, excelName: string) => {
  const normalizedExcelName = normalizedName(excelName);
  if (!normalizedExcelName) return false;

  return [app.patientName, ...(app.nameAliases || [])]
    .map(normalizedName)
    .filter(Boolean)
    .some(normalizedAppName =>
      normalizedAppName === normalizedExcelName ||
      (normalizedAppName.length >= 3 && normalizedExcelName.length >= 3 &&
        (normalizedAppName.includes(normalizedExcelName) || normalizedExcelName.includes(normalizedAppName)))
    );
};

const readExcelPayments = async (file: File): Promise<{ entries: ExcelPaymentForReconciliation[]; totalRows: number; ignoredRows: number }> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const entries: ExcelPaymentForReconciliation[] = [];
  let totalRows = 0;
  let ignoredRows = 0;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const dateHeader = findHeader(headers, dateHeaders);
    const nameHeader = findHeader(headers, nameHeaders);
    const amountHeader = findHeader(headers, amountHeaders);
    const memoHeader = findHeader(headers, memoHeaders);
    if (!dateHeader || !nameHeader || !amountHeader) return;

    rows.forEach((row, index) => {
      totalRows++;
      const paymentDate = normalizeDate(row[dateHeader]);
      const patientName = text(row[nameHeader]);
      const paymentAmount = normalizeAmount(row[amountHeader]);
      if (!paymentDate || !patientName || paymentAmount <= 0) {
        ignoredRows++;
        return;
      }
      entries.push({
        sourceSheet: sheetName,
        sourceRow: index + 2,
        paymentDate,
        patientName,
        paymentAmount,
        memo: memoHeader ? text(row[memoHeader]) : ''
      });
    });
  });

  return { entries, totalRows, ignoredRows };
};

const sameAmount = (left: number, right: number) => Math.round(left * 100) === Math.round(right * 100);

const findAmountSubset = <T extends { paymentAmount: number }>(
  candidates: Array<{ index: number; entry: T }>,
  target: number
) => {
  const targetCents = Math.round(target * 100);
  const sorted = candidates
    .filter(candidate => Math.round(candidate.entry.paymentAmount * 100) <= targetCents)
    .sort((a, b) => b.entry.paymentAmount - a.entry.paymentAmount)
    .slice(0, 12);
  let found: Array<{ index: number; entry: T }> | null = null;

  const search = (start: number, total: number, selected: Array<{ index: number; entry: T }>) => {
    if (found || total > targetCents) return;
    if (total === targetCents && selected.length >= 2) {
      found = selected;
      return;
    }
    for (let index = start; index < sorted.length; index++) {
      const candidate = sorted[index];
      search(index + 1, total + Math.round(candidate.entry.paymentAmount * 100), [...selected, candidate]);
      if (found) return;
    }
  };

  search(0, 0, []);
  return found;
};

const buildResult = (
  fileName: string,
  excelSourceEntries: ExcelPaymentForReconciliation[],
  appSourceEntries: AppPaymentForReconciliation[],
  yearMonth: string,
  ignoredRowCount = 0
): PaymentReconciliationResult => {
  const excelEntries = excelSourceEntries.filter(entry => entry.paymentDate.startsWith(yearMonth));
  const appEntries = appSourceEntries.filter(entry => entry.paymentDate.startsWith(yearMonth));
  const unmatchedExcelIndexes = new Set(excelEntries.map((_, index) => index));
  const unmatchedAppIndexes = new Set(appEntries.map((_, index) => index));
  const items: ReconciliationItem[] = [];

  [...unmatchedExcelIndexes].forEach(excelIndex => {
    const excel = excelEntries[excelIndex];
    const appIndex = [...unmatchedAppIndexes].find(index => {
      const app = appEntries[index];
      return namesMatch(app, excel.patientName) && app.paymentDate === excel.paymentDate && sameAmount(app.paymentAmount, excel.paymentAmount);
    });
    if (appIndex !== undefined) {
      unmatchedExcelIndexes.delete(excelIndex);
      unmatchedAppIndexes.delete(appIndex);
      items.push({ status: 'matched', excel, app: appEntries[appIndex] });
    }
  });

  [...unmatchedAppIndexes].forEach(appIndex => {
    if (!unmatchedAppIndexes.has(appIndex)) return;
    const app = appEntries[appIndex];
    const candidates = [...unmatchedExcelIndexes]
      .map(index => ({ index, entry: excelEntries[index] }))
      .filter(candidate => namesMatch(app, candidate.entry.patientName) && candidate.entry.paymentDate === app.paymentDate);
    const subset = findAmountSubset(candidates, app.paymentAmount);
    if (!subset) return;
    unmatchedAppIndexes.delete(appIndex);
    subset.forEach(candidate => unmatchedExcelIndexes.delete(candidate.index));
    items.push({
      status: 'split-matched',
      excel: subset[0].entry,
      app,
      excelEntries: subset.map(candidate => candidate.entry),
      appEntries: [app]
    });
  });

  [...unmatchedExcelIndexes].forEach(excelIndex => {
    if (!unmatchedExcelIndexes.has(excelIndex)) return;
    const excel = excelEntries[excelIndex];
    const candidates = [...unmatchedAppIndexes]
      .map(index => ({ index, entry: appEntries[index] }))
      .filter(candidate => namesMatch(candidate.entry, excel.patientName) && candidate.entry.paymentDate === excel.paymentDate);
    const subset = findAmountSubset(candidates, excel.paymentAmount);
    if (!subset) return;
    unmatchedExcelIndexes.delete(excelIndex);
    subset.forEach(candidate => unmatchedAppIndexes.delete(candidate.index));
    items.push({
      status: 'split-matched',
      excel,
      app: subset[0].entry,
      excelEntries: [excel],
      appEntries: subset.map(candidate => candidate.entry)
    });
  });

  [...unmatchedExcelIndexes].forEach(excelIndex => {
    const excel = excelEntries[excelIndex];
    const sameNameAndDate = [...unmatchedAppIndexes].find(index => {
      const app = appEntries[index];
      return namesMatch(app, excel.patientName) && app.paymentDate === excel.paymentDate;
    });
    if (sameNameAndDate !== undefined) {
      unmatchedExcelIndexes.delete(excelIndex);
      unmatchedAppIndexes.delete(sameNameAndDate);
      items.push({ status: 'amount-mismatch', excel, app: appEntries[sameNameAndDate] });
      return;
    }

    const sameNameAndAmount = [...unmatchedAppIndexes].find(index => {
      const app = appEntries[index];
      return namesMatch(app, excel.patientName) && sameAmount(app.paymentAmount, excel.paymentAmount);
    });
    if (sameNameAndAmount !== undefined) {
      unmatchedExcelIndexes.delete(excelIndex);
      unmatchedAppIndexes.delete(sameNameAndAmount);
      items.push({ status: 'date-mismatch', excel, app: appEntries[sameNameAndAmount] });
      return;
    }

    unmatchedExcelIndexes.delete(excelIndex);
    items.push({ status: 'excel-only', excel });
  });

  unmatchedAppIndexes.forEach(index => items.push({ status: 'app-only', app: appEntries[index] }));
  const count = (status: ReconciliationStatus) => items.filter(item => item.status === status).length;

  return {
    fileName,
    fileRowCount: excelEntries.length,
    ignoredRowCount,
    items,
    matchedCount: count('matched'),
    splitMatchedCount: count('split-matched'),
    excelOnlyCount: count('excel-only'),
    appOnlyCount: count('app-only'),
    dateMismatchCount: count('date-mismatch'),
    amountMismatchCount: count('amount-mismatch'),
    excelTotal: excelEntries.reduce((sum, entry) => sum + entry.paymentAmount, 0),
    appTotal: appEntries.reduce((sum, entry) => sum + entry.paymentAmount, 0),
    sourceExcelEntries: excelEntries,
    sourceAppEntries: appEntries
  };
};

const uniqueBy = <T>(entries: T[], key: (entry: T) => string) => {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const value = key(entry);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const paymentReconciliationService = {
  reconcile: async (
    file: File,
    appEntries: AppPaymentForReconciliation[],
    yearMonth: string
  ): Promise<PaymentReconciliationResult> => {
    const { entries, ignoredRows } = await readExcelPayments(file);
    return buildResult(file.name, entries, appEntries, yearMonth, ignoredRows);
  },

  recalculate: (
    savedResult: PaymentReconciliationResult,
    currentAppEntries: AppPaymentForReconciliation[],
    yearMonth: string
  ): PaymentReconciliationResult => {
    const excelEntries = savedResult.sourceExcelEntries || uniqueBy(
      savedResult.items.flatMap(item => item.excelEntries || (item.excel ? [item.excel] : [])),
      entry => `${entry.sourceSheet}:${entry.sourceRow}`
    );
    return buildResult(
      savedResult.fileName,
      excelEntries,
      currentAppEntries,
      yearMonth,
      savedResult.ignoredRowCount
    );
  }
};
