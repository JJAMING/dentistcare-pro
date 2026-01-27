
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
  Edit3
} from 'lucide-react';
import { Patient, Treatment } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';

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
      storageService.addPatient(patient);
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

  const addTreatment = () => {
    const newTreatment: Treatment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      content: '',
      doctor: '대표원장',
      estimatedAmount: '',
      isAgreed: undefined
    };
    setPatient({
      ...patient,
      treatments: [newTreatment, ...patient.treatments]
    });
  };

  const updateTreatment = (tid: string, field: keyof Treatment, value: any) => {
    const newTreatments = patient.treatments.map(t => 
      t.id === tid ? { ...t, [field]: value } : t
    );
    setPatient({ ...patient, treatments: newTreatments });
  };

  const age = calculateAge(patient.birthDate);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          뒤로가기
        </button>
        <div className="flex items-center gap-3">
          {patient.nextRecallDate && (
            <button 
              onClick={handleCompleteRecall}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-200 transition-all border border-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              리콜 완료
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
            <Save className="w-4 h-4" />
            환자 정보 저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
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
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{patient.name || '새 환자'}</h3>
                  {patient.gender && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${patient.gender === '남' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                      {patient.gender}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <span>#{patient.chartNumber || '미지정'}</span>
                  {age !== null && (
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">만 {age}세</span>
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

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">차트번호</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  value={patient.chartNumber}
                  onChange={e => setPatient({...patient, chartNumber: e.target.value})}
                  placeholder="예: 24-00001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">환자 성함</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold"
                  value={patient.name}
                  onChange={e => setPatient({...patient, name: e.target.value})}
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
                      onClick={() => setPatient({...patient, gender: g})}
                      className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${
                        patient.gender === g 
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
                      setPatient({...patient, visitPath: val});
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
                      onChange={e => setPatient({...patient, visitPathDetail: e.target.value})}
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
                    onChange={e => setPatient({...patient, phone: e.target.value})}
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
                  onChange={e => setPatient({...patient, birthDate: e.target.value})}
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
                    onChange={e => setPatient({...patient, nextRecallDate: e.target.value})}
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
                    onChange={e => setPatient({...patient, nextRecallContent: e.target.value})}
                    placeholder="진료 내용 또는 특이사항"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">진료 내역 ({patient.treatments.length})</h3>
            <button 
              onClick={addTreatment}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-4 h-4" />
              신규 진료 입력
            </button>
          </div>

          <div className="space-y-4">
            {patient.treatments.map((t, i) => (
              <div key={t.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-blue-300 transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-300 bg-slate-50 w-6 h-6 rounded flex items-center justify-center">#{patient.treatments.length - i}</span>
                    <input 
                      type="date" 
                      className="bg-slate-50 border-none text-slate-800 font-black outline-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-100"
                      value={t.date}
                      onChange={e => updateTreatment(t.id, 'date', e.target.value)}
                    />
                    <select 
                      className="bg-slate-50 border-none text-slate-500 text-xs font-bold outline-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-100"
                      value={t.doctor}
                      onChange={e => updateTreatment(t.id, 'doctor', e.target.value)}
                    >
                      <option>대표원장</option>
                      <option>부원장1</option>
                      <option>교정원장</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      const newTreatments = patient.treatments.filter(item => item.id !== t.id);
                      setPatient({...patient, treatments: newTreatments});
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm leading-relaxed"
                  placeholder="치료 내용, 재료, 특이사항을 상세히 입력하세요..."
                  value={t.content}
                  onChange={e => updateTreatment(t.id, 'content', e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">견적 금액</label>
                    <div className="relative">
                      <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black text-slate-700"
                        value={t.estimatedAmount}
                        onChange={e => updateTreatment(t.id, 'estimatedAmount', e.target.value)}
                        placeholder="₩ 0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">치료 동의 여부</label>
                    <div className="flex items-center gap-2 h-[42px]">
                      <button 
                        onClick={() => updateTreatment(t.id, 'isAgreed', true)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${
                          t.isAgreed === true 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        동의
                      </button>
                      <button 
                        onClick={() => updateTreatment(t.id, 'isAgreed', false)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${
                          t.isAgreed === false 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        미동의/보류
                      </button>
                    </div>
                  </div>
                </div>
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
    </div>
  );
};

export default PatientDetail;
