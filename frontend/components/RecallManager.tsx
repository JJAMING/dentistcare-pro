
import React, { useState } from 'react';
import { Patient } from '../types';
import { Bell, Calendar, Phone, CheckCircle, ChevronRight, AlertTriangle, XCircle, MessageSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';

interface RecallManagerProps {
  patients: Patient[];
  onRefresh: () => void;
}

type TabType = 'unset' | 'overdue' | 'today' | 'upcoming';

const RecallManager: React.FC<RecallManagerProps> = ({ patients, onRefresh }) => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<TabType>('unset');
  // 제외 확인 팝업용 상태
  const [confirmDismiss, setConfirmDismiss] = useState<Patient | null>(null);

  // 리콜 미설정: nextRecallDate 없고 recallExcluded도 아닌 환자
  const noRecall = patients.filter(p => !p.nextRecallDate && !p.recallExcluded);
  const overdue = patients.filter(p => p.nextRecallDate && p.nextRecallDate < today);
  const todayList = patients.filter(p => p.nextRecallDate === today);
  const upcoming = patients
    .filter(p => p.nextRecallDate && p.nextRecallDate > today)
    .sort((a, b) => a.nextRecallDate.localeCompare(b.nextRecallDate));

  const tabs: { key: TabType; label: string; count: number; color: string; activeColor: string; icon: React.ReactNode }[] = [
    {
      key: 'unset',
      label: '리콜 미설정',
      count: noRecall.length,
      color: 'text-slate-500 border-slate-100 bg-slate-50',
      activeColor: 'bg-slate-900 text-white border-slate-900',
      icon: <XCircle className="w-4 h-4" />
    },
    {
      key: 'overdue',
      label: '리콜 지남',
      count: overdue.length,
      color: 'text-rose-500 border-rose-100 bg-rose-50',
      activeColor: 'bg-rose-600 text-white border-rose-600',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      key: 'today',
      label: '오늘 리콜',
      count: todayList.length,
      color: 'text-blue-500 border-blue-100 bg-blue-50',
      activeColor: 'bg-blue-600 text-white border-blue-600',
      icon: <Bell className="w-4 h-4" />
    },
    {
      key: 'upcoming',
      label: '리콜 예정',
      count: upcoming.length,
      color: 'text-emerald-500 border-emerald-100 bg-emerald-50',
      activeColor: 'bg-emerald-600 text-white border-emerald-600',
      icon: <CheckCircle className="w-4 h-4" />
    },
  ];

  const currentList: Patient[] =
    activeTab === 'unset' ? noRecall :
      activeTab === 'overdue' ? overdue :
        activeTab === 'today' ? todayList :
          upcoming;

  const emptyMessages: Record<TabType, string> = {
    unset: '리콜 미설정 환자가 없습니다.',
    overdue: '지난 리콜 환자가 없습니다. 👍',
    today: '오늘 리콜 예정 환자가 없습니다.',
    upcoming: '다가오는 리콜 예정이 없습니다.',
  };

  const handleDismissConfirm = () => {
    if (!confirmDismiss) return;
    storageService.updatePatient({ ...confirmDismiss, recallExcluded: true });
    onRefresh();
    setConfirmDismiss(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 확인 팝업 모달 */}
      {confirmDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-80 flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
            <div className="bg-rose-50 p-4 rounded-2xl">
              <X className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-800 text-lg">{confirmDismiss.name} 환자</p>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">리콜 미설정 목록에서 제외하시겠습니까?<br /><span className="text-xs text-slate-400">환자 관리에서는 그대로 유지됩니다.</span></p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDismiss(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleDismissConfirm}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
              >
                제외하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">리콜 관리</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">정기 검진 및 사후 관리 대상 환자를 추적하세요.</p>
        </div>
        {/* 요약 뱃지 */}
        <div className="flex items-center gap-3">
          {noRecall.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black border border-slate-200">
              <XCircle className="w-3.5 h-3.5" />
              미설정 {noRecall.length}명
            </span>
          )}
          {overdue.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              지난 리콜 {overdue.length}명
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-2xl w-fit gap-1 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${activeTab === tab.key ? tab.activeColor : `border-transparent ${tab.color} hover:border-current`
              }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-current/10'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 설명 텍스트 */}
      {activeTab === 'unset' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500">
          <XCircle className="w-4 h-4 shrink-0 text-slate-400" />
          다음 리콜일이 설정되지 않은 환자 목록입니다. 환자 정보에서 다음 리콜일을 설정해 주세요.
        </div>
      )}
      {activeTab === 'overdue' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-500">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          리콜 예정일이 지났지만 아직 방문하지 않은 환자입니다. 빠른 연락이 필요합니다.
        </div>
      )}

      {/* 환자 목록 */}
      {currentList.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] py-24 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 font-black">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentList.map(p => (
            <RecallCard
              key={p.id}
              patient={p}
              type={activeTab}
              onDismiss={activeTab === 'unset' ? () => setConfirmDismiss(p) : undefined}
              onClick={() => navigate(`/patient/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RecallCard: React.FC<{
  patient: Patient;
  type: TabType;
  onDismiss?: () => void;   // 리콜 미설정 탭 전용 제외 콜백
  onClick: () => void;
}> = ({ patient, type, onDismiss, onClick }) => {
  const styleMap = {
    unset: 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300',
    overdue: 'border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-200',
    today: 'border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200',
    upcoming: 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200',
  };

  const badgeMap = {
    unset: <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">미설정</span>,
    overdue: <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">기간 초과</span>,
    today: <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">오늘</span>,
    upcoming: <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">예정</span>,
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 ${styleMap[type]}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-black text-slate-800">{patient.name}</p>
          {badgeMap[type]}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
          <Phone className="w-3 h-3 shrink-0" />
          <span>{patient.phone}</span>
        </div>
        {patient.nextRecallDate ? (
          <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-500">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>리콜일: {patient.nextRecallDate}</span>
          </div>
        ) : null}
        {/* 리콜 미설정: 최근 진료 메모 표시 */}
        {type === 'unset' && (() => {
          // 모든 진료의 memos를 flat하게 모아 날짜 최신순 정렬
          const allMemos = (patient.treatments || [])
            .flatMap(t => (t.memos || []))
            .sort((a, b) => b.date.localeCompare(a.date));
          const latest = allMemos[0];
          if (!latest) return null;
          return (
            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 space-y-1">
              <span className="inline-block text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {latest.date}
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                {latest.content}
              </p>
            </div>
          );
        })()}
        {/* 리콜 미설정 외: nextRecallContent(예약 내용) 표시 */}
        {type !== 'unset' && patient.nextRecallContent && (
          <div className="flex items-start gap-1 mt-1.5 text-[11px] text-slate-400 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
            <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{patient.nextRecallContent}</span>
          </div>
        )}


      </div>
      <div className="shrink-0">
        {onDismiss ? (
          <button
            onClick={e => { e.stopPropagation(); onDismiss(); }}
            title="이 목록에서만 제외"
            className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        )}
      </div>
    </div>
  );
};

export default RecallManager;
