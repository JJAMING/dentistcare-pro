import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch, query, collection, where, getDocs } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { Patient, User } from '../types';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const firebaseService = {
  /**
   * 로컬 스토리지의 전체 데이터를 Firestore로 업로드 (일괄 동기화)
   */
  syncToCloud: async (patients: Patient[], doctors: string[], clinicId: string) => {
    try {
      const batch = writeBatch(db);

      // 1. 환자 데이터 업로드 (ID를 문서 키로 사용)
      patients.forEach((patient) => {
        const patientRef = doc(db, 'patients', patient.id);
        batch.set(patientRef, { 
            ...patient, 
            clinicId: clinicId // 현재 로그안한 치과의 고유 ID 사용
        });
      });

      // 2. 원장 목록 업로드
      const configRef = doc(db, 'config', 'doctors');
      batch.set(configRef, { list: doctors, updatedAt: new Date().toISOString() });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Cloud Sync error:', error);
      throw error;
    }
  },

  /**
   * Firestore에서 해당 치과의 전체 데이터를 가져오고 로컬 스토리지에 병합
   */
  fetchFromCloud: async (clinicId: string) => {
    try {
      const q = query(collection(db, 'patients'), where('clinicId', '==', clinicId));
      const querySnapshot = await getDocs(q);
      const patients: Patient[] = [];
      querySnapshot.forEach((doc) => {
        patients.push({ ...doc.data(), id: doc.id } as Patient);
      });
      return patients;
    } catch (error) {
      console.error('Cloud Fetch error:', error);
      throw error;
    }
  }
};
