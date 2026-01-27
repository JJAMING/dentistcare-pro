
import React from 'react';
import { Patient } from '../types';
import { Bell, Calendar, Phone, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecallManagerProps {
  patients: Patient[];
}

const RecallManager: React.FC<RecallManagerProps> = ({ patients }) => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  
  const overdue = patients.filter(p => p.nextRecallDate && p.nextRecallDate < today);
  const scheduledToday = patients.filter(p => p.nextRecallDate === today);
  const upcoming = patients.filter(p => p.nextRecallDate && p.nextRecallDate > today).sort((a,b) => a.nextRecallDate.localeCompare(b.nextRecallDate));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">리콜 관리</h2>
        <p className="text-slate-500">정기 검진 및 사후 관리 대상 환자를 추적하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-red-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              미수행 리콜 ({overdue.length})
            </h3>
          </div>
          <div className="space-y-3">
            {overdue.map(p => (
              <RecallCard key={p.id} patient={p} type="overdue" onClick={() => navigate(`/patient/${p.id}`)} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-blue-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              오늘 리콜 ({scheduledToday.length})
            </h3>
          </div>
          <div className="space-y-3">
            {scheduledToday.map(p => (
              <RecallCard key={p.id} patient={p} type="today" onClick={() => navigate(`/patient/${p.id}`)} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              예정 리콜 ({upcoming.length})
            </h3>
          </div>
          <div className="space-y-3">
            {upcoming.slice(0, 10).map(p => (
              <RecallCard key={p.id} patient={p} type="upcoming" onClick={() => navigate(`/patient/${p.id}`)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Fixed: Defined RecallCard as React.FC to handle React-internal props like 'key' correctly in TypeScript
const RecallCard: React.FC<{ 
  patient: Patient; 
  type: 'overdue' | 'today' | 'upcoming'; 
  onClick: () => void; 
}> = ({ patient, type, onClick }) => {
  const colors = {
    overdue: 'border-red-100 bg-red-50 hover:bg-red-100 text-red-700',
    today: 'border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700',
    upcoming: 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${colors[type]}`}
    >
      <div>
        <p className="font-bold">{patient.name}</p>
        <p className="text-xs opacity-70 flex items-center gap-1 mt-1">
          <Phone className="w-3 h-3" />
          {patient.phone}
        </p>
        <p className="text-[10px] font-bold mt-2 opacity-60 uppercase">
          리콜일: {patient.nextRecallDate}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100" />
    </div>
  );
};

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default RecallManager;
