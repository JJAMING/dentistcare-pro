
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Calendar,
  User,
  Phone,
  MessageSquare,
  Wallet,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  Clipboard,
  ClipboardList,
  MapPin,
  Edit3,
  Settings,
  X,
  UserCheck,
  Check,
  CreditCard,
  Bell
} from 'lucide-react';
import { Patient, Treatment, Payment, TreatmentMemo } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { dentwebService } from '../services/dentwebService';
import { RefreshCw, Link as LinkIcon, BadgeDollarSign } from 'lucide-react';

interface PatientDetailProps {
  onRefresh: () => void;
}

const VISIT_PATHS = ['업체', '아파트', '소개', '가족', '단체 및 협회', '기타'];

const PatientDetail: React.FC<PatientDetailProps> = ({ onRefresh }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNew = id === 'new';

  const [patient, setPatient] = useState<Patient>({
    id: crypto.randomUUID(),
    chartNumber: '',
    name: '',
    phone: '',
    birthDate: '',
    gender: undefined,
    registrationDate: new Date().toISOString().split('T')[0],
    lastVisit: new Date().toISOString().split('T')[0],
    nextRecallDate: '',
    nextRecallContent: '',
    visitPath: '',
    visitPathDetail: '',
    treatments: [],
    status: 'active',
    completedRecallDates: []
  });

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<string[]>(storageService.getDoctors());
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  /** 삭제 확인 모달 */
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const askConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  /** 진료 내역 편집 상태 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  /** 수납 내역 편집 상태 */
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState('');
  const [editingPaymentDate, setEditingPaymentDate] = useState('');
  const [editingPaymentNote, setEditingPaymentNote] = useState('');

  // 📝 메모 편집 상태 추가
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoDate, setEditingMemoDate] = useState('');
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const [newMemoDate, setNewMemoDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMemoContent, setNewMemoContent] = useState('');


  useEffect(() => {
    if (!isNew && id) {
      const found = storageService.getPatients().find(p => p.id === id);
      if (found) {
        setPatient({
          ...found,
          completedRecallDates: found.completedRecallDates || []
        });
      }
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) return;
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isNew]);

  const processImageFile = async (file: File) => {
    setIsOcrLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await geminiService.extractPatientInfoFromImage(base64, file.type);
      if (result) {
        setPatient(prev => ({
          ...prev,
          chartNumber: result.chartNumber || prev.chartNumber,
          name: result.name || prev.name,
          phone: result.phone || prev.phone,
          birthDate: result.birthDate || prev.birthDate,
          gender: result.gender as any
        }));
      } else {
        alert('이미지 분석에 실패했습니다. 직접 입력해주세요.');
      }
      setIsOcrLoading(false);
    };
    reader.readAsDataURL(file);
  };

  /**
   * 덴트웹 동기화: 차트번호로 최신 예약 정보를 가져와 저장
   */
  const handleDentwebSync = async () => {
    if (!patient.chartNumber) return;
    setIsSyncing(true);
    setSyncMessage(null);
    const result = await dentwebService.syncPatientFromDentweb(patient.chartNumber);
    if (result.success) {
      const today = new Date().toISOString().split('T')[0];
      // 덴트웹에 예약이 없다면(nextRecallDate가 빈 값이라면): 리콜 미설정으로 분류되도록 recallExcluded=false
      const updated = {
        ...patient,
        lastVisit: result.isVisitedToday ? today : (result.lastVisitDate ?? patient.lastVisit),
        nextRecallDate: result.nextRecallDate ?? patient.nextRecallDate,
        nextRecallContent: result.nextRecallContent ?? patient.nextRecallContent,
        ...(result.nextRecallDate === '' ? { recallExcluded: false } : {}),
      };
      setPatient(updated);
      storageService.updatePatient(updated);
      onRefresh();
      setSyncMessage(result.message);
      // 3초 후 메시지 숨김
      setTimeout(() => setSyncMessage(null), 4000);
    } else {
      setSyncMessage(`⚠️ ${result.message}`);
      setTimeout(() => setSyncMessage(null), 4000);
    }
    setIsSyncing(false);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = () => {
    if (!patient.name || !patient.chartNumber) {
      alert('이름과 차트번호는 필수입니다.');
      return;
    }

    if (isNew) {
      // 신규 환자 저장 시 firstVisit이 없으면 registrationDate로 자동 설정
      // → 진료 내역 없이 등록한 환자도 대시보드 주간/월간 내원경로 분석에 즉시 반영됨
      const patientToSave = {
        ...patient,
        firstVisit: patient.firstVisit || patient.registrationDate
      };
      storageService.addPatient(patientToSave);
      onRefresh();
      navigate('/patients', { state: { viewMode: 'newMonthly' } });
      return;
    } else {
      storageService.updatePatient(patient);
    }

    onRefresh();
    navigate('/patients');
  };

  const handleCompleteRecall = () => {
    if (!patient.nextRecallDate) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedPatient = {
      ...patient,
      completedRecallDates: [...(patient.completedRecallDates || []), patient.nextRecallDate],
      lastVisit: todayStr,
      nextRecallDate: '',
      nextRecallContent: ''
    };
    setPatient(updatedPatient);
    storageService.updatePatient(updatedPatient);
    onRefresh();
    alert('리콜이 완료 처리되었습니다.');
  };

  const handleUnsetRecall = () => {
    const updatedPatient = {
      ...patient,
      nextRecallDate: '',
      nextRecallContent: '',
      recallExcluded: false // 수동으로 지웠으므로 리콜 미설정 탭에 보임
    };
    setPatient(updatedPatient);
    storageService.updatePatient(updatedPatient);
    onRefresh();
    alert('다음 리콜 일정이 초기화되어 미설정 목록으로 이동되었습니다.');
  };

  const handleAddToRecallUnset = () => {
    const updatedPatient = { ...patient, recallExcluded: false };
    setPatient(updatedPatient);
    storageService.updatePatient(updatedPatient);
    onRefresh();
    alert(`${patient.name} 환자가 리콜 미설정 목록에 다시 추가되었습니다.`);
  };

  const addTreatment = () => {
    const newId = crypto.randomUUID();
    const todayStr = new Date().toISOString().split('T')[0];
    const newTreatment: Treatment = {
      id: newId,
      date: todayStr,
      content: '',
      doctor: doctors[0] || '의사미지정',
      estimatedAmount: '',
      isAgreed: null,
      payments: [],
      memos: []
    };

    const isFirstTreatment = patient.treatments.length === 0;

    setPatient({
      ...patient,
      treatments: [newTreatment, ...patient.treatments],
      lastVisit: todayStr,
      ...(isFirstTreatment && !patient.firstVisit ? { firstVisit: todayStr } : {})
    });
    // 신규 추가 시 바로 편집 모드
    setEditingId(newId);
    setEditingContent('');
  };

  const updateTreatment = (tid: string, field: keyof Treatment, value: any) => {
    const newTreatments = patient.treatments.map(t =>
      t.id === tid ? { ...t, [field]: value } : t
    );

    let updatedFirstVisit = patient.firstVisit;
    let updatedLastVisit = patient.lastVisit;
    // 날짜가 변경되었고, 환자에게 진료 내역이 존재하는 경우
    if (field === 'date' && newTreatments.length > 0) {
      // 모든 진료 내역의 날짜 중 가장 빠른 날짜(firstVisit)와 가장 늦은 날짜(lastVisit)를 찾습니다
      const sortedDates = [...newTreatments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      updatedFirstVisit = sortedDates[0].date;
      updatedLastVisit = sortedDates[sortedDates.length - 1].date;
    }

    setPatient({
      ...patient,
      treatments: newTreatments,
      firstVisit: updatedFirstVisit,
      lastVisit: updatedLastVisit
    });
  };

  const addDoctor = () => {
    if (!newDoctorName.trim()) return;
    if (doctors.includes(newDoctorName.trim())) {
      alert('이미 등록된 이름입니다.');
      return;
    }
    const updatedDoctors = [...doctors, newDoctorName.trim()];
    setDoctors(updatedDoctors);
    storageService.saveDoctors(updatedDoctors);
    setNewDoctorName('');
  };

  const removeDoctor = (name: string) => {
    const updatedDoctors = doctors.filter(d => d !== name);
    setDoctors(updatedDoctors);
    storageService.saveDoctors(updatedDoctors);
  };

  const age = calculateAge(patient.birthDate);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] flex flex-col pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          {/* 덴트웹 연동 환자 전용 동기화 버튼 */}
          {!isNew && patient.isLinked && patient.externalId?.startsWith('DW-') && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {syncMessage && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${syncMessage.startsWith('⚠️')
                  ? 'bg-red-50 text-red-500 border border-red-100'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                  {syncMessage}
                </span>
              )}
              <button
                onClick={handleDentwebSync}
                disabled={isSyncing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all border border-blue-200 text-[10px] sm:text-xs disabled:opacity-60"
                title="덴트웹에서 최신 예약 정보 가져오기"
              >
                {isSyncing
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <LinkIcon className="w-3.5 h-3.5" />
                }
                {isSyncing ? '동기화...' : '덴트웹'}
              </button>
            </div>
          )}
          {!isNew && !patient.nextRecallDate && patient.recallExcluded === true && (
            <button
              onClick={handleAddToRecallUnset}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition-all border border-amber-200 text-[10px] sm:text-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              미설정으로
            </button>
          )}
          {/* 리콜일이 있을 때, '완료'와 '미설정' 액션 제공 */}
          {patient.nextRecallDate && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleUnsetRecall}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all border border-slate-200 text-[10px] sm:text-xs"
              >
                <X className="w-3.5 h-3.5" />
                미설정
              </button>
              <button
                onClick={handleCompleteRecall}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-200 transition-all border border-emerald-200 text-[10px] sm:text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                완료
              </button>
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            저장하기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        <div className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col items-center text-center space-y-2 relative">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 relative overflow-hidden ring-4 ring-slate-50">
                {isOcrLoading ? (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : null}
                <User className="w-10 h-10" />
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">{patient.name || '새 환자'}</h3>
                  {patient.gender && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${patient.gender === '남' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                      {patient.gender}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>#{patient.chartNumber || '미지정'}</span>
                  {age !== null && (
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-bold">만 {age}세</span>
                  )}
                </div>
              </div>

              {isNew && (
                <div className="w-full mt-4 p-3 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-xl group hover:border-indigo-400 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processImageFile(file);
                      e.target.value = '';
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                      {isOcrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clipboard className="w-3 h-3" />}
                      <span>이미지 붙여넣기 또는 클릭</span>
                    </div>
                    <p className="text-[10px] text-indigo-400 font-medium">신분증/차트 이미지 자동 분석</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-3 border-t border-slate-100 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">차트번호</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  value={patient.chartNumber}
                  onChange={e => setPatient({ ...patient, chartNumber: e.target.value })}
                  placeholder="예: 24-00001"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">환자 성함</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-sm"
                  value={patient.name}
                  onChange={e => setPatient({ ...patient, name: e.target.value })}
                  placeholder="환자 성함"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">성별</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 w-full box-border">
                  {(['남', '여'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPatient({ ...patient, gender: g })}
                      className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${patient.gender === g
                        ? g === '남' ? 'bg-blue-600 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">내원경로</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none font-bold text-slate-700"
                    value={VISIT_PATHS.includes(patient.visitPath || '') ? patient.visitPath : '기타'}
                    onChange={e => {
                      const val = e.target.value;
                      setPatient({ ...patient, visitPath: val });
                    }}
                  >
                    <option value="" disabled>내원경로 선택</option>
                    {VISIT_PATHS.map(path => (
                      <option key={path} value={path}>{path}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-1.5 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">상세 내원 경로</label>
                  <div className="relative">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      value={patient.visitPathDetail || ''}
                      onChange={e => setPatient({ ...patient, visitPathDetail: e.target.value })}
                      placeholder="상세 내용을 입력하세요 (예: 래미안 1단지, 홍길동님 등)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">연락처</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    value={patient.phone}
                    onChange={e => setPatient({ ...patient, phone: e.target.value })}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">생년월일</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={patient.birthDate}
                  onChange={e => setPatient({ ...patient, birthDate: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">다음 리콜일</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    className="w-full bg-blue-50/50 border border-blue-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-blue-700 font-bold"
                    value={patient.nextRecallDate}
                    onChange={e => setPatient({ ...patient, nextRecallDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">예약 메모</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm focus:bg-white transition-all"
                    value={patient.nextRecallContent}
                    onChange={e => setPatient({ ...patient, nextRecallContent: e.target.value })}
                    placeholder="진료 내용 또는 특이사항"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-base font-bold text-slate-800">진료 내역 ({patient.treatments.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDoctorModalOpen(true)}
                className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                title="원장 목록 관리"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
              </button>
              <button
                onClick={addTreatment}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                신규 진료 입력
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {patient.treatments.map((t, i) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-blue-300 transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 bg-slate-50 w-5 h-5 rounded flex items-center justify-center">#{patient.treatments.length - i}</span>
                    <input
                      type="date"
                      className="bg-slate-50 border-none text-slate-800 font-bold outline-none rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-100"
                      value={t.date}
                      onChange={e => updateTreatment(t.id, 'date', e.target.value)}
                    />
                    <select
                      className="bg-slate-50 border-none text-slate-500 text-[10px] font-bold outline-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-100 min-w-[90px]"
                      value={t.doctor}
                      onChange={e => updateTreatment(t.id, 'doctor', e.target.value)}
                    >
                      {doctors.map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                      {doctors.length === 0 && <option value="의사미지정">의사미지정</option>}
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      askConfirm(
                        `진료 내역을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
                        () => {
                          const newTreatments = patient.treatments.filter(item => item.id !== t.id);
                          setPatient({ ...patient, treatments: newTreatments });
                        }
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {editingId === t.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full bg-white border-2 border-blue-500 rounded-xl p-3 text-slate-700 outline-none min-h-[100px] text-xs leading-relaxed shadow-lg shadow-blue-50"
                      placeholder="치료 내용을 상세히 입력하세요..."
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingContent('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 font-bold text-[10px] hover:bg-slate-50 transition-all"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          updateTreatment(t.id, 'content', editingContent);
                          setEditingId(null);
                          setEditingContent('');
                        }}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-black text-[10px] hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingId(t.id);
                      setEditingContent(t.content);
                    }}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-slate-700 cursor-pointer hover:bg-white hover:border-blue-200 transition-all group/content min-h-[60px]"
                  >
                    {t.content ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed font-medium">{t.content}</p>
                    ) : (
                      <p className="text-slate-400 text-xs italic">치료 내용을 입력하려면 클릭하세요...</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/content:opacity-100 transition-opacity text-[9px] text-blue-400 font-bold">
                      <Plus className="w-2.5 h-2.5" />
                      내용 수정하기
                    </div>
                  </div>
                )}

                {/* ── 견적 금액 + 치료 동의 */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">견적 금액</label>
                    <div className="relative">
                      <Wallet className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black text-slate-700"
                        value={t.estimatedAmount ? Number(t.estimatedAmount.replace(/[^0-9]/g, '')).toLocaleString() : ''}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updateTreatment(t.id, 'estimatedAmount', raw);
                        }}
                        placeholder="₩ 0"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">치료 동의 여부</label>
                    <div className="flex items-center gap-1.5 h-[32px]">
                      <button
                        onClick={() => updateTreatment(t.id, 'isAgreed', true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-black transition-all ${t.isAgreed === true
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        동의
                      </button>
                      <button
                        onClick={() => updateTreatment(t.id, 'isAgreed', false)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-black transition-all ${t.isAgreed === false
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                      >
                        <ThumbsDown className="w-2.5 h-2.5" />
                        보류
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 수납 내역 섹션 */}
                {(() => {
                  const payments = t.payments || [];
                  // 수납 합계 (숫자 파싱, NaN 제외)
                  const totalPaid = payments.reduce((sum, p) => {
                    const n = parseFloat(p.amount.replace(/[^0-9.]/g, ''));
                    return sum + (isNaN(n) ? 0 : n);
                  }, 0);
                  const estimated = parseFloat((t.estimatedAmount || '').replace(/[^0-9.]/g, ''));
                  const remaining = isNaN(estimated) ? null : estimated - totalPaid;

                  const addPayment = () => {
                    const newId = crypto.randomUUID();
                    const newDate = new Date().toISOString().split('T')[0];
                    const newPayment: Payment = {
                      id: newId,
                      amount: '',
                      date: newDate,
                      note: ''
                    };
                    updateTreatment(t.id, 'payments', [...payments, newPayment]);
                    // 신규 수납 추가 시 바로 편집 모드 진입
                    setEditingPaymentId(newId);
                    setEditingPaymentAmount('');
                    setEditingPaymentDate(newDate);
                    setEditingPaymentNote('');
                  };

                  const updatePayment = (pid: string, field: keyof Payment, val: string) => {
                    const updated = payments.map(p => p.id === pid ? { ...p, [field]: val } : p);
                    updateTreatment(t.id, 'payments', updated);
                  };

                  const removePayment = (pid: string) => {
                    updateTreatment(t.id, 'payments', payments.filter(p => p.id !== pid));
                  };

                  return (
                    <div className="space-y-2 pt-1">
                      {/* 헤더 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-indigo-400" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">수납 내역</span>
                          {payments.length > 0 && (
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                              수납 {totalPaid.toLocaleString()}원
                            </span>
                          )}
                        </div>
                        <button
                          onClick={addPayment}
                          className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          수납 추가
                        </button>
                      </div>

                      {/* 수납 항목 리스트 */}
                      {payments.map((p) => {
                        const isEditing = editingPaymentId === p.id;

                        const savePayment = () => {
                          const updated = payments.map(item =>
                            item.id === p.id
                              ? { ...item, amount: editingPaymentAmount, date: editingPaymentDate, note: editingPaymentNote }
                              : item
                          );
                          updateTreatment(t.id, 'payments', updated);
                          setEditingPaymentId(null);
                        };

                        const handleKeyDown = (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            savePayment();
                          } else if (e.key === 'Escape') {
                            setEditingPaymentId(null);
                          }
                        };

                        return (
                          <div key={p.id} className="flex items-center gap-2 bg-indigo-50/50 rounded-xl px-3 py-2 border border-indigo-100 group">
                            <CreditCard className="w-3 h-3 text-indigo-300 shrink-0" />
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  className="flex-1 bg-white border-2 border-indigo-400 rounded-lg px-2 py-1 text-xs font-black text-indigo-700 outline-none shadow-sm min-w-[80px]"
                                  placeholder="₩ 수납금액"
                                  autoFocus
                                  value={editingPaymentAmount ? Number(editingPaymentAmount.replace(/[^0-9]/g, '')).toLocaleString() : ''}
                                  onChange={e => setEditingPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                  onKeyDown={handleKeyDown}
                                />
                                <input
                                  type="date"
                                  className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                                  value={editingPaymentDate}
                                  onChange={e => setEditingPaymentDate(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                />
                                <input
                                  type="text"
                                  className="w-20 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-[10px] text-slate-500 outline-none"
                                  placeholder="비고"
                                  value={editingPaymentNote}
                                  onChange={e => setEditingPaymentNote(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setEditingPaymentId(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={savePayment}
                                    className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-all shadow-sm"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div
                                  onClick={() => {
                                    setEditingPaymentId(p.id);
                                    setEditingPaymentAmount(p.amount);
                                    setEditingPaymentDate(p.date);
                                    setEditingPaymentNote(p.note || '');
                                  }}
                                  className="flex-1 flex items-center gap-2 cursor-pointer group/pay"
                                >
                                  <span className="flex-1 text-xs font-black text-indigo-700">
                                    {p.amount ? Number(p.amount.replace(/[^0-9]/g, '')).toLocaleString() : '0'}원
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-indigo-50">
                                    {p.date}
                                  </span>
                                  {p.note && (
                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[60px]">
                                      {p.note}
                                    </span>
                                  )}
                                  <Plus className="w-2.5 h-2.5 text-indigo-300 opacity-0 group-hover/pay:opacity-100 transition-opacity" />
                                </div>
                                {/* 삭제 버튼 */}
                                <button
                                  onClick={() =>
                                    askConfirm(
                                      `수납 내역을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
                                      () => removePayment(p.id)
                                    )
                                  }
                                  className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* 잔액 표시 */}
                      {remaining !== null && (
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${remaining === 0
                          ? 'bg-emerald-50 border-emerald-100'
                          : remaining > 0
                            ? 'bg-amber-50 border-amber-100'
                            : 'bg-red-50 border-red-100'
                          }`}>
                          <div className="flex items-center gap-1.5">
                            <BadgeDollarSign className={`w-3 h-3 ${remaining === 0 ? 'text-emerald-500' : remaining > 0 ? 'text-amber-500' : 'text-red-500'
                              }`} />
                            <span className="text-[9px] font-bold text-slate-500">잔액</span>
                          </div>
                          <span className={`text-xs font-black ${remaining === 0 ? 'text-emerald-600' : remaining > 0 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                            {remaining === 0 ? '✅ 완납' : `${remaining > 0 ? '' : '-'}₩${Math.abs(remaining).toLocaleString()}`}
                          </span>
                        </div>
                      )}

                      {/* 📝 진료 메모 섹션 고도화 */}
                      <div className="space-y-3 pt-2 border-t border-slate-100 mt-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            진료 메모 ({(t.memos || ((t as any).memo ? [1] : [])).length})
                          </label>
                        </div>

                        {/* 메모 리스트 */}
                        <div className="space-y-2">
                          {(() => {
                            const currentMemos: TreatmentMemo[] = t.memos || ((t as any).memo ? [{ id: 'legacy', date: t.date, content: (t as any).memo }] : []);
                            return currentMemos.map((m) => {
                              const isEditingMemo = editingMemoId === m.id;
                              return (
                                <div key={m.id} className="group/memo bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 hover:border-blue-200 transition-all">
                                  {isEditingMemo ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <input
                                          type="date"
                                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-400"
                                          value={editingMemoDate}
                                          onChange={e => setEditingMemoDate(e.target.value)}
                                        />
                                      </div>
                                      <textarea
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 min-h-[60px] resize-none"
                                        value={editingMemoContent}
                                        onChange={e => setEditingMemoContent(e.target.value)}
                                      />
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          onClick={() => setEditingMemoId(null)}
                                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 font-bold text-[10px] hover:bg-slate-100 transition-all"
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() => {
                                            const updatedMemos = currentMemos.map(item =>
                                              item.id === m.id ? { ...item, date: editingMemoDate, content: editingMemoContent } : item
                                            );
                                            updateTreatment(t.id, 'memos', updatedMemos);
                                            setEditingMemoId(null);
                                          }}
                                          className="px-3 py-1 bg-blue-600 text-white rounded-lg font-black text-[10px] hover:bg-blue-700 transition-all shadow-sm"
                                        >
                                          수정 완료
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                          {m.date}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/memo:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setEditingMemoId(m.id);
                                              setEditingMemoDate(m.date);
                                              setEditingMemoContent(m.content);
                                            }}
                                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              askConfirm('이 메모를 삭제할까요?', () => {
                                                const filteredMemos = currentMemos.filter(item => item.id !== m.id);
                                                updateTreatment(t.id, 'memos', filteredMemos);
                                              });
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                        {m.content}
                                      </p>
                                    </>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* 새 메모 추가 입력창 */}
                        <div className="bg-blue-50/30 border border-dashed border-blue-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="date"
                              className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-400"
                              value={newMemoDate}
                              onChange={e => setNewMemoDate(e.target.value)}
                            />
                            <span className="text-[9px] font-bold text-blue-400 tracking-tighter">새 메모 추가</span>
                          </div>
                          <textarea
                            className="w-full bg-white border border-blue-100 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none leading-relaxed placeholder:text-blue-200"
                            rows={2}
                            placeholder="메모 내용을 입력하세요..."
                            value={newMemoContent}
                            onChange={e => setNewMemoContent(e.target.value)}
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                if (!newMemoContent.trim()) return;
                                const currentMemos = t.memos || ((t as any).memo ? [{ id: crypto.randomUUID(), date: t.date, content: (t as any).memo }] : []);
                                const newMemoItem: TreatmentMemo = {
                                  id: crypto.randomUUID(),
                                  date: newMemoDate,
                                  content: newMemoContent
                                };
                                updateTreatment(t.id, 'memos', [...currentMemos, newMemoItem]);
                                setNewMemoContent('');
                                setNewMemoDate(new Date().toISOString().split('T')[0]);
                              }}
                              disabled={!newMemoContent.trim()}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl font-black text-[10px] hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                            >
                              메모 추가
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>


            ))}
            {patient.treatments.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center text-slate-400">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-bold">입력된 진료 내역이 없습니다.</p>
                <p className="text-sm mt-1">상담 내용이나 치료 과정을 기록해주세요.</p>
                <button
                  onClick={addTreatment}
                  className="mt-6 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-black text-sm hover:bg-slate-50 transition-all shadow-sm"
                >
                  기록 시작하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 원장 관리 모달 */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-xl shadow-lg">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-black text-slate-900">원장 목록 관리</h3>
              </div>
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="추가할 원장명"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={newDoctorName}
                  onChange={e => setNewDoctorName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDoctor()}
                />
                <button
                  onClick={addDoctor}
                  className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {doctors.map(doc => (
                  <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    <span className="text-sm font-bold text-slate-700">{doc}</span>
                    <button
                      onClick={() => removeDoctor(doc)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-center py-8 text-slate-400 text-xs font-medium">등록된 원장이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6 w-80 max-w-[90vw] space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-50 rounded-full">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-sm whitespace-pre-line">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-200"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
