
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, Treatment } from '../types';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  ChevronRight, 
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
  Award
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
  Area
} from 'recharts';

interface DashboardProps {
  patients: Patient[];
}

type ViewMode = 'weekly' | 'monthly';

const Dashboard: React.FC<DashboardProps> = ({ patients }) => {
  const navigate = useNavigate();
  // 기본 뷰를 'weekly'로 변경
  const [patientView, setPatientView] = useState<ViewMode>('weekly');
  const [amtView, setAmtView] = useState<ViewMode>('weekly');
  const [rateView, setRateView] = useState<ViewMode>('weekly');
  const [visitView, setVisitView] = useState<ViewMode>('weekly');

  // 모달 상태
  const [modalData, setModalData] = useState<{ title: string; list: Patient[] } | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 요일 및 주간 범위 계산
  const day = today.getDay();
  const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date(today).setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
  sunday.setHours(23, 59, 59, 999);

  // 리콜 통계 및 리스트
  // '총 리콜 대상' 대신 '총 리콜 완료' 통계 계산
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

  const getChartData = (mode: ViewMode) => {
    const now = new Date();
    if (mode === 'weekly') {
      const dayNames = ['월', '화', '수', '목', '금', '토'];
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const mondayDate = new Date(new Date(now).setDate(diff));
      
      return dayNames.map((name, i) => {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        
        let amount = 0;
        let visits = 0;
        let newPatients = 0;
        let agreedCount = 0;
        let totalConsults = 0;

        patients.forEach(p => {
          if (p.lastVisit === dStr) visits++;
          if (p.registrationDate === dStr) newPatients++;

          p.treatments.forEach(t => {
            if (t.date === dStr) {
              amount += parseAmount(t.estimatedAmount);
              if (t.isAgreed !== undefined) {
                totalConsults++;
                if (t.isAgreed) agreedCount++;
              }
            }
          });
        });

        const rate = totalConsults > 0 ? Math.round((agreedCount / totalConsults) * 100) : 0;
        return { name, visits, amount: amount / 10000, rate, newPatients };
      });
    } else {
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      const currentYear = now.getFullYear();
      
      return monthNames.map((name, i) => {
        let amount = 0;
        let visits = 0;
        let newPatients = 0;
        let agreedCount = 0;
        let totalConsults = 0;

        patients.forEach(p => {
          p.treatments.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === i && tDate.getFullYear() === currentYear) {
              amount += parseAmount(t.estimatedAmount);
              visits++;
              if (t.isAgreed !== undefined) {
                totalConsults++;
                if (t.isAgreed) agreedCount++;
              }
            }
          });
          
          if (p.registrationDate) {
            const regDate = new Date(p.registrationDate);
            if (regDate.getMonth() === i && regDate.getFullYear() === currentYear) {
              newPatients++;
            }
          }
        });
        const rate = totalConsults > 0 ? Math.round((agreedCount / totalConsults) * 100) : 0;
        return { name, visits, amount: amount / 10000, rate, newPatients };
      });
    }
  };

  const pData = getChartData(patientView);
  const amtData = getChartData(amtView);
  const rateData = getChartData(rateView);
  const vData = getChartData(visitView);

  const ViewSelector = ({ current, set }: { current: ViewMode, set: (v: ViewMode) => void }) => (
    <div className="flex bg-slate-100 p-1 rounded-xl">
      <button 
        onClick={() => set('weekly')}
        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${current === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >주간</button>
      <button 
        onClick={() => set('monthly')}
        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${current === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >월간</button>
    </div>
  );

  const openRecallModal = (title: string, list: Patient[]) => {
    setModalData({ title, list });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">종합 경영 대시보드</h2>
          <p className="text-slate-500 font-medium">실시간 환자 유입 및 리콜 현황을 분석하여 병원을 관리하세요.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold">오늘 내원 {patients.filter(p => p.lastVisit === todayStr).length}명</span>
        </div>
      </div>

      {/* 리콜 통합 현황 섹션 */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => openRecallModal('리콜 완료 환자 명단', totalCompletedRecallsList)}
          className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">총 리콜 완료</p>
            <p className="text-2xl font-black text-blue-900">{totalCompletedRecallsCount}건</p>
          </div>
        </div>
        <div 
          onClick={() => openRecallModal('오늘 리콜 명단', todayRecallsList)}
          className="flex items-center gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">오늘 리콜</p>
            <p className="text-2xl font-black text-indigo-700">{todayRecallsCount}명</p>
          </div>
        </div>
        <div 
          onClick={() => openRecallModal('이번 주 리콜 명단', thisWeekRecallsList)}
          className="flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all hover:scale-[1.02] group"
        >
          <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-100 group-hover:rotate-6 transition-transform">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">이번 주 리콜</p>
            <p className="text-2xl font-black text-emerald-700">{thisWeekRecallsCount}명</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <ViewSelector current={patientView} set={setPatientView} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold mb-1">전체 등록 환자</p>
              <p className="text-2xl font-black text-slate-900">{patients.length}명</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-xs text-blue-500 font-bold mb-1">{patientView === 'weekly' ? '이번 주' : '이번 달'} 신규</p>
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="newPatients" name="신규 환자" fill="#3b82f6" radius={[6, 6, 0, 0]} />
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
            <ViewSelector current={amtView} set={setAmtView} />
          </div>

          <div className="mb-6">
            <p className="text-xs text-slate-400 font-bold mb-1">{amtView === 'weekly' ? '주간' : '월간'} 누적 견적액</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              ₩{amtData.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}만
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={amtData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
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
            <ViewSelector current={rateView} set={setRateView} />
          </div>

          <div className="mb-6 flex items-end gap-3">
            <div>
              <p className="text-xs text-slate-400 font-bold mb-1">{rateView === 'weekly' ? '평균' : '월평균'} 동의율</p>
              <p className="text-3xl font-black text-slate-900">
                {Math.round(rateData.reduce((acc, curr) => acc + curr.rate, 0) / (rateData.filter(d => d.rate > 0).length || 1))}%
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  formatter={(val: number) => [`${val}%`, '동의율']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#a855f7" 
                  strokeWidth={4} 
                  dot={{fill: '#a855f7', r: 4, strokeWidth: 0}} 
                  activeDot={{r: 6, strokeWidth: 2, stroke: '#fff'}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. 내원 환자 분석 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">내원 환자 분석</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Clinic Traffic</p>
              </div>
            </div>
            <ViewSelector current={visitView} set={setVisitView} />
          </div>

          <div className="mb-6">
            <p className="text-xs text-slate-400 font-bold mb-1">{visitView === 'weekly' ? '주간' : '월간'} 누적 내원수</p>
            <p className="text-3xl font-black text-slate-900">{vData.reduce((acc, curr) => acc + curr.visits, 0)}명</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="visits" name="내원수" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden flex flex-col justify-between min-h-[320px]">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
                <PieChartIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold">인공지능 경영 코칭</h3>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl">
              지금까지 총 <b>{totalCompletedRecallsCount}건</b>의 리콜을 성공적으로 완료했습니다. 오늘 방문 예정인 {todayRecallsCount}명의 환자에게 해피콜을 진행하여 노쇼를 방지하세요.
            </p>
          </div>
          <div className="relative z-10 flex gap-4">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-900">상세 경영 리포트</button>
            <button 
              onClick={() => openRecallModal('오늘 리콜 명단', todayRecallsList)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all border border-white/10"
            >오늘 리콜 확인</button>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">긴급 리콜 대상</h3>
            <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Urgent</span>
          </div>
          <div className="space-y-4">
            {upcomingRecalls.length > 0 ? upcomingRecalls.map((patient, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/patient/${patient.id}`)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  {patient.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{patient.name}</p>
                  <p className="text-xs text-slate-400 font-medium">{patient.nextRecallDate}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            )) : (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">리콜 예정 환자가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 리콜 명단 모달 팝업 */}
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
