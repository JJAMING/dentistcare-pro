import { AppointmentRecord, AppointmentStatus, Patient } from '../types';

const todayString = () => new Date().toISOString().slice(0, 10);

const appointmentId = (date: string, content = '') => `${date}:${content}`;

const createRecord = (
  date: string,
  content: string,
  status: AppointmentStatus = 'scheduled',
  source: AppointmentRecord['source'] = 'manual'
): AppointmentRecord => ({
  id: appointmentId(date, content),
  date,
  content,
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

  const hasCurrentAppointment = history.some(record => record.date === patient.nextRecallDate);
  if (!hasCurrentAppointment) {
    history.push(createRecord(
      patient.nextRecallDate,
      patient.nextRecallContent || '',
      patient.lastVisit === patient.nextRecallDate ? 'visited' : 'scheduled'
    ));
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
  lastVisit: string
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
      matchingRecord.source = 'dentweb';
    } else {
      history.push(createRecord(nextRecallDate, nextRecallContent, 'scheduled', 'dentweb'));
    }
  }

  return {
    ...patient,
    lastVisit,
    nextRecallDate: nextRecallDate || patient.nextRecallDate,
    nextRecallContent: nextRecallDate ? nextRecallContent : patient.nextRecallContent,
    appointmentHistory: history.sort((a, b) => a.date.localeCompare(b.date))
  };
};

export const appointmentDisplayStatus = (record: AppointmentRecord): AppointmentStatus =>
  record.status === 'scheduled' && record.date < todayString() ? 'no-show' : record.status;

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
