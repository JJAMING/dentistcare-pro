import { initializeApp } from "firebase/app";
import { getFirestore, query, collection, where, getDocs } from "firebase/firestore";
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
