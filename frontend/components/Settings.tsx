
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, CheckCircle2, XCircle, Globe, Server } from 'lucide-react';
import { dentwebService } from '../services/dentwebService';

const Settings: React.FC = () => {
    const [apiUrl, setApiUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('DENTWEB_API_URL');
        if (saved) {
            setApiUrl(saved);
        } else {
            // 기본값 표시 (env 상수가 아닌 하드코딩된 기본값은 서비스에서 처리하므로 여기선 비워둠)
            setApiUrl(window.location.protocol + '//' + window.location.hostname + ':3001');
        }
    }, []);

    const testConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        // 임시로 localStorage에 설정 (서비스가 이 값을 읽도록)
        const original = localStorage.getItem('DENTWEB_API_URL');
        localStorage.setItem('DENTWEB_API_URL', apiUrl);

        try {
            const ok = await dentwebService.checkHealth();
            if (ok) {
                setTestResult({ success: true, message: '서버 연결에 성공했습니다!' });
            } else {
                setTestResult({ success: false, message: '서버에 응답이 없거나 주소가 올바르지 않습니다.' });
            }
        } catch (err) {
            setTestResult({ success: false, message: '연결 중 오류가 발생했습니다.' });
        } finally {
            setIsTesting(false);
            // 원복 (저장 버튼을 누르기 전까진 정식 반영 안 함)
            if (original) localStorage.setItem('DENTWEB_API_URL', original);
            else localStorage.removeItem('DENTWEB_API_URL');
        }
    };

    const handleSave = () => {
        localStorage.setItem('DENTWEB_API_URL', apiUrl);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        alert('서버 설정이 저장되었습니다. 앱을 다시 시작할 필요 없이 즉시 적용됩니다.');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* 헤더 */}
            <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="bg-slate-900 p-4 rounded-2xl shadow-lg shadow-slate-100">
                        <SettingsIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">시스템 설정</h1>
                        <p className="text-slate-500 font-medium mt-1">치과별 서버 연동 및 앱 환경 설정</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 덴트웹 연동 설정 */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Server className="w-32 h-32 text-slate-900" />
                        </div>

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="bg-blue-50 p-2.5 rounded-xl">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">덴트웹 서버 연동 설정</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-500 ml-1">벡엔드 서버 주소 (API URL)</label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Server className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                                                placeholder="http://192.168.0.10:3001"
                                                value={apiUrl}
                                                onChange={(e) => setApiUrl(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={testConnection}
                                            disabled={isTesting}
                                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                        >
                                            {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                            {isTesting ? '연결 중...' : '연결 확인'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 ml-1">
                                        기본값: http://localhost:3001 (동일 PC 실행 시)
                                    </p>
                                </div>

                                {testResult && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {testResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        <span className="text-sm font-bold">{testResult.message}</span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-50">
                                    <button
                                        onClick={handleSave}
                                        className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
                                    >
                                        <Save className="w-6 h-6" />
                                        {saveSuccess ? '설정 저장 완료!' : '주소 설정 저장'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 도움말 카드 */}
                    <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-indigo-300" />
                            다중 치과 연동 가이드
                        </h3>
                        <div className="space-y-3 text-indigo-100 text-sm leading-relaxed font-medium">
                            <p>• 각 치과의 메인 PC에서 실행 중인 벡엔드 주소를 입력해 주세요.</p>
                            <p>• 같은 네트워크(와이파이) 환경이라면 <b>내부 IP 주소</b>를 사용하면 됩니다.</p>
                            <p>• 외부에서 접속하려면 Cloudflare Tunnel과 같은 <b>보안 주소</b>를 입력해 주세요.</p>
                            <p>• 설정된 주소는 현재 사용하는 웹 브라우저에만 적용됩니다.</p>
                        </div>
                    </div>
                </div>

                {/* 사이드 카드: 정보 */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">시스템 정보</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 font-medium">버전</span>
                                <span className="text-slate-900 font-black">v1.2.0</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 font-medium">데이터 저장</span>
                                <span className="text-slate-600 font-bold">로컬 브라우저</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 font-medium">연동 방식</span>
                                <span className="text-blue-600 font-bold">SQL Direct API</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 leading-relaxed text-center font-medium">
                            설정 초기화가 필요하신 경우 브라우저의 캐시/데이터 삭제를 진행해 주세요.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
