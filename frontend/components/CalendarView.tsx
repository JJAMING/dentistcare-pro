
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  X
} from 'lucide-react';
import { Patient } from '../types';

interface CalendarViewProps {
  patients: Patient[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ patients }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return patients.filter(p => p.nextRecallDate === dateStr);
  };

  const monthName = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(currentDate);
  const selectedAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }).format(selectedDate)
    : '';

  useEffect(() => {
    if (!selectedDate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDate(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate]);

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
            const t = new Date();
            const isToday = date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 예약 ${appointments.length}건 보기`}
                className="min-h-[120px] p-2 border-b border-r border-slate-100 text-left transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : isSunday ? 'text-rose-500' : isSaturday ? 'text-blue-500' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </span>
                  {appointments.length > 0 && (
                    <span className="text-xs font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      {appointments.length}
                    </span>
                  )}
                </div>

                {appointments.length > 0 && (
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    예약 환자 보기
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setSelectedDate(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-modal-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/30 animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CalendarIcon className="h-5 w-5" />
                  <p className="text-sm font-bold">예약 일정</p>
                </div>
                <h3 id="appointment-modal-title" className="mt-1 text-xl font-black text-slate-800">
                  {selectedDateLabel}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  예약 환자 {selectedAppointments.length}명
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="팝업 닫기"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {selectedAppointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedAppointments.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(null);
                        navigate(`/patient/${patient.id}`);
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-black text-slate-800">{patient.name}</p>
                          <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-400">
                            #{patient.chartNumber}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-blue-600">
                          {patient.nextRecallContent || '예약 내용이 등록되지 않았습니다.'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-blue-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">
                    <CalendarIcon className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-slate-700">등록된 예약이 없습니다.</p>
                  <p className="mt-1 text-sm text-slate-400">다른 날짜를 선택해 예약 현황을 확인해 주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
