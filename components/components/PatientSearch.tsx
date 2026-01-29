
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Link as LinkIcon, 
  User, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Clipboard,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Patient } from '../types';
import { storageService } from '../services/storageService';

interface PatientSearchProps {
  patients: Patient[];
  onRefresh: () => void;
}

const PatientSearch: React.FC<PatientSearchProps> = ({ patients, onRefresh }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.chartNumber.toLowerCase().includes(lowerQuery) ||
      p.phone.includes(lowerQuery)
    );
  }, [patients, query]);

  const handleLink = (id: string) => {
    setLinkingId(id);
    // 외부 프로그램 연동 시뮬레이션 (2초 후 완료)
    setTimeout(() => {
      const updatedPatients = storageService.getPatients().map(p => {
        if (p.id === id) {
          return {
            ...p,
            isLinked: true,
            externalId: `EXT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          };
        }
        return p;
      });
      storageService.savePatients(updatedPatients);
      onRefresh();
      setLinkingId(null);
      alert('외부 시스템과 환자 정보가 성공적으로 연동되었습니다.');
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 간단한 토스트 알림을 대신함
    const btn = document.activeElement as HTMLElement;
    const originalText = btn.innerText;
    btn.innerText = '복사됨!';
    setTimeout(() => { btn.innerText = originalText; }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">환자 연동 시스템</h2>
        <p className="text-slate-500 font-medium">외부 프로그램과 환자 정보를 매칭하고 연동 상태를 관리합니다.</p>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-6 h-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input 
          type="text" 
          className="w-full bg-white border-2 border-slate-200 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold outline-none focus:border-blue-500 shadow-xl shadow-slate-200/50 transition-all placeholder:text-slate-300"
          placeholder="이름, 차트번호, 전화번호로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-6 flex items-center text-slate-400 hover:text-slate-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {searchResults.length > 0 ? (
          searchResults.map(patient => (
            <div 
              key={patient.id}
              className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-slate-100 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                {patient.name[0]}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-800">{patient.name}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">#{patient.chartNumber}</span>
                  {patient.isLinked ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter">
                      <ShieldCheck className="w-3 h-3" />
                      연동됨
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 uppercase tracking-tighter">
                      미연동
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {patient.phone}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {patient.birthDate} ({patient.gender})
                  </div>
                </div>

                {patient.externalId && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded-md font-mono">
                      EXT_ID: {patient.externalId}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(patient.externalId!)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      복사
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {!patient.isLinked ? (
                  <button 
                    onClick={() => handleLink(patient.id)}
                    disabled={linkingId === patient.id}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                  >
                    {linkingId === patient.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4" />
                    )}
                    연동하기
                  </button>
                ) : (
                  <button 
                    disabled
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    연동 완료
                  </button>
                )}
                <button 
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900 hover:border-slate-300 transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : query ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 font-black text-lg">검색 결과가 없습니다.</p>
            <p className="text-slate-300 text-sm mt-1">이름이나 차트번호가 정확한지 확인해주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 space-y-4">
              <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <LinkIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-black text-slate-800">외부 프로그램 연동 안내</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                본 검색 시스템은 외부 전자차트나 영상 진단 프로그램과의 환자 데이터 동기화를 목적으로 합니다. 검색 후 '연동하기'를 클릭하여 데이터를 매칭하세요.
              </p>
            </div>
            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 space-y-4">
              <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-black text-slate-800">데이터 무결성 검사</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                연동 시 환자의 이름, 생년월일, 성별을 자동으로 대조하여 중복 등록이나 오매칭을 방지합니다. 연동된 환자는 아이콘으로 구분됩니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientSearch;
