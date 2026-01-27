
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Settings, 
  Bell, 
  Plus, 
  Download, 
  Upload, 
  Search,
  ChevronRight,
  User as UserIcon,
  Activity,
  LogOut,
  ClipboardList,
  Lock,
  UserPlus,
  Stethoscope,
  Briefcase,
  Monitor,
  TrendingUp
} from 'lucide-react';
import { Patient, RecallNotification, User, UserRole } from './types';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import Dashboard from './components/Dashboard';
import RecallManager from './components/RecallManager';
import CalendarView from './components/CalendarView';

const Sidebar = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case '의사': return <Stethoscope className="w-5 h-5 text-blue-400" />;
      case '치위생사': return <Briefcase className="w-5 h-5 text-emerald-400" />;
      case '데스크': return <Monitor className="w-5 h-5 text-amber-400" />;
      case '경영지원': return <TrendingUp className="w-5 h-5 text-purple-400" />;
      default: return <UserIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">DentistCare</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        <Link to="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Activity className="w-5 h-5 text-slate-400" />
          <span>대시보드</span>
        </Link>
        <Link to="/patients" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Users className="w-5 h-5 text-slate-400" />
          <span>환자 관리</span>
        </Link>
        <Link to="/recalls" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span>리콜 관리</span>
        </Link>
        <Link to="/calendar" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span>예약 일정</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2">
          <div className="bg-slate-800 p-2 rounded-lg">
            {getRoleIcon(user.role)}
          </div>
          <div className="text-sm">
            <p className="text-white font-bold">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 w-full p-3 mt-4 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ notifications }: { notifications: RecallNotification[] }) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 w-96">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="차트번호 또는 이름 검색..." 
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer">
          <Bell className="w-6 h-6 text-slate-600 hover:text-blue-500 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
          D
        </div>
      </div>
    </header>
  );
};

const AuthPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('의사');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const user = authService.login(name, password);
      if (user) {
        onLogin(user);
      } else {
        alert('이름 또는 비밀번호가 일치하지 않습니다.');
      }
    } else {
      const success = authService.signup(name, role, password);
      if (success) {
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        setIsLogin(true);
      } else {
        alert('이미 존재하는 이름입니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-100 mb-6">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">DentistCare</h1>
            <p className="text-slate-400 font-medium mt-1">치과 전용 스마트 환자 관리 시스템</p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >로그인</button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >회원가입</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">사용자 이름</label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  required
                  placeholder="이름을 입력하세요"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">담당 역할</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['의사', '치위생사', '데스크', '경영지원'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all ${role === r ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm shadow-blue-50' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2"
            >
              {isLogin ? <Lock className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isLogin ? '시작하기' : '가입 완료'}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 p-8 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400 leading-relaxed">
            모든 데이터는 현재 기기의 브라우저 저장소(Local Storage)에 안전하게 보관됩니다. 
            개인정보 보호를 위해 공용 기기에서는 사용 후 반드시 로그아웃해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notifications, setNotifications] = useState<RecallNotification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      const loadedPatients = storageService.getPatients();
      setPatients(loadedPatients);
      
      const today = new Date().toISOString().split('T')[0];
      const newNotifications: RecallNotification[] = loadedPatients
        .filter(p => p.nextRecallDate === today)
        .map(p => ({
          id: crypto.randomUUID(),
          patientId: p.id,
          patientName: p.name,
          chartNumber: p.chartNumber,
          recallDate: p.nextRecallDate,
          isRead: false
        }));
      setNotifications(newNotifications);
    }
  }, [currentUser]);

  const refreshPatients = useCallback(() => {
    setPatients(storageService.getPatients());
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    navigate('/');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    navigate('/');
  };

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={currentUser} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col">
        <Header notifications={notifications} />
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard patients={patients} />} />
            <Route path="/patients" element={<PatientList patients={patients} onRefresh={refreshPatients} />} />
            <Route path="/patient/:id" element={<PatientDetail onRefresh={refreshPatients} />} />
            <Route path="/recalls" element={<RecallManager patients={patients} />} />
            <Route path="/calendar" element={<CalendarView patients={patients} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <MainApp />
    </HashRouter>
  );
};

export default App;
