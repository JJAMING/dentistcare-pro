
export type UserRole = '의사' | '치위생사' | '데스크' | '경영지원';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface Treatment {
  id: string;
  date: string;
  content: string;
  doctor: string;
  notes?: string;
  estimatedAmount?: string; 
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
  externalId?: string; // 외부 시스템 연동용 ID
  isLinked?: boolean;  // 연동 여부 상태
}

export interface RecallNotification {
  id: string;
  patientId: string;
  patientName: string;
  chartNumber: string;
  recallDate: string;
  isRead: boolean;
}
