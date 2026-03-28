import { Patient } from '../types';

/** 덴트웹 백엔드 서버 주소를 동적으로 가져옵니다 (설정에서 변경 가능) */
const getBaseUrl = () => {
    const saved = localStorage.getItem('DENTWEB_API_URL');
    return (saved || import.meta.env.VITE_DENTWEB_API_URL || 'http://localhost:3001').replace(/\/$/, '');
};

const getApiUrl = () => `${getBaseUrl()}/api`;

/** 덴트웹 환자 검색 결과 원형 (백엔드 반환 형태) */
export interface DentwebPatientRaw {
    patientId: number;
    chartNumber: string;
    name: string;
    phone: string;
    birthDate: string;   // 'YYYY-MM-DD' 형식으로 서버에서 변환됨
    gender: '남' | '여';
    lastVisitDate: string;
}

/** 덴트웹 예약 정보 */
export interface DentwebAppointment {
    hasAppointment: boolean;
    appointmentDate?: string;  // 'YYYY-MM-DD'
    appointmentTime?: string;  // 'HHmm'
    appointmentContent?: string;
    memo?: string;
    status?: number; // 0:예약, 1:접수 등
}

/** 동기화 결과 */
export interface DentwebSyncResult {
    success: boolean;
    message: string;
    nextRecallDate?: string;
    nextRecallContent?: string;
    lastVisitDate?: string;
    patientId?: number;
    isVisitedToday?: boolean;
    hasAppointment?: boolean;
    chartNumber?: string;
}

export const dentwebService = {
    /**
     * 환자 검색 (이름, 차트번호, 전화번호)
     */
    searchPatients: async (query: string): Promise<DentwebPatientRaw[]> => {
        if (!query || query.length < 2) return [];
        try {
            const res = await fetch(`${getApiUrl()}/dentweb/patients?query=${encodeURIComponent(query)}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            if (!res.ok) throw new Error('덴트웹 서버 연결 실패');
            return await res.json();
        } catch (err) {
            console.error('DentWeb search error:', err);
            return [];
        }
    },

    /**
     * 특정 환자의 다음 예약 정보 조회 (patientId 기반)
     */
    getNextAppointment: async (patientId: number): Promise<DentwebAppointment> => {
        try {
            const res = await fetch(`${getApiUrl()}/dentweb/appointments/${patientId}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            if (!res.ok) return { hasAppointment: false };
            return await res.json();
        } catch (err) {
            console.error('DentWeb appointment error:', err);
            return { hasAppointment: false };
        }
    },

    /**
     * 이미 연동된 환자의 덴트웹 정보 동기화 (차트번호 기반)
     * - 차트번호로 덴트웹에서 patientId를 찾고
     * - 최신 다음 예약 정보를 가져옴
     */
    syncPatientFromDentweb: async (chartNumber: string): Promise<DentwebSyncResult> => {
        try {
            // 1. 차트번호로 덴트웹 환자 검색
            const patients = await dentwebService.searchPatients(chartNumber);
            const matched = patients.find(p => p.chartNumber === chartNumber);
            if (!matched) {
                return { success: false, message: '덴트웹에서 해당 차트번호의 환자를 찾을 수 없습니다.' };
            }

            // 2. 예약 정보 조회
            const appt = await dentwebService.getNextAppointment(matched.patientId);

            const nextRecallContent = appt.hasAppointment
                ? [appt.appointmentContent, appt.memo].filter(Boolean).join(' / ')
                : '';

            const today = new Date().toISOString().split('T')[0];
            const isVisitedToday = !!(appt.hasAppointment && appt.appointmentDate === today && appt.status && appt.status > 0);

            return {
                success: true,
                message: appt.hasAppointment
                    ? `다음 예약을 불러왔습니다: ${appt.appointmentDate}`
                    : '덴트웹에 예약 내역이 없습니다.',
                nextRecallDate: appt.hasAppointment ? (appt.appointmentDate || '') : '',
                nextRecallContent,
                lastVisitDate: matched.lastVisitDate,
                patientId: matched.patientId,
                isVisitedToday,
                hasAppointment: appt.hasAppointment
            };
        } catch (err) {
            console.error('DentWeb sync error:', err);
            return { success: false, message: '덴트웹 동기화 중 오류가 발생했습니다.' };
        }
    },

    /**
     * 특정 날짜의 내원 및 예약 환자들의 덴트웹 최신 정보들 일괄 조회
     * - date: 'YYYY-MM-DD' 형식
     */
    syncDailyPatients: async (date: string): Promise<DentwebSyncResult[]> => {
        try {
            const res = await fetch(`${getApiUrl()}/dentweb/daily-sync?date=${date}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            if (!res.ok) throw new Error('덴트웹 서버 연결 실패');
            
            const rawResults = await res.json();
            const today = new Date().toISOString().split('T')[0];

            return rawResults.map((r: any) => {
                const isVisitedToday = !!(r.hasAppointment && r.appointmentDate === today && r.status > 0);
                const nextRecallContent = r.hasAppointment
                    ? [r.appointmentContent, r.memo].filter(Boolean).join(' / ')
                    : '';

                return {
                    success: true,
                    message: '성공',
                    nextRecallDate: r.hasAppointment ? (r.appointmentDate || '') : '',
                    nextRecallContent,
                    lastVisitDate: r.lastVisitDate,
                    patientId: r.patientId,
                    chartNumber: r.chartNumber,
                    isVisitedToday,
                    hasAppointment: !!r.hasAppointment
                };
            });
        } catch (err) {
            console.error('DentWeb daily-sync error:', err);
            return [];
        }
    },

    /**
     * 헬스체크
     */
    checkHealth: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${getApiUrl()}/health`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            const data = await res.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }
};
