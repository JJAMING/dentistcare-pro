import { AppointmentRecord, AppointmentStatus, Patient } from '../types';

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
 * Keeps a permanent copy of the current appointment. This also migrates older
 * patient records that only had nextRecallDate/nextRecallContent.
 */
export const getAppointmentHistory = (patient: Patient): AppointmentRecord[] => {
  const history = [...(patient.appointmentHistory || [])];
  if (!patient.nextRecallDate) return history;

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
  return history.sort((a, b) => a.date.localeCompare(b.date));
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
