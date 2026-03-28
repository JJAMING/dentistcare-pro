
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, Treatment } from '../types';
import {
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Percent,
  BarChart3,
  PieChart as PieChartIcon,
  UserPlus,
  ArrowUpRight,
  Bell,
  Clock,
  CheckCircle,
  X,
  Phone,
  MessageSquare,
  Award,
  MapPin,
  Cloud,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { firebaseService } from '../services/firebaseService';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

interface DashboardProps {
  patients: Patient[];
}

type ViewMode = 'weekly' | 'monthly' | 'yearly' | 'all';

const COLORS = ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#94a3b8'];

const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
  const navigate = useNavigate();
  const [patientView, setPatientView] = useState<ViewMode>('weekly');
  const [patientWeekOffset, setPatientWeekOffset] = useState(0);
  const [patientMonthOffset, setPatientMonthOffset] = useState(0);
  const [patientYearOffset, setPatientYearOffset] = useState(0);

  const [amtView, setAmtView] = useState<ViewMode>('weekly');
  const [amtWeekOffset, setAmtWeekOffset] = useState(0);
  const [amtMonthOffset, setAmtMonthOffset] = useState(0);
  const [amtYearOffset, setAmtYearOffset] = useState(0);

  const [rateView, setRateView] = useState<ViewMode>('weekly');
  const [rateWeekOffset, setRateWeekOffset] = useState(0);
  const [rateMonthOffset, setRateMonthOffset] = useState(0);
  const [rateYearOffset, setRateYearOffset] = useState(0);

  const [visitPathView, setVisitPathView] = useState<ViewMode>('weekly');
  const [visitPathWeekOffset, setVisitPathWeekOffset] = useState(0);
  const [visitPathMonthOffset, setVisitPathMonthOffset] = useState(0);
  const [visitPathYearOffset, setVisitPathYearOffset] = useState(0);

  const [modalData, setModalData] = useState<{ title: string; list: Patient[] } | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('LAST_CLOUD_SYNC'));

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const day = today.getDay();
  const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date(today).setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
  sunday.setHours(23, 59, 59, 999);

  const totalCompletedRecallsCount = patients.reduce((acc, p) => acc + (p.completedRecallDates?.length || 0), 0);
  const totalCompletedRecallsList = patients.filter(p => p.completedRecallDates && p.completedRecallDates.length > 0);

  const todayRecallsList = patients.filter(p => p.nextRecallDate === todayStr);
  const thisWeekRecallsList = patients.filter(p => {
    if (!p.nextRecallDate) return false;
    const rDate = new Date(p.nextRecallDate);
    return rDate >= monday && rDate <= sunday;
  });

  const todayRecallsCount = todayRecallsList.length;
  const thisWeekRecallsCount = thisWeekRecallsList.length;

  const upcomingRecalls = patients
    .filter(p => p.nextRecallDate && p.nextRecallDate >= todayStr)
    .sort((a, b) => a.nextRecallDate.localeCompare(b.nextRecallDate))
    .slice(0, 5);

  const parseAmount = (amount?: string) => {
    if (!amount) return 0;
    return parseInt(amount.replace(/[^0-9]/g, '')) || 0;
  };

  // 내원 경로 데이터 가공 (전체/주간/월간 뷰 지원)
  const visitPathData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let includedCount = 0;
    const now = new Date();

    const VISIT_PATHS = ['업체', '아파트', '소개', '가족', '단체 및 협회', '기타'];

    // 문자열 날짜 범위 계산 (YYYY-MM-DD 포맷)
    const pad = (n: number) => String(n).padStart(2, '0');

    // 주간 범위
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayDate = new Date(now);
    mondayDate.setDate(diffToMonday + visitPathWeekOffset * 7);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const mondayStr = `${mondayDate.getFullYear()}-${pad(mondayDate.getMonth() + 1)}-${pad(mondayDate.getDate())}`;
    const sundayStr = `${sundayDate.getFullYear()}-${pad(sundayDate.getMonth() + 1)}-${pad(sundayDate.getDate())}`;

    // 월간 범위
    const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + visitPathMonthOffset, 1);
    const currentMonthPrefix = `${targetMonthDate.getFullYear()}-${pad(targetMonthDate.getMonth() + 1)}`;

    // 연간 범위
    const targetYear = now.getFullYear() + visitPathYearOffset;

    patients.forEach(p => {
      const targetDateStr = p.firstVisit || p.registrationDate;

      let isIncluded = false;
      if (visitPathView === 'all') {
        isIncluded = true;
      } else if (visitPathView === 'weekly') {
        if (!targetDateStr) return;
        isIncluded = targetDateStr >= mondayStr && targetDateStr <= sundayStr;
      } else if (visitPathView === 'monthly') {
        if (!targetDateStr) return;
        isIncluded = targetDateStr.startsWith(currentMonthPrefix);
      } else if (visitPathView === 'yearly') {
        if (!targetDateStr) return;
        const [year] = targetDateStr.split('-');
        isIncluded = parseInt(year) === targetYear;
      }

      if (isIncluded) {
        includedCount++;
        let path = p.visitPath;
        if (!path) path = '미지정';
        else if (!VISIT_PATHS.includes(path)) path = '기타';
        counts[path] = (counts[path] || 0) + 1;
      }
    });

    return {
      data: Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      total: includedCount
    };
  }, [patients, visitPathView, visitPathWeekOffset, visitPathMonthOffset, visitPathYearOffset]);

  const visitChartData = visitPathData.data;
  const visitTotal = visitPathData.total;

  // 주간 레이블: "26년 3월 첫째주" 형식
  const getWeekLabel = (weekOffset: number): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const year = monday.getFullYear() % 100;
    const month = monday.getMonth() + 1;
    const weekNum = Math.ceil(monday.getDate() / 7);
    const weekNames = ['첫째주', '둘째주', '셋째주', '넷째주', '다섯째주'];
    return `${year}년 ${month}월 ${weekNames[weekNum - 1] || '넷째주'}`;
  };

  // 월간 레이블: "2026년 3월" 형식 (monthOffset은 월 단위 오프셋)
  const getMonthLabel = (monthOffset: number): string => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${target.getFullYear()}년 ${target.getMonth() + 1}월`;
  };

  // 연간 레이블: "2026년" 형식 (yearOffset은 1년 단위 오프셋)
  const getYearLabel = (yearOffset: number): string => {
    const now = new Date();
    return `${now.getFullYear() + yearOffset}년`;
  };

  const getChartData = (mode: ViewMode, weekOffset: number = 0, monthOffset: number = 0, yearOffset: number = 0) => {
    const now = new Date();
    const normalize = (d: string) => (d || '').replace(/-/g, '');

    if (mode === 'weekly') {
      const dayNames = ['월', '화', '수', '목', '금', '토'];
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const mondayDate = new Date(new Date(now).setDate(diff + weekOffset * 7));

      return dayNames.map((name, i) => {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const dNorm = normalize(dStr);

        let amount = 0, agreedAmount = 0, pendingAmount = 0, visits = 0, newPatients = 0, agreedCount = 0, totalConsults = 0;

        patients.forEach(p => {
          const hasVisitToday = normalize(p.lastVisit) === dNorm || 
                                p.treatments.some(t => normalize(t.date) === dNorm);
          if (hasVisitToday) visits++;
          if (normalize(p.firstVisit) === dNorm) newPatients++;

          p.treatments.forEach(t => {
            if (normalize(t.date) === dNorm) {
              const est = parseAmount(t.estimatedAmount);
              amount += est;
              if (t.isAgreed === true) agreedAmount += est;
              else pendingAmount += est;
              if (t.isAgreed !== undefined && t.isAgreed !== null) {
                totalConsults++;
                if (t.isAgreed) agreedCount++;
              }
            }
          });
        });
        const rate = totalConsults > 0 ? Math.round((agreedCount / totalConsults) * 100) : 0;
        const pendingCount = totalConsults - agreedCount;
        return { name, visits, amount: amount / 10000, agreedAmount: agreedAmount / 10000, pendingAmount: pendingAmount / 10000, rate, newPatients, totalConsults, agreedCount, pendingCount };
      });

    } else if (mode === 'monthly') {
      const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const targetYear = target.getFullYear();
      const targetMonth = target.getMonth();
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const pad = (n: number) => String(n).padStart(2, '0');

      const weeks: { name: string; startDay: number; endDay: number }[] = [];
      let day = 1, weekNum = 1;
      while (day <= daysInMonth) {
        const start = day, end = Math.min(day + 6, daysInMonth);
        weeks.push({ name: `${weekNum}주차`, startDay: start, endDay: end });
        day += 7; weekNum++;
      }

      return weeks.map(({ name, startDay, endDay }) => {
        let amount = 0, agreedAmount = 0, pendingAmount = 0, visits = 0, newPatients = 0, agreedCount = 0, totalConsults = 0;
        const startNorm = `${targetYear}${pad(targetMonth + 1)}${pad(startDay)}`;
        const endNorm = `${targetYear}${pad(targetMonth + 1)}${pad(endDay)}`;

        patients.forEach(p => {
          const lvNorm = normalize(p.lastVisit);
          const matchesLastVisit = lvNorm && lvNorm >= startNorm && lvNorm <= endNorm;
          const matchesTreatments = p.treatments.some(t => {
            const tNorm = normalize(t.date);
            return tNorm >= startNorm && tNorm <= endNorm;
          });
          if (matchesLastVisit || matchesTreatments) visits++;

          const fvNorm = normalize(p.firstVisit || '');
          if (fvNorm && fvNorm >= startNorm && fvNorm <= endNorm) newPatients++;
          
          p.treatments.forEach(t => {
            const tNorm = normalize(t.date);
            if (tNorm >= startNorm && tNorm <= endNorm) {
              const est = parseAmount(t.estimatedAmount);
              amount += est;
              if (t.isAgreed === true) agreedAmount += est;
              else pendingAmount += est;
              if (t.isAgreed !== undefined && t.isAgreed !== null) {
                totalConsults++;
                if (t.isAgreed) agreedCount++;
              }
            }
          });
        });
        const rate = totalConsults > 0 ? Math.round((agreedCount / totalConsults) * 100) : 0;
        const pendingCount = totalConsults - agreedCount;
        return { name, visits, amount: amount / 10000, agreedAmount: agreedAmount / 10000, pendingAmount: pendingAmount / 10000, rate, newPatients, totalConsults, agreedCount, pendingCount };
      });

    } else {
      const targetYear = now.getFullYear() + yearOffset;
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      const pad = (n: number) => String(n).padStart(2, '0');

      return monthNames.map((name, i) => {
        let amount = 0, agreedAmount = 0, pendingAmount = 0, visits = 0, newPatients = 0, agreedCount = 0, totalConsults = 0;
        const monthPrefixNorm = `${targetYear}${pad(i + 1)}`;

        patients.forEach(p => {
          p.treatments.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getFullYear() === targetYear && tDate.getMonth() === i) {
              const est = parseAmount(t.estimatedAmount);
              amount += est;
              if (t.isAgreed === true) agreedAmount += est;
              else pendingAmount += est;
              visits++;
              if (t.isAgreed !== undefined && t.isAgreed !== null) {
                totalConsults++;
                if (t.isAgreed) agreedCount++;
              }
            }
          });
          if (p.firstVisit) {
            const fvDate = new Date(p.firstVisit);
            if (fvDate.getFullYear() === targetYear && fvDate.getMonth() === i) newPatients++;
          }
        });
        const rate = totalConsults > 0 ? Math.round((agreedCount / totalConsults) * 100) : 0;
        const pendingCount = totalConsults - agreedCount;
        return { name, visits, amount: amount / 10000, agreedAmount: agreedAmount / 10000, pendingAmount: pendingAmount / 10000, rate, newPatients, totalConsults, agreedCount, pendingCount };
      });
    }
  };


  const pData = getChartData(patientView, patientWeekOffset, patientMonthOffset, patientYearOffset);
  const amtData = getChartData(amtView, amtWeekOffset, amtMonthOffset, amtYearOffset);
  const rateData = getChartData(rateView, rateWeekOffset, rateMonthOffset, rateYearOffset);

  const ViewSelectorWithNav = ({
    current, set,
    weekOffset, setWeekOffset,
    monthOffset, setMonthOffset,
    yearOffset, setYearOffset
  }: {
    current: ViewMode;
    set: (v: ViewMode) => void;
    weekOffset: number;
    setWeekOffset: (n: number) => void;
    monthOffset: number;
    setMonthOffset: (n: number) => void;
    yearOffset: number;
    setYearOffset: (n: number) => void;
  }) => {
    const label = current === 'weekly'
      ? getWeekLabel(weekOffset)
      : current === 'monthly'
        ? getMonthLabel(monthOffset)
        : getYearLabel(yearOffset);
    const onPrev = () => {
      if (current === 'weekly') setWeekOffset(weekOffset - 1);
      else if (current === 'monthly') setMonthOffset(monthOffset - 1);
      else setYearOffset(yearOffset - 1);
    };
    const onNext = () => {
      if (current === 'weekly') setWeekOffset(weekOffset + 1);
      else if (current === 'monthly') setMonthOffset(monthOffset + 1);
      else setYearOffset(yearOffset + 1);
    };
    const isNextDisabled =
      current === 'weekly' ? weekOffset >= 0
        : current === 'monthly' ? monthOffset >= 0
          : yearOffset >= 0;

    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { set('weekly'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${current === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >주간</button>
            <button
              onClick={() => { set('monthly'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${current === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >월간</button>
            <button
              onClick={() => { set('yearly'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${current === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >연간</button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-600 min-w-[100px] text-center">{label}</span>
            <button
              onClick={onNext}
              disabled={isNextDisabled}
              className={`p-1.5 rounded-lg transition-all ${isNextDisabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
      </div>
    );
  };

  const openRecallModal = (title: string, list: Patient[]) => {
    setModalData({ title, list });
  };

  const handleCloudSync = async () => {
    if (!window.confirm('현재 브라우저의 모든 데이터를 클라우드(Firebase)로 업로드하시겠습니까?')) return;
    
    setIsCloudSyncing(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        alert('로그인 정보가 없습니다. 다시 로그인해 주세요.');
        return;
      }

      const currentPatients = storageService.getPatients();
      const currentDoctors = storageService.getDoctors();
      
      await firebaseService.syncToCloud(currentPatients, currentDoctors, user.clinicId);
      
      const now = new Date().toLocaleString();
      setLastSyncTime(now);
      localStorage.setItem('LAST_CLOUD_SYNC', now);
      alert('클라우드 동기화가 완료되었습니다!');
    } catch (error) {
      alert('클라우드 동기화 중 오류가 발생했습니다. 설정값을 확인해 주세요.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">종합 경영 대시보드</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-slate-500 text-sm font-medium">실시간 현황을 분석하여 병원을 관리하세요.</p>
            <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg text-xs lg:text-sm font-black border border-blue-100">
              {authService.getCurrentUser()?.clinicName || '바룸치과의원'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <button
            onClick={handleCloudSync}
            disabled={isCloudSyncing}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-black shadow-sm transition-all ${
              isCloudSyncing 
                ? 'bg-blue-50 border-blue-200 text-blue-400 cursor-not-allowed' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Cloud className={`w-4 h-4 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
            {isCloudSyncing ? '동기화 중...' : '클라우드 업로드'}
          </button>
          <div className="flex-1 lg:flex-none bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-2xl border border-emerald-100 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold whitespace-nowrap">오늘 {patients.filter(p => {
              const todayNorm = todayStr.replace(/-/g, '');
              const lvNorm = (p.lastVisit || '').replace(/-/g, '');
              return lvNorm === todayNorm;
            }).length}명 내원</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div
          onClick={() => openRecallModal('리콜 완료 환자 명단', totalCompletedRecallsList)}
          className="flex items-center gap-4 p-4 lg:p-5 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-blue-600 p-2.5 lg:p-3 rounded-xl shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform">
            <Award className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">총 리콜 완료</p>
            <p className="text-xl lg:text-3xl font-black text-blue-900">{totalCompletedRecallsCount}건</p>
          </div>
        </div>
        <div
          onClick={() => openRecallModal('오늘 리콜 명단', todayRecallsList)}
          className="flex items-center gap-4 p-4 lg:p-5 bg-indigo-50 rounded-2xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-indigo-600 p-2.5 lg:p-3 rounded-xl shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform">
            <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">오늘 리콜</p>
            <p className="text-xl lg:text-3xl font-black text-indigo-700">{todayRecallsCount}명</p>
          </div>
        </div>
        <div
          onClick={() => openRecallModal('이번 주 리콜 명단', thisWeekRecallsList)}
          className="flex items-center gap-4 p-4 lg:p-5 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-emerald-600 p-2.5 lg:p-3 rounded-xl shadow-lg shadow-emerald-100 group-hover:rotate-6 transition-transform">
            <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">이번 주 리콜</p>
            <p className="text-xl lg:text-3xl font-black text-emerald-700">{thisWeekRecallsCount}명</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* 1. 환자 유입 현황 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">환자 유입 현황</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Patient Statistics</p>
              </div>
            </div>
            <ViewSelectorWithNav
              current={patientView} set={(v) => { setPatientView(v); }}
              weekOffset={patientWeekOffset} setWeekOffset={setPatientWeekOffset}
              monthOffset={patientMonthOffset} setMonthOffset={setPatientMonthOffset}
              yearOffset={patientYearOffset} setYearOffset={setPatientYearOffset}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold mb-1">전체 등록 환자</p>
              <p className="text-2xl font-black text-slate-900">{patients.length}명</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-xs text-blue-500 font-bold mb-1">
                {patientView === 'weekly' ? '해당 주 신환' : patientView === 'monthly' ? '해당 월 신환' : '해당 기간 신환'}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-blue-700">{pData.reduce((acc, curr) => acc + curr.newPatients, 0)}명</p>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                />
                <Bar dataKey="newPatients" name="신환" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. 견적 금액 분석 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">견적 금액 분석</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Revenue Forecast</p>
              </div>
            </div>
            <ViewSelectorWithNav
              current={amtView} set={(v) => { setAmtView(v); }}
              weekOffset={amtWeekOffset} setWeekOffset={setAmtWeekOffset}
              monthOffset={amtMonthOffset} setMonthOffset={setAmtMonthOffset}
              yearOffset={amtYearOffset} setYearOffset={setAmtYearOffset}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-xs text-slate-400 font-bold mb-1">총 견적액</p>
              <p className="text-xl font-black text-slate-900 truncate">
                ₩{amtData.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}만
              </p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-center">
              <p className="text-xs text-indigo-500 font-bold mb-1">동의금액</p>
              <p className="text-xl font-black text-indigo-700 truncate">
                ₩{amtData.reduce((acc, curr) => acc + curr.agreedAmount, 0).toLocaleString()}만
              </p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-center">
              <p className="text-xs text-rose-500 font-bold mb-1">보류금액</p>
              <p className="text-xl font-black text-rose-700 truncate">
                ₩{amtData.reduce((acc, curr) => acc + curr.pendingAmount, 0).toLocaleString()}만
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={amtData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  formatter={(val: number) => [`${val.toLocaleString()}만원`, '견적']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. 상담 동의율 추이 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">상담 동의율 추이</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Conversion Success</p>
              </div>
            </div>
            <ViewSelectorWithNav
              current={rateView} set={(v) => { setRateView(v); }}
              weekOffset={rateWeekOffset} setWeekOffset={setRateWeekOffset}
              monthOffset={rateMonthOffset} setMonthOffset={setRateMonthOffset}
              yearOffset={rateYearOffset} setYearOffset={setRateYearOffset}
            />
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-xs text-slate-400 font-bold mb-1">{rateView === 'weekly' ? '주간 평균' : rateView === 'monthly' ? '월평균' : '연평균'} 동의율</p>
              <p className="text-xl font-black text-slate-900 truncate">
                {Math.round(rateData.reduce((acc, curr) => acc + curr.rate, 0) / (rateData.filter(d => d.rate > 0).length || 1))}%
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col justify-center">
              <p className="text-xs text-purple-500 font-bold mb-1">총 상담 수</p>
              <p className="text-xl font-black text-purple-700 truncate">
                {rateData.reduce((acc, curr) => acc + curr.totalConsults, 0)}건
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-center">
              <p className="text-xs text-blue-500 font-bold mb-1">동의 수</p>
              <p className="text-xl font-black text-blue-700 truncate">
                {rateData.reduce((acc, curr) => acc + curr.agreedCount, 0)}건
              </p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-center">
              <p className="text-xs text-rose-500 font-bold mb-1">보류 수</p>
              <p className="text-xl font-black text-rose-700 truncate">
                {rateData.reduce((acc, curr) => acc + curr.pendingCount, 0)}건
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 'bold' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  formatter={(val: number) => [`${val}%`, '동의율']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#a855f7"
                  strokeWidth={4}
                  dot={{ fill: '#a855f7', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. 내원 경로 분석 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">내원 경로 분석</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visit Source Analysis</p>
              </div>
            </div>
            <ViewSelectorWithNav
              current={visitPathView} set={(v) => { setVisitPathView(v); }}
              weekOffset={visitPathWeekOffset} setWeekOffset={setVisitPathWeekOffset}
              monthOffset={visitPathMonthOffset} setMonthOffset={setVisitPathMonthOffset}
              yearOffset={visitPathYearOffset} setYearOffset={setVisitPathYearOffset}
            />
          </div>

          {visitChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visitChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent < 0.08) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {visitChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                    formatter={(val: number, name: string) => [`${val}명 (${visitTotal > 0 ? Math.round(val / visitTotal * 100) : 0}%)`, name]}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value, entry: any) => (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                        {value} <span style={{ color: entry.color, fontWeight: 900 }}>{entry.payload.value}명</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-300 flex-col gap-3">
              <MapPin className="w-12 h-12 opacity-30" />
              <p className="text-sm font-bold">{visitPathView === 'weekly' ? '이번 주' : visitPathView === 'monthly' ? '이번 달' : ''} 집계 데이터가 없습니다.</p>
            </div>
          )}
          <p className="text-center text-[11px] text-slate-400 font-bold mt-2">
            {visitPathView === 'weekly' ? '해당 주 신환' : visitPathView === 'monthly' ? '해당 월 신환' : visitPathView === 'yearly' ? '해당 연 신환' : '전체'} 기준 · {visitTotal}명
          </p>
        </div>
      </div>

      {modalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{modalData.title}</h3>
                  <p className="text-slate-500 text-sm font-medium">총 {modalData.list.length}명의 환자가 검색되었습니다.</p>
                </div>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {modalData.list.length > 0 ? modalData.list.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => {
                    navigate(`/patient/${patient.id}`);
                    setModalData(null);
                  }}
                  className="flex items-center gap-5 p-5 rounded-3xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    {patient.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-slate-800 text-lg group-hover:text-blue-700 transition-colors">{patient.name}</p>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">#{patient.chartNumber}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {patient.phone}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        {patient.nextRecallDate}
                      </div>
                    </div>
                    {patient.nextRecallContent && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="truncate">{patient.nextRecallContent}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-slate-400">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-lg font-medium">대상 환자가 없습니다.</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setModalData(null)}
                className="px-10 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
