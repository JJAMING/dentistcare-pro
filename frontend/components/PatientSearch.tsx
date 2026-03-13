
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Link as LinkIcon,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ClipboardList
} from 'lucide-react';
import { Patient } from '../types';
import { storageService } from '../services/storageService';
import { dentwebService, DentwebPatientRaw, DentwebAppointment } from '../services/dentwebService';

interface PatientSearchProps {
  patients: Patient[];
  onRefresh: () => void;
}

/** HHmm -> HH:mm */
function formatTime(t: string) {
  if (!t || t.length < 4) return '';
  return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
}

const PatientSearch: React.FC<PatientSearchProps> = ({ patients, onRefresh }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [dentwebResults, setDentwebResults] = useState<DentwebPatientRaw[]>([]);
  const [isSearchingDentweb, setIsSearchingDentweb] = useState(false);
  // 예약 정보 캐시: patientId -> DentwebAppointment
  const [appointmentMap, setAppointmentMap] = useState<Record<number, DentwebAppointment>>({});

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const lq = query.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.chartNumber.toLowerCase().includes(lq) ||
      p.phone.includes(lq)
    );
  }, [patients, query]);

  // 검색어 변경 시 덴트웹 검색 실행
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setDentwebResults([]);
      setAppointmentMap({});
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDentweb(true);
      const results = await dentwebService.searchPatients(query);
      setDentwebResults(results);
      setIsSearchingDentweb(false);

      // 각 환자의 다음 예약 정보 조회
      const apptEntries = await Promise.all(
        results.map(async p => {
          const appt = await dentwebService.getNextAppointment(p.patientId);
          return [p.patientId, appt] as [number, DentwebAppointment];
        })
      );
      setAppointmentMap(Object.fromEntries(apptEntries));
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  /** 덴트웹 환자 가져오기 */
  const handleImportFromDentweb = async (raw: DentwebPatientRaw) => {
    setLinkingId(`dw-${raw.patientId}`);

    const currentPatients = storageService.getPatients();
    if (currentPatients.some(p => p.chartNumber === raw.chartNumber)) {
      alert('이미 같은 차트 번호의 환자가 등록되어 있습니다.');
      setLinkingId(null);
      return;
    }

    // 예약 정보 가져오기 (캐시 or 신규 조회)
    let appt = appointmentMap[raw.patientId];
    if (!appt) {
      appt = await dentwebService.getNextAppointment(raw.patientId);
    }

    const newPatient: Patient = {
      id: crypto.randomUUID(),
      chartNumber: raw.chartNumber,
      name: raw.name,
      phone: raw.phone || '',
      // 1. 생년월일 → 덴트웹 birthDate 사용 (YYYY-MM-DD 형식)
      birthDate: raw.birthDate || '',
      gender: raw.gender,
      registrationDate: new Date().toISOString().split('T')[0],
      lastVisit: raw.lastVisitDate
        ? `${raw.lastVisitDate.substring(0, 4)}-${raw.lastVisitDate.substring(4, 6)}-${raw.lastVisitDate.substring(6, 8)}`
        : '',
      // 2. 다음 리콜일 → 덴트웹 예약일 사용
      nextRecallDate: appt.hasAppointment ? (appt.appointmentDate || '') : '',
      // 3. 예약 메모 → 덴트웹 예약내용 사용
      nextRecallContent: appt.hasAppointment
        ? [appt.appointmentContent, appt.memo].filter(Boolean).join(' / ')
        : '',
      treatments: [],
      status: 'active',
      completedRecallDates: [],
      isLinked: true,
      externalId: `DW-${raw.chartNumber}`,
      recallExcluded: false // 덴트웹 연동 기반으로 가져왔을 때 기본적으로 미설정 탭에 노출 (예약이 없으면)
    };

    storageService.savePatients([...currentPatients, newPatient]);
    onRefresh();
    setLinkingId(null);

    const apptMsg = appt.hasAppointment
      ? `\n📅 다음 예약: ${appt.appointmentDate} ${formatTime(appt.appointmentTime || '')}${appt.appointmentContent ? `\n📋 예약내용: ${appt.appointmentContent}` : ''}`
      : '';
    alert(`✅ 덴트웹 환자(${raw.name})를 성공적으로 가져왔습니다.${apptMsg}`);
  };

  /** 로컬 환자 연동 */
  const handleLink = (id: string) => {
    setLinkingId(id);
    setTimeout(() => {
      const updated = storageService.getPatients().map(p =>
        p.id === id
          ? { ...p, isLinked: true, externalId: `EXT-${Math.random().toString(36).substr(2, 9).toUpperCase()}` }
          : p
      );
      storageService.savePatients(updated);
      onRefresh();
      setLinkingId(null);
      alert('외부 시스템과 환자 정보가 성공적으로 연동되었습니다.');
    }, 1200);
  };

  /** 덴트웹 결과에서 이미 로컬에 있는 환자는 제외 */
  const newDentwebResults = dentwebResults.filter(
    dw => !patients.some(p => p.chartNumber === dw.chartNumber)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">환자 연동 시스템</h2>
        <p className="text-slate-500 font-medium">덴트웹 및 외부 프로그램과 환자 정보를 매칭하고 관리합니다.</p>
      </div>

      {/* 검색창 */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-6 h-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          className="w-full bg-white border-2 border-slate-200 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold outline-none focus:border-blue-500 shadow-xl shadow-slate-200/50 transition-all placeholder:text-slate-300"
          placeholder="이름, 차트번호, 전화번호로 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute inset-y-0 right-6 flex items-center text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* 로컬 환자 검색 결과 */}
        {localResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-widest">현재 앱 환자</h4>
            {localResults.map(p => (
              <PatientCard
                key={p.id}
                name={p.name}
                chartNumber={p.chartNumber}
                phone={p.phone}
                birthDate={p.birthDate}
                gender={p.gender}
                isLinked={p.isLinked}
                isDentwebResult={false}
                isLinking={linkingId === p.id}
                onLink={() => handleLink(p.id)}
                onView={() => navigate(`/patient/${p.id}`)}
              />
            ))}
          </div>
        )}

        {/* 덴트웹 검색 결과 */}
        {(newDentwebResults.length > 0 || isSearchingDentweb) && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between ml-2">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" />
                덴트웹 검색 결과
              </h4>
              {isSearchingDentweb && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
            </div>
            {newDentwebResults.map(dw => {
              const appt = appointmentMap[dw.patientId];
              return (
                <DentwebCard
                  key={dw.patientId}
                  patient={dw}
                  appointment={appt}
                  isLinking={linkingId === `dw-${dw.patientId}`}
                  onImport={() => handleImportFromDentweb(dw)}
                />
              );
            })}
          </div>
        )}

        {/* 안내 카드 (검색 전) */}
        {!query && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 space-y-4">
              <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <LinkIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-black text-slate-800">덴트웹 연동 안내</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                검색창에 환자 이름을 입력하면 덴트웹 DB에서 실시간으로 검색합니다. '가져오기'를 클릭하면 생년월일, 다음 예약일, 예약내용이 자동으로 등록됩니다.
              </p>
            </div>
            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 space-y-4">
              <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-black text-slate-800">데이터 무결성 검사</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                연동 시 중복 차트번호를 자동으로 확인하여 오등록을 방지합니다. 이미 등록된 환자는 덴트웹 결과에서 자동으로 제외됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {query && localResults.length === 0 && newDentwebResults.length === 0 && !isSearchingDentweb && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 font-black text-lg">검색 결과가 없습니다.</p>
            <p className="text-slate-300 text-sm mt-1">이름이나 차트번호가 정확한지 확인해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PatientCard: 로컬 앱 환자 카드
// ─────────────────────────────────────────────────────────────────────────────
interface PatientCardProps {
  name: string;
  chartNumber: string;
  phone: string;
  birthDate: string;
  gender?: string;
  isLinked?: boolean;
  isDentwebResult: boolean;
  isLinking: boolean;
  onLink: () => void;
  onView: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  name, chartNumber, phone, birthDate, gender, isLinked, isLinking, onLink, onView
}) => (
  <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6 hover:border-blue-300 transition-all hover:shadow-lg group">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
      {name[0]}
    </div>
    <div className="flex-1 min-w-0 space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xl font-black text-slate-800">{name}</h3>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">#{chartNumber}</span>
        {isLinked
          ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100"><ShieldCheck className="w-3 h-3" />연동됨</span>
          : <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">미연동</span>
        }
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{phone}</span>
        {birthDate && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{birthDate}{gender ? ` (${gender})` : ''}</span>}
      </div>
    </div>
    <div className="flex items-center gap-3 w-full md:w-auto">
      {!isLinked && (
        <button onClick={onLink} disabled={isLinking}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg disabled:opacity-50">
          {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
          연동하기
        </button>
      )}
      {isLinked && (
        <button disabled className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black text-sm">
          <CheckCircle2 className="w-4 h-4" />연동 완료
        </button>
      )}
      <button onClick={onView} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900 hover:border-slate-300 transition-all">
        <ExternalLink className="w-5 h-5" />
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DentwebCard: 덴트웹 환자 카드 (예약 정보 포함)
// ─────────────────────────────────────────────────────────────────────────────
interface DentwebCardProps {
  patient: DentwebPatientRaw;
  appointment?: DentwebAppointment;
  isLinking: boolean;
  onImport: () => void;
}

const DentwebCard: React.FC<DentwebCardProps> = ({ patient, appointment, isLinking, onImport }) => (
  <div className="bg-blue-50/20 rounded-[2rem] border border-blue-100 p-6 flex flex-col md:flex-row items-start gap-6 hover:border-blue-300 transition-all hover:shadow-lg group">
    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center font-black text-blue-500 text-xl group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
      {patient.name[0]}
    </div>
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xl font-black text-slate-800">{patient.name}</h3>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">#{patient.chartNumber}</span>
        <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
          <LinkIcon className="w-3 h-3" />덴트웹
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
        {patient.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{patient.phone}</span>}
        {patient.birthDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            생년월일: {patient.birthDate} ({patient.gender})
          </span>
        )}
      </div>
      {/* 예약 정보 표시 */}
      {appointment?.hasAppointment && (
        <div className="mt-2 bg-white border border-blue-100 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <ClipboardList className="w-3.5 h-3.5" />
            다음 예약
          </div>
          <p className="text-sm font-bold text-slate-700">
            📅 {appointment.appointmentDate} {formatTime(appointment.appointmentTime || '')}
          </p>
          {(appointment.appointmentContent || appointment.memo) && (
            <p className="text-xs text-slate-500 leading-relaxed">
              📋 {[appointment.appointmentContent, appointment.memo].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
      )}
      {appointment && !appointment.hasAppointment && (
        <p className="text-xs text-slate-400 mt-1">다음 예약 없음</p>
      )}
    </div>
    <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0 mt-2 md:mt-0">
      <button onClick={onImport} disabled={isLinking}
        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
        {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
        가져오기
      </button>
    </div>
  </div>
);

export default PatientSearch;
