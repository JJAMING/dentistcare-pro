import { AppointmentRecord, AppointmentStatus, Patient } from '../types';
import type { DentwebDayAppointment } from './dentwebService';

const todayString = () => new Date().toISOString().slice(0, 10);

const appointmentId = (date: string, content = '') => `${date}:${content}`;

const createRecord = (
  date: string,
  content: string,
  status: AppointmentStatus = 'scheduled',
  source: AppointmentRecord['source'] = 'manual',
  time?: string
): AppointmentRecord => ({
  id: appointmentId(date, content),
  date,
  content,
  time,
  status,
  source,
  recordedAt: new Date().toISOString()
});

/**
 * id는 `날짜:내용`이라 같은 날 내용이 같은(또는 빈) 예약이 여러 건이면 겹친다.
 * 겹치면 상태 변경이 함께 적용되므로, 두 번째부터 `#2`, `#3`을 붙여 항상 고유하게 만든다.
 * (입력 순서 기준이라 같은 이력이면 항상 같은 결과가 나온다.)
 */
const withUniqueIds = (records: AppointmentRecord[]): AppointmentRecord[] => {
  const seen = new Map<string, number>();
  return records.map(record => {
    const count = (seen.get(record.id) || 0) + 1;
    seen.set(record.id, count);
    return count === 1 ? record : { ...record, id: `${record.id}#${count}` };
  });
};

/**
 * Keeps a permanent copy of the current appointment. This also migrates older
 * patient records that only had nextRecallDate/nextRecallContent.
 */
export const getAppointmentHistory = (patient: Patient): AppointmentRecord[] => {
  const history = [...(patient.appointmentHistory || [])];
  if (!patient.nextRecallDate) return withUniqueIds(history);

  const currentIndex = history.findIndex(record => record.date === patient.nextRecallDate);
  if (currentIndex === -1) {
    history.push(createRecord(
      patient.nextRecallDate,
      patient.nextRecallContent || '',
      patient.lastVisit === patient.nextRecallDate ? 'visited' : 'scheduled',
      'manual',
      patient.nextRecallTime
    ));
  } else if (!history[currentIndex].time && patient.nextRecallTime) {
    // 이미 이력에 있는 현재 예약이지만 시간이 비어 있다면, 수동으로 입력한 시간으로 보완한다.
    history[currentIndex] = { ...history[currentIndex], time: patient.nextRecallTime };
  }
  return withUniqueIds(history).sort((a, b) => a.date.localeCompare(b.date));
};

export const withAppointmentHistory = (patient: Patient): Patient => ({
  ...patient,
  appointmentHistory: getAppointmentHistory(patient)
});

/** Retain the prior appointment before a DentWeb sync replaces it with a newer one. */
export const applyDentwebAppointment = (
  patient: Patient,
  nextRecallDate: string,
  nextRecallContent: string,
  lastVisit: string,
  nextRecallTime = ''
): Patient => {
  const history = getAppointmentHistory(patient);
  const currentRecord = history.find(record => record.date === patient.nextRecallDate);

  if (currentRecord && patient.nextRecallDate && lastVisit === patient.nextRecallDate) {
    currentRecord.status = 'visited';
  }

  if (nextRecallDate) {
    const matchingRecord = history.find(record => record.date === nextRecallDate);
    if (matchingRecord) {
      matchingRecord.content = nextRecallContent || matchingRecord.content;
      matchingRecord.time = nextRecallTime || matchingRecord.time;
      matchingRecord.source = 'dentweb';
    } else {
      history.push(createRecord(nextRecallDate, nextRecallContent, 'scheduled', 'dentweb', nextRecallTime));
    }
  }

  return {
    ...patient,
    lastVisit,
    nextRecallDate: nextRecallDate || patient.nextRecallDate,
    nextRecallContent: nextRecallDate ? nextRecallContent : patient.nextRecallContent,
    nextRecallTime: nextRecallDate ? (nextRecallTime || patient.nextRecallTime) : patient.nextRecallTime,
    appointmentHistory: history.sort((a, b) => a.date.localeCompare(b.date))
  };
};

/**
 * 특정 날짜의 덴트웹 예약(이행현황 포함)을 앱의 예약 이력에 맞춘다.
 * - 덴트웹에서 내원(이행현황 > 0)한 예약은 '예정' → '내원'으로 바꾸고 최근 방문일을 갱신
 * - 앱 기록에 시간/내용이 비어 있으면 덴트웹 값으로 채움 (덴트웹에서 온 기록은 시간을 덴트웹 기준으로 유지)
 * - 앱에 등록된 환자인데 그 날짜 기록이 없으면 덴트웹 예약을 추가
 * - 수동으로 정한 상태(내원/미이행)를 '예정'으로 되돌리지는 않는다.
 */
export const reconcileWithDentweb = (
  patients: Patient[],
  date: string,
  rows: DentwebDayAppointment[]
): { patients: Patient[]; changed: boolean } => {
  const rowsByChart = new Map<string, DentwebDayAppointment[]>();
  rows.forEach(row => {
    const key = row.chartNumber.trim();
    rowsByChart.set(key, [...(rowsByChart.get(key) || []), row]);
  });

  let changed = false;
  const reconciled = patients.map(patient => {
    const dayRows = rowsByChart.get(patient.chartNumber.trim());
    if (!dayRows || dayRows.length === 0) return patient;

    const visited = dayRows.some(row => row.status > 0);
    const row = dayRows.find(r => r.status > 0) || dayRows[0];
    const content = [row.appointmentContent, row.memo].filter(Boolean).join(' / ');

    const history = getAppointmentHistory(patient);
    const index = history.findIndex(record => record.date === date);
    let nextHistory = history;
    if (index === -1) {
      nextHistory = [...history, createRecord(date, content, visited ? 'visited' : 'scheduled', 'dentweb', row.appointmentTime)];
    } else {
      const record = history[index];
      const patch: Partial<AppointmentRecord> = {};
      if (visited && record.status === 'scheduled') patch.status = 'visited';
      // 덴트웹에 실제로 있는 예약이므로 출처를 덴트웹으로 확정한다 (이후 취소 여부 판단의 근거).
      if (record.source !== 'dentweb') patch.source = 'dentweb';
      if (row.appointmentTime && record.time !== row.appointmentTime && (!record.time || record.source === 'dentweb')) {
        patch.time = row.appointmentTime;
      }
      if (!record.content && content) patch.content = content;
      if (Object.keys(patch).length > 0) {
        nextHistory = history.map((r, i) => (i === index ? { ...r, ...patch } : r));
      }
    }

    const lastVisit = visited && date > (patient.lastVisit || '') ? date : patient.lastVisit;
    if (nextHistory === history && lastVisit === patient.lastVisit) return patient;

    changed = true;
    return {
      ...patient,
      lastVisit,
      appointmentHistory: [...nextHistory].sort((a, b) => a.date.localeCompare(b.date))
    };
  });

  return { patients: reconciled, changed };
};

/**
 * 덴트웹에서 온 예약으로 볼 수 있는가.
 * 출처가 덴트웹이거나, (예전 데이터처럼 출처가 manual로 남았더라도) 시간이 있는 현재 리콜 예약이면 덴트웹 연동분으로 본다.
 * 시간 없이 직접 입력한 예약은 덴트웹에 없어도 정상이므로 제외한다.
 */
const isDentwebOrigin = (record: AppointmentRecord, patient: Patient) =>
  record.source === 'dentweb' || (!!record.time && patient.nextRecallDate === record.date);

/**
 * 해당 날짜의 덴트웹 예약 목록에 없는데 앱에는 '예정'으로 남아 있는 덴트웹 연동 예약(= 취소/변경되어 삭제된 예약)이 있는 환자.
 * 덴트웹은 취소하면 행이 삭제되고, 진짜 노쇼는 이행현황 0으로 남는다.
 * 그날 덴트웹 예약이 1건도 없으면(데이터가 없는 날, 조회 이상) 판단하지 않는다.
 */
export const findCancelledDentwebAppointments = (
  patients: Patient[],
  date: string,
  rows: DentwebDayAppointment[]
): Patient[] => {
  if (rows.length === 0) return [];
  const present = new Set(rows.map(row => row.chartNumber.trim()));
  return patients.filter(patient =>
    !present.has(patient.chartNumber.trim()) &&
    getAppointmentHistory(patient).some(record =>
      record.date === date && record.status === 'scheduled' && isDentwebOrigin(record, patient))
  );
};

/**
 * 취소된 예약을 이력에서 삭제한다.
 * 그 날짜가 환자의 현재 리콜(nextRecallDate)이었다면 그대로 두면 이력이 다시 만들어지므로,
 * 덴트웹에서 새로 조회한 다음 예약(upcoming)으로 바꾸고, 없으면 리콜을 비운다.
 */
export const removeCancelledAppointment = (
  patient: Patient,
  date: string,
  upcoming?: { date: string; content: string; time: string } | null
): Patient => {
  const history = getAppointmentHistory(patient).filter(record =>
    !(record.date === date && record.status === 'scheduled' && isDentwebOrigin(record, patient)));
  const wasCurrent = patient.nextRecallDate === date;
  const cleaned: Patient = wasCurrent
    ? { ...patient, nextRecallDate: '', nextRecallContent: '', nextRecallTime: '', appointmentHistory: history }
    : { ...patient, appointmentHistory: history };
  if (wasCurrent && upcoming) {
    return applyDentwebAppointment(cleaned, upcoming.date, upcoming.content, patient.lastVisit, upcoming.time);
  }
  return cleaned;
};

export const appointmentDisplayStatus = (record: AppointmentRecord): AppointmentStatus =>
  record.status === 'scheduled' && record.date < todayString() ? 'no-show' : record.status;

export const appointmentTimeForDate = (patient: Patient, date: string): string =>
  getAppointmentHistory(patient).find(record => record.date === date)?.time || '';

/** 저장 형식 'HHmm' -> <input type="time"> 표시 형식 'HH:mm' */
export const timeToInputValue = (time?: string): string =>
  time && /^\d{4}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2)}` : '';

/** <input type="time"> 값 'HH:mm' -> 저장 형식 'HHmm' */
export const timeFromInputValue = (value: string): string => value.replace(':', '');

export const updateAppointmentStatus = (
  patient: Patient,
  appointmentIdToUpdate: string,
  status: AppointmentStatus
): Patient => ({
  ...withAppointmentHistory(patient),
  appointmentHistory: getAppointmentHistory(patient).map(record =>
    record.id === appointmentIdToUpdate ? { ...record, status } : record
  )
});
