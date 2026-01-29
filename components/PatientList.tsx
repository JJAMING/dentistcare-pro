
import React, { useState, useMemo, useEffect } from 'react';
import { fetchReceptionList } from '../services/dentwebService';

import { 
  Plus, 
  Download, 
  Upload, 
  Search, 
  ExternalLink,
  Trash2,
  Filter,
  MessageSquare,
  AlertTriangle,
  X,
  Calendar,
  Layers
} from 'lucide-react';
import { Patient } from '../types';
import { excelService } from '../services/excelService';
import { storageService } from '../services/storageService';

interface PatientListProps {
  patients: Patient[];
  onRefresh: () => void;
}

type ViewFilterMode = 'all' | 'daily' | 'monthly';

const PatientList: React.FC<PatientListProps> = ({ patients, onRefresh }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewFilterMode>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dentwebStatus, setDentwebStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [dentwebError, setDentwebError] = useState<string>('');
  // 삭제 모달 상태 관리
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<{id: string, name: string} | null>(null);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // 1. 검색어 필터
      const matchesSearch = p.name.includes(searchTerm) || p.chartNumber.includes(searchTerm);
      if (!matchesSearch) return false;

      // 2. 기간 필터
      if (viewMode === 'daily') {
        return p.lastVisit === selectedDate;
      } else if (viewMode === 'monthly') {
        return p.lastVisit.startsWith(selectedMonth);
      }
      
      return true; // 'all'인 경우
    });
  }, [patients, searchTerm, viewMode, selectedDate, selectedMonth]);

  const handleExport = () => {
    excelService.exportToExcel(patients);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const imported = await excelService.importFromExcel(file);
      const current = storageService.getPatients();
      const newPatients = [...current];
      imported.forEach(p => {
        if (!newPatients.some(existing => existing.chartNumber === p.chartNumber)) {
          newPatients.push(p as Patient);
        }
      });
      storageService.savePatients(newPatients);
      onRefresh();
      alert('성공적으로 임포트되었습니다.');
    } catch (err) {
      alert('엑셀 파일을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const openDeleteModal = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPatientToDelete(null);
  };

  const confirmDelete = () => {
    if (patientToDelete) {
      storageService.deletePatient(patientToDelete.id);
      onRefresh();
      closeDeleteModal();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">환자 관리</h2>
          <p className="text-slate-500 font-medium text-sm">등록된 전체 환자 목록 및 내원 기록을 관리하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
            <Upload className="w-3.5 h-3.5" />
            엑셀 업로드
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={isImporting} />
          </label>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            다운로드
          </button>
          <button 
            onClick={() => navigate('/patient/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-600 rounded-xl text-xs font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            신규 환자 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* 필터 제어 섹션 */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 w-fit">
            <button 
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              전체
            </button>
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'daily' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              일별 내원
            </button>
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              월별 내원
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {viewMode === 'daily' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 animate-in slide-in-from-right-2 duration-300">
                <Calendar className="w-4 h-4 text-blue-500" />
                <input 
                  type="date" 
                  className="text-sm font-bold text-slate-700 outline-none"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}
            {viewMode === 'monthly' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 animate-in slide-in-from-right-2 duration-300">
                <Layers className="w-4 h-4 text-emerald-500" />
                <input 
                  type="month" 
                  className="text-sm font-bold text-slate-700 outline-none"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="이름, 차트번호 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-4">차트번호</th>
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">연락처</th>
                <th className="px-6 py-4">최근 방문일</th>
                <th className="px-6 py-4">다음 리콜일</th>
                <th className="px-6 py-4">예약 내용</th>
                <th className="px-8 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-4">
                    <span className="font-mono text-slate-400 text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{patient.chartNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {patient.name[0]}
                      </div>
                      <span className="font-black text-slate-800">{patient.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm font-medium">{patient.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600 text-xs font-bold">{patient.lastVisit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      patient.nextRecallDate && patient.nextRecallDate <= new Date().toISOString().split('T')[0] 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {patient.nextRecallDate || '미설정'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium truncate max-w-[150px]">
                      {patient.nextRecallContent && <MessageSquare className="w-3 h-3 text-slate-300 shrink-0" />}
                      <span className="truncate">{patient.nextRecallContent || '-'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => openDeleteModal(patient.id, patient.name, e)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <Search className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold">표시할 환자가 없습니다.</p>
                      <p className="text-xs text-slate-300">검색어 또는 필터 설정을 확인해주세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 커스텀 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <button onClick={closeDeleteModal} className="text-slate-300 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">환자 정보 삭제</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">[{patientToDelete?.name}]</span> 환자의 정보를 삭제하시겠습니까? 
                삭제된 데이터는 복구할 수 없으며 모든 진료 내역이 함께 사라집니다.
              </p>
            </div>
            
            <div className="bg-slate-50/50 p-8 flex items-center gap-4 border-t border-slate-100">
              <button 
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                취소
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-4 bg-rose-600 rounded-2xl font-black text-white hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;
