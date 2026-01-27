
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
  gender?: '남' | '여'; // 성별 필드 추가
  registrationDate: string; 
  lastVisit: string;
  nextRecallDate: string;
  nextRecallContent: string; 
  treatments: Treatment[];
  status: 'active' | 'inactive';
  completedRecallDates: string[]; 
}

export interface RecallNotification {
  id: string;
  patientId: string;
  patientName: string;
  chartNumber: string;
  recallDate: string;
  isRead: boolean;
}
