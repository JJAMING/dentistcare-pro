
export type UserRole = '의사' | '치위생사' | '데스크' | '경영지원';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  clinicId: string;   // 소속 치과 고유 ID
  clinicName: string; // 소속 치과 이름
}

/** 수납 내역 단일 항목 */
export interface Payment {
  id: string;
  amount: string;   // 수납 금액 (문자열, 예: "100000")
  date: string;     // 수납 날짜 'YYYY-MM-DD'
  note?: string;    // 비고
}

/** 진료 내역 메모 단일 항목 */
export interface TreatmentMemo {
  id: string;
  date: string;     // 메모 날짜 'YYYY-MM-DD'
  content: string;  // 메모 내용
}

export interface Treatment {
  id: string;
  date: string;
  content: string;
  doctor: string;
  notes?: string;
  memos?: TreatmentMemo[];  // 진료 내역 메모 (다중)
  estimatedAmount?: string;
  payments?: Payment[];   // 수납 내역 (다중)
  isAgreed?: boolean;
}

export interface Patient {
  id: string;
  chartNumber: string;
  name: string;
  phone: string;
  birthDate: string;
  gender?: '남' | '여';
  registrationDate: string;
  lastVisit: string;
  nextRecallDate: string;
  nextRecallContent: string;
  visitPath?: string;
  visitPathDetail?: string;
  treatments: Treatment[];
  status: 'active' | 'inactive';
  completedRecallDates: string[];
  externalId?: string;
  isLinked?: boolean;
  recallExcluded?: boolean;  // 리콜 미설정 탭에서 제외 여부 (환자관리에서는 유지)
  clinicId: string;          // 소속 치과 고유 ID
}


export interface RecallNotification {
  id: string;
  patientId: string;
  patientName: string;
  chartNumber: string;
  recallDate: string;
  isRead: boolean;
}
