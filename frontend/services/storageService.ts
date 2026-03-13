
import { Patient } from '../types';

const STORAGE_KEY = 'dentist_care_patients';
const DOCTORS_KEY = 'dentist_care_doctors';

const DEFAULT_DOCTORS = ['대표원장', '부원장1', '교정원장'];

export const storageService = {
  getPatients: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  savePatients: (patients: Patient[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  },

  addPatient: (patient: Patient) => {
    const patients = storageService.getPatients();
    patients.push(patient);
    storageService.savePatients(patients);
  },

  updatePatient: (updatedPatient: Patient) => {
    const patients = storageService.getPatients();
    const index = patients.findIndex(p => p.id === updatedPatient.id);
    if (index !== -1) {
      patients[index] = updatedPatient;
      storageService.savePatients(patients);
    }
  },

  deletePatient: (id: string) => {
    const patients = storageService.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    storageService.savePatients(filtered);
  },

  getDoctors: (): string[] => {
    const data = localStorage.getItem(DOCTORS_KEY);
    return data ? JSON.parse(data) : DEFAULT_DOCTORS;
  },

  saveDoctors: (doctors: string[]) => {
    localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
  }
};
