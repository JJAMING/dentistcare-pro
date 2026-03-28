
import { auth, db } from './firebaseService';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  AuthError
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

const SESSION_KEY = 'dentist_care_session';

/** 파이어베이스 에러 코드 한글 변환 */
const getKoreanErrorMessage = (error: any): string => {
  const code = (error as AuthError).code;
  switch (code) {
    case 'auth/email-already-in-use': return '이미 가입된 이메일 주소입니다.';
    case 'auth/invalid-email': return '유효하지 않은 이메일 형식입니다.';
    case 'auth/operation-not-allowed': return '이메일/비밀번호 인증이 활성화되지 않았습니다. 관리자에게 문의하세요.';
    case 'auth/weak-password': return '비밀번호가 너무 취약합니다. (최소 6자 이상)';
    case 'auth/user-disabled': return '비활성화된 계정입니다.';
    case 'auth/user-not-found': return '등록되지 않은 이메일입니다.';
    case 'auth/wrong-password': return '비밀번호가 일치하지 않습니다.';
    case 'auth/too-many-requests': return '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해 주세요.';
    case 'auth/network-request-failed': return '네트워크 연결이 고르지 않습니다.';
    default: return error.message || '알 수 없는 오류가 발생했습니다.';
  }
};

export const authService = {
  /**
   * 회원가입: Firebase Auth 계정 생성 + Firestore 프로필 저장
   */
  signup: async (email: string, name: string, role: UserRole, password: string, clinicName: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Firestore에 추가 프로필 정보 저장
      const newUser: User = {
        id: firebaseUser.uid,
        name,
        role,
        clinicId: `clinic_${crypto.randomUUID().slice(0, 8)}`,
        clinicName: clinicName
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, message: getKoreanErrorMessage(error) };
    }
  },

  /**
   * 로그인: Firebase Auth 로그인 + Firestore 프로필 조회
   */
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firestore에서 프로필 가져오기
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, message: '사용자 프로필 정보를 찾을 수 없습니다.' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: getKoreanErrorMessage(error) };
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
