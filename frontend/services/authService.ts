
import { auth, db } from './firebaseService';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

const SESSION_KEY = 'dentist_care_session';

export const authService = {
  /**
   * 회원가입: Firebase Auth 계정 생성 + Firestore 프로필 저장
   */
  signup: async (email: string, name: string, role: UserRole, password: string): Promise<boolean> => {
    try {
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Firestore에 추가 프로필 정보 저장
      const newUser: User = {
        id: firebaseUser.uid,
        name,
        role,
        clinicId: "baroom_dental", // 초기 가입 시 '바룸치과의원'으로 자동 할당
        clinicName: "바룸치과의원"
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  },

  /**
   * 로그인: Firebase Auth 로그인 + Firestore 프로필 조회
   */
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firestore에서 프로필 가져오기
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  /**
   * 로그아웃
   */
  logout: async () => {
    await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * 현재 주입된 세션 유저 가져오기
   */
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  /**
   * 인증 상태 변경 리스너
   */
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
          callback(userData);
        } else {
          callback(null);
        }
      } else {
        localStorage.removeItem(SESSION_KEY);
        callback(null);
      }
    });
  }
};
