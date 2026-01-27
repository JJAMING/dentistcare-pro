
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { Patient } from '../types';
import { excelService } from '../services/excelService';
import { storageService } from '../services/storageService';

interface PatientListProps {
  patients: Patient[];
  onRefresh: () => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, onRefresh }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  // 삭제 모달 상태 관리
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<{id: string, name: string} | null>(null);

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.chartNumber.includes(searchTerm)
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">환자 관리</h2>
          <p className="text-slate-500">등록된 전체 환자 목록을 관리하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
            <Upload className="w-4 h-4" />
            엑셀 업로드
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={isImporting} />
          </label>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
          <button 
            onClick={() => navigate('/patient/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            신규 환자 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="이름, 차트번호 검색..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">
            <Filter className="w-4 h-4" />
            필터
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">차트번호</th>
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">연락처</th>
                <th className="px-6 py-4">최근 방문일</th>
                <th className="px-6 py-4">다음 리콜일</th>
                <th className="px-6 py-4">예약 내용</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-500">{patient.chartNumber}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">{patient.name}</td>
                  <td className="px-6 py-4 text-slate-600">{patient.phone}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{patient.lastVisit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      patient.nextRecallDate <= new Date().toISOString().split('T')[0] 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-blue-100 text-blue-600'
                    }`}>
                      {patient.nextRecallDate || '미설정'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 truncate max-w-[150px]">
                      {patient.nextRecallContent && <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />}
                      <span className="truncate">{patient.nextRecallContent || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => openDeleteModal(patient.id, patient.name, e)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    등록된 환자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 커스텀 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button onClick={closeDeleteModal} className="text-slate-400 hover:text-slate-600 p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">환자 정보 삭제</h3>
              <p className="text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-800">[{patientToDelete?.name}]</span> 환자의 정보를 정말 삭제하시겠습니까? 
                삭제된 데이터는 복구할 수 없으며 모든 진료 내역이 함께 사라집니다.
              </p>
            </div>
            
            <div className="bg-slate-50 p-6 flex items-center gap-3">
              <button 
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
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
