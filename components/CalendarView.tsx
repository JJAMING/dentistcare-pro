
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  User,
  Clock
} from 'lucide-react';
import { Patient } from '../types';

interface CalendarViewProps {
  patients: Patient[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ patients }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDay = firstDayOfMonth.getDay(); // 0 is Sunday
  const totalDays = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = [];
  // Previous month padding
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return patients.filter(p => p.nextRecallDate === dateStr);
  };

  const monthName = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(currentDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">예약 일정</h2>
          <p className="text-slate-500">월간 예약 및 리콜 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={goToToday}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            오늘
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-l-xl border-r border-slate-100">
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div className="px-6 py-2 font-bold text-slate-800 min-w-[140px] text-center">
              {year}년 {monthName}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-r-xl border-l border-slate-100">
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {days.map((date, i) => {
            if (!date) return <div key={`padding-${i}`} className="border-b border-r border-slate-100 bg-slate-50/30" />;
            
            const appointments = getAppointmentsForDate(date);
            const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;

            return (
              <div key={date.toISOString()} className={`min-h-[120px] p-2 border-b border-r border-slate-100 group transition-colors hover:bg-slate-50/50`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : isSunday ? 'text-rose-500' : isSaturday ? 'text-blue-500' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </span>
                  {appointments.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {appointments.length}건
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                  {appointments.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => navigate(`/patient/${p.id}`)}
                      className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 hover:border-blue-300 cursor-pointer transition-all group/item shadow-sm"
                    >
                      <div className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-blue-600" />
                        <span className="text-[11px] font-bold text-blue-800 truncate">{p.name}</span>
                      </div>
                      {p.nextRecallContent && (
                        <p className="text-[9px] text-blue-600 truncate mt-0.5 opacity-80 pl-3.5">
                          {p.nextRecallContent}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
