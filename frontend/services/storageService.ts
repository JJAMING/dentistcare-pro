
import { Patient } from '../types';
import { authService } from './authService';
import { getAppointmentHistory, withAppointmentHistory } from './appointmentService';

const STORAGE_KEY = 'dentist_care_patients';
const DOCTORS_KEY = 'dentist_care_doctors';
const DELETED_PATIENT_IDS_KEY = 'dentist_care_deleted_patient_ids';

const DEFAULT_DOCTORS = ['대표원장', '부원장1', '교정원장'];

export const storageService = {
  getPatients: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    const patients: Patient[] = data ? JSON.parse(data) : [];
    return patients.map(withAppointmentHistory);
  },

  savePatients: (patients: Patient[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients.map(withAppointmentHistory)));
  },

  addPatient: (patient: Patient) => {
    const user = authService.getCurrentUser();
    const patients = storageService.getPatients();
    const newPatient = withAppointmentHistory({
      ...patient,
      clinicId: user?.clinicId || "baroom_dental"
    });
    patients.push(newPatient);
    storageService.savePatients(patients);
  },

  updatePatient: (updatedPatient: Patient) => {
    const patients = storageService.getPatients();
    const index = patients.findIndex(p => p.id === updatedPatient.id);
    if (index !== -1) {
      // Preserve an appointment even when a form or synchronization replaces
      // the legacy nextRecallDate field with a newer date.
      const existingHistory = getAppointmentHistory(patients[index]);
      const incomingHistory = getAppointmentHistory(updatedPatient);
      const history = [...existingHistory];
      incomingHistory.forEach(record => {
        const current = history.find(item => item.id === record.id);
        if (current) Object.assign(current, record);
        else history.push(record);
      });
      const activeAppointment = history.find(record => record.date === updatedPatient.nextRecallDate);
      if (activeAppointment && updatedPatient.nextRecallContent) {
        activeAppointment.content = updatedPatient.nextRecallContent;
      }
      patients[index] = withAppointmentHistory({ ...updatedPatient, appointmentHistory: history });
      storageService.savePatients(patients);
    }
  },

  deletePatient: (id: string) => {
    const patients = storageService.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    storageService.savePatients(filtered);

    // Keep a local tombstone until the next successful cloud sync so a
    // locally deleted patient is not restored from Firestore later.
    const deletedPatientIds = storageService.getDeletedPatientIds();
    if (!deletedPatientIds.includes(id)) {
      localStorage.setItem(DELETED_PATIENT_IDS_KEY, JSON.stringify([...deletedPatientIds, id]));
    }
  },

  getDeletedPatientIds: (): string[] => {
    try {
      const data = localStorage.getItem(DELETED_PATIENT_IDS_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
        : [];
    } catch {
      return [];
    }
  },

  clearDeletedPatientIds: (ids: string[]) => {
    if (ids.length === 0) return;
    const idsToClear = new Set(ids);
    const remaining = storageService.getDeletedPatientIds().filter(id => !idsToClear.has(id));
    if (remaining.length > 0) {
      localStorage.setItem(DELETED_PATIENT_IDS_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(DELETED_PATIENT_IDS_KEY);
    }
  },

  getDoctors: (): string[] => {
    const data = localStorage.getItem(DOCTORS_KEY);
    return data ? JSON.parse(data) : DEFAULT_DOCTORS;
  },

  saveDoctors: (doctors: string[]) => {
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
  }
};
