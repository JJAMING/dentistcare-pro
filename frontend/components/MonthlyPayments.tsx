
import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    User,
    Phone,
    Download,
    TrendingUp,
    CreditCard,
    Hash,
    MapPin,
    CalendarDays,
    CheckSquare,
    Square,
    Trash2,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    XCircle
} from 'lucide-react';
import { Patient } from '../types';
import { storageService } from '../services/storageService';
import { PaymentReconciliationResult, ReconciliationStatus, paymentReconciliationService } from '../services/paymentReconciliationService';

interface MonthlyPaymentsProps {
    patients: Patient[];
    onRefresh: () => void;
}

interface PaymentEntry {
    patientId: string;
    patientName: string;
    chartNumber: string;
    phone: string;
    treatmentContent: string;
    paymentDate: string;
    paymentAmount: number;
    paymentNote: string;
    treatmentId: string;
    paymentId: string;
    isConfirmed: boolean;
    deletedAt?: string;
}

const MonthlyPayments: React.FC<MonthlyPaymentsProps> = ({ patients, onRefresh }) => {
    const navigate = useNavigate();
    const reconciliationInputRef = useRef<HTMLInputElement>(null);
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [reconciliation, setReconciliation] = useState<PaymentReconciliationResult | null>(null);
    const [isReconciling, setIsReconciling] = useState(false);
    const [reconciliationError, setReconciliationError] = useState('');

    const goToPrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedYear(y => y - 1);
            setSelectedMonth(12);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedYear(y => y + 1);
            setSelectedMonth(1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    const toggleCheck = (entry: PaymentEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedPatients = storageService.getPatients().map(patient => {
            if (patient.id !== entry.patientId) return patient;
            return {
                ...patient,
                treatments: patient.treatments.map(treatment => {
                    if (treatment.id !== entry.treatmentId) return treatment;
                    return {
                        ...treatment,
                        payments: (treatment.payments || []).map(payment =>
                            payment.id === entry.paymentId
                                ? {
                                    ...payment,
                                    isConfirmed: !payment.isConfirmed,
                                    confirmedAt: payment.isConfirmed ? undefined : new Date().toISOString()
                                }
                                : payment
                        )
                    };
                })
            };
        });
        storageService.savePatients(updatedPatients);
        onRefresh();
    };

    const uncheckAll = () => {
        const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const updatedPatients = storageService.getPatients().map(patient => ({
            ...patient,
            treatments: patient.treatments.map(treatment => ({
                ...treatment,
                payments: (treatment.payments || []).map(payment =>
                    payment.isConfirmed && payment.date?.startsWith(yearMonth)
                        ? { ...payment, isConfirmed: false, confirmedAt: undefined }
                        : payment
                )
            }))
        }));
        storageService.savePatients(updatedPatients);
        onRefresh();
    };

    // 선택한 월의 수납 내역 추출
    const monthlyEntries = useMemo<PaymentEntry[]>(() => {
        const entries: PaymentEntry[] = [];
        const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

        patients.forEach(patient => {
            (patient.treatments || []).forEach(treatment => {
                (treatment.payments || []).forEach(payment => {
                    if (payment.date && payment.date.startsWith(yearMonth)) {
                        const amount = parseFloat((payment.amount || '0').replace(/[^0-9.]/g, ''));
                        if (!isNaN(amount) && amount > 0) {
                            entries.push({
                                patientId: patient.id,
                                patientName: patient.name,
                                chartNumber: patient.chartNumber,
                                phone: patient.phone,
                                treatmentContent: treatment.content || '(미입력)',
                                paymentDate: payment.date,
                                paymentAmount: amount,
                                paymentNote: payment.note || '',
                                treatmentId: treatment.id,
                                paymentId: payment.id,
                                isConfirmed: !!payment.isConfirmed
                            });
                        }
                    }
                });
            });
        });

        // 날짜순 정렬
        entries.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
        return entries;
    }, [patients, selectedYear, selectedMonth]);

    const deletedMonthlyEntries = useMemo<PaymentEntry[]>(() => {
        const entries: PaymentEntry[] = [];
        const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

        patients.forEach(patient => {
            (patient.treatments || []).forEach(treatment => {
                (treatment.deletedPayments || []).forEach(payment => {
                    if (payment.date && payment.date.startsWith(yearMonth)) {
                        const amount = parseFloat((payment.amount || '0').replace(/[^0-9.]/g, ''));
                        if (!isNaN(amount) && amount > 0) {
                            entries.push({
                                patientId: patient.id,
                                patientName: patient.name,
                                chartNumber: patient.chartNumber,
                                phone: patient.phone,
                                treatmentContent: treatment.content || '(誘몄엯??',
                                paymentDate: payment.date,
                                paymentAmount: amount,
                                paymentNote: payment.note || '',
                                treatmentId: treatment.id,
                                paymentId: payment.id,
                                isConfirmed: false,
                                deletedAt: payment.deletedAt
                            });
                        }
                    }
                });
            });
        });

        entries.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
        return entries;
    }, [patients, selectedYear, selectedMonth]);

    const confirmedEntries = useMemo(
        () => monthlyEntries.filter(entry => entry.isConfirmed),
        [monthlyEntries]
    );
    const visibleEntries = useMemo(
        () => monthlyEntries.filter(entry => !entry.isConfirmed),
        [monthlyEntries]
    );

    // 확인되지 않은 수납만 일자별로 표시
    const groupedByDate = useMemo(() => {
        const groups: Record<string, PaymentEntry[]> = {};
        visibleEntries.forEach(entry => {
            if (!groups[entry.paymentDate]) {
                groups[entry.paymentDate] = [];
            }
            groups[entry.paymentDate].push(entry);
        });
        return groups;
    }, [visibleEntries]);

    // 환자별 합계
    const patientTotals = useMemo(() => {
        const totals: Record<string, { id: string; name: string; chartNumber: string; phone: string; total: number; count: number }> = {};
        visibleEntries.forEach(entry => {
            if (!totals[entry.patientId]) {
                totals[entry.patientId] = {
                    id: entry.patientId,
                    name: entry.patientName,
                    chartNumber: entry.chartNumber,
                    phone: entry.phone,
                    total: 0,
                    count: 0
                };
            }
            totals[entry.patientId].total += entry.paymentAmount;
            totals[entry.patientId].count += 1;
        });
        return Object.values(totals).sort((a, b) => b.total - a.total);
    }, [visibleEntries]);

    const totalRevenue = monthlyEntries.reduce((sum, e) => sum + e.paymentAmount, 0);
    const confirmedRevenue = confirmedEntries.reduce((sum, e) => sum + e.paymentAmount, 0);
    const totalDeletedAmount = deletedMonthlyEntries.reduce((sum, e) => sum + e.paymentAmount, 0);
    const totalPatients = patientTotals.length;
    const totalTransactions = monthlyEntries.length;
    const confirmedTransactions = confirmedEntries.length;
    const totalDeletedTransactions = deletedMonthlyEntries.length;
    const hasAnyEntries = monthlyEntries.length > 0 || deletedMonthlyEntries.length > 0;

    // CSV 내보내기
    const handleExportCSV = () => {
        const header = '날짜,환자명,차트번호,전화번호,진료내용,수납금액,확인상태,비고';
        const rows = monthlyEntries.map(e =>
            `${e.paymentDate},${e.patientName},${e.chartNumber},${e.phone},"${e.treatmentContent}",${e.paymentAmount},${e.isConfirmed ? '확인 완료' : '미확인'},${e.paymentNote}`
        );
        const deletedRows = deletedMonthlyEntries.map(e =>
            `${e.paymentDate},${e.patientName},${e.chartNumber},${e.phone},"[삭제] ${e.treatmentContent}",${e.paymentAmount},삭제,${e.paymentNote}${e.deletedAt ? ` / 삭제: ${e.deletedAt}` : ''}`
        );
        const csv = '\uFEFF' + [header, ...rows, ...deletedRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `월별수납_${selectedYear}년${selectedMonth}월.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleReconciliationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setIsReconciling(true);
        setReconciliationError('');
        try {
            const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const result = await paymentReconciliationService.reconcile(
                file,
                monthlyEntries.map(entry => ({
                    patientId: entry.patientId,
                    patientName: entry.patientName,
                    chartNumber: entry.chartNumber,
                    paymentDate: entry.paymentDate,
                    paymentAmount: entry.paymentAmount,
                    paymentNote: entry.paymentNote
                })),
                yearMonth
            );
            setReconciliation(result);
        } catch (error) {
            console.error('Payment reconciliation failed:', error);
            setReconciliationError('엑셀 파일을 읽지 못했습니다. 수납일, 환자명, 금액 열을 확인해 주세요.');
        } finally {
            setIsReconciling(false);
        }
    };

    const statusMeta: Record<ReconciliationStatus, { label: string; className: string; icon: React.ReactNode }> = {
        matched: { label: '일치', className: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        'excel-only': { label: '엑셀만 있음', className: 'bg-amber-100 text-amber-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        'app-only': { label: '앱만 있음', className: 'bg-blue-100 text-blue-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        'date-mismatch': { label: '날짜 차이', className: 'bg-rose-100 text-rose-700', icon: <XCircle className="w-3.5 h-3.5" /> },
        'amount-mismatch': { label: '금액 차이', className: 'bg-rose-100 text-rose-700', icon: <XCircle className="w-3.5 h-3.5" /> }
    };

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-8 animate-in fade-in duration-500 overflow-hidden">
            <div className="bg-white rounded-[1.5rem] lg:rounded-[2rem] shadow-sm border border-slate-200 w-full h-full overflow-hidden flex flex-col">
                {(reconciliation || reconciliationError) && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" onMouseDown={() => { setReconciliation(null); setReconciliationError(''); }}>
                        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
                            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                                <div>
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <FileSpreadsheet className="h-5 w-5" />
                                        <p className="text-sm font-bold">엑셀 수납 대조</p>
                                    </div>
                                    <h3 className="mt-1 text-xl font-black text-slate-800">
                                        {selectedYear}년 {selectedMonth}월 대조 결과
                                    </h3>
                                    {reconciliation && <p className="mt-1 text-sm text-slate-500">{reconciliation.fileName}</p>}
                                </div>
                                <button type="button" onClick={() => { setReconciliation(null); setReconciliationError(''); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {reconciliationError ? (
                                <div className="p-8 text-center">
                                    <XCircle className="mx-auto h-10 w-10 text-rose-500" />
                                    <p className="mt-3 font-bold text-slate-800">{reconciliationError}</p>
                                </div>
                            ) : reconciliation && (
                                <>
                                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50 p-5 lg:grid-cols-4">
                                        <div className="rounded-xl bg-white p-3 border border-emerald-100"><p className="text-xs font-bold text-slate-400">일치</p><p className="mt-1 text-xl font-black text-emerald-600">{reconciliation.matchedCount}건</p></div>
                                        <div className="rounded-xl bg-white p-3 border border-amber-100"><p className="text-xs font-bold text-slate-400">엑셀만 있음</p><p className="mt-1 text-xl font-black text-amber-600">{reconciliation.excelOnlyCount}건</p></div>
                                        <div className="rounded-xl bg-white p-3 border border-blue-100"><p className="text-xs font-bold text-slate-400">앱만 있음</p><p className="mt-1 text-xl font-black text-blue-600">{reconciliation.appOnlyCount}건</p></div>
                                        <div className="rounded-xl bg-white p-3 border border-rose-100"><p className="text-xs font-bold text-slate-400">날짜·금액 차이</p><p className="mt-1 text-xl font-black text-rose-600">{reconciliation.dateMismatchCount + reconciliation.amountMismatchCount}건</p></div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-3 text-sm">
                                        <span className="font-bold text-slate-500">엑셀 합계 <strong className="ml-1 text-slate-800">{reconciliation.excelTotal.toLocaleString()}원</strong></span>
                                        <span className="font-bold text-slate-500">앱 합계 <strong className="ml-1 text-slate-800">{reconciliation.appTotal.toLocaleString()}원</strong></span>
                                        <span className={`rounded-lg px-2 py-1 text-xs font-black ${reconciliation.excelTotal === reconciliation.appTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            차액 {(reconciliation.excelTotal - reconciliation.appTotal).toLocaleString()}원
                                        </span>
                                    </div>
                                    <div className="max-h-[52vh] overflow-y-auto p-4">
                                        {reconciliation.items.length === 0 ? (
                                            <div className="py-10 text-center text-slate-500">선택한 월에 대조할 수납 내역이 없습니다.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {[...reconciliation.items].sort((a, b) => Number(a.status === 'matched') - Number(b.status === 'matched')).map((item, index) => {
                                                    const meta = statusMeta[item.status];
                                                    const excel = item.excel;
                                                    const app = item.app;
                                                    return (
                                                        <div key={`${item.status}-${index}`} className="rounded-xl border border-slate-100 bg-white p-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black ${meta.className}`}>{meta.icon}{meta.label}</span>
                                                                <span className="font-black text-slate-800">{excel?.patientName || app?.patientName}</span>
                                                                {app?.chartNumber && <span className="text-xs font-bold text-slate-400">#{app.chartNumber}</span>}
                                                            </div>
                                                            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600"><span className="font-bold text-slate-400">엑셀</span> {excel ? `${excel.paymentDate} · ${excel.paymentAmount.toLocaleString()}원` : '없음'}</div>
                                                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600"><span className="font-bold text-slate-400">앱</span> {app ? `${app.paymentDate} · ${app.paymentAmount.toLocaleString()}원` : '없음'}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {reconciliation.ignoredRowCount > 0 && <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">필수 값이 없는 {reconciliation.ignoredRowCount}개 행은 제외되었습니다.</p>}
                                </>
                            )}
                        </div>
                    </div>
                )}
                {/* 헤더 */}
                <div className="p-5 lg:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base lg:text-lg font-black text-slate-900 leading-tight">월별 수납 내역</h3>
                            <p className="text-[11px] lg:text-xs text-slate-500 font-medium">매출 보고용 월별 수납 현황</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {confirmedTransactions > 0 && (
                            <button
                                onClick={uncheckAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200 animate-in fade-in"
                            >
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                                모두 해제 ({confirmedTransactions})
                            </button>
                        )}
                        <button
                            onClick={() => reconciliationInputRef.current?.click()}
                            disabled={isReconciling}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isReconciling ? <FileSpreadsheet className="w-3.5 h-3.5 animate-pulse" /> : <Upload className="w-3.5 h-3.5" />}
                            {isReconciling ? '대조 중...' : '엑셀 대조'}
                        </button>
                        <input
                            ref={reconciliationInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleReconciliationUpload}
                            className="hidden"
                        />
                        <button
                            onClick={handleExportCSV}
                            disabled={!hasAnyEntries}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-200 disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5" />
                            CSV 내보내기
                        </button>
                    </div>
                </div>

                {/* 월 선택 */}
                <div className="flex items-center justify-center gap-4 py-4 border-b border-slate-100 bg-white shrink-0">
                    <button
                        onClick={goToPrevMonth}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span className="text-lg font-black text-slate-800">
                            {selectedYear}년 {selectedMonth}월
                        </span>
                    </div>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* 요약 카드 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/50 shrink-0">
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">총 매출</span>
                        </div>
                        <p className="text-base lg:text-xl font-black text-indigo-600 truncate">
                            {totalRevenue.toLocaleString()}<span className="text-[10px] text-slate-400 ml-0.5 font-bold">원</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">확인 매출</span>
                        </div>
                        <p className="text-base lg:text-xl font-black text-emerald-600 truncate">
                            {confirmedRevenue.toLocaleString()}<span className="text-[10px] text-slate-400 ml-0.5 font-bold">원</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">수납 환자</span>
                        </div>
                        <p className="text-base lg:text-xl font-black text-emerald-600 truncate">
                            {totalPatients}<span className="text-[10px] text-slate-400 ml-0.5 font-bold">명</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">수납 건수</span>
                        </div>
                        <p className="text-base lg:text-xl font-black text-amber-600 truncate">
                            {totalTransactions}<span className="text-[10px] text-slate-400 ml-0.5 font-bold">건</span>
                        </p>
                    </div>
                </div>

                {/* 리스트 본문 */}
                {totalDeletedTransactions > 0 && (
                    <div className="px-6 py-3 border-t border-red-50 bg-red-50/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-black text-red-500">삭제 수납 {totalDeletedTransactions}건</span>
                        </div>
                        <span className="text-sm font-black text-red-500">{totalDeletedAmount.toLocaleString()}원</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {!hasAnyEntries ? (
                        <div className="text-center py-16 text-slate-400">
                            <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-bold text-lg">수납 내역이 없습니다</p>
                            <p className="text-sm mt-1">{selectedYear}년 {selectedMonth}월 수납 기록이 없습니다.</p>
                        </div>
                    ) : (
                        <>
                            {visibleEntries.length === 0 && monthlyEntries.length > 0 && (
                                <div className="text-center py-12 text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                    <CheckSquare className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                                    <p className="font-black">이번 달 수납을 모두 확인했습니다.</p>
                                    <p className="text-sm mt-1 text-emerald-500">상단의 모두 해제를 누르면 다시 목록에 표시됩니다.</p>
                                </div>
                            )}
                            {/* 일자별 그룹 */}
                            {Object.keys(groupedByDate).sort().map(date => {
                                const entries = groupedByDate[date];
                                const dayTotal = entries.reduce((s, e) => s + e.paymentAmount, 0);
                                const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', {
                                    month: 'long', day: 'numeric', weekday: 'short'
                                });

                                return (
                                    <div key={date} className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                                    {dayLabel}
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">{entries.length}건</span>
                                            </div>
                                            <span className="text-sm font-black text-indigo-600">
                                                {dayTotal.toLocaleString()}<span className="text-xs ml-0.5 font-bold">원</span>
                                            </span>
                                        </div>

                                        {entries.map((entry) => {
                                            const entryKey = `${entry.patientId}-${entry.treatmentId}-${entry.paymentId}`;

                                            return (
                                                <div
                                                    key={entryKey}
                                                    onClick={() => navigate(`/patient/${entry.patientId}`)}
                                                    className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                                                >
                                                    <div
                                                        onClick={(e) => toggleCheck(entry, e)}
                                                        className="p-1 -ml-1 hover:bg-slate-100 rounded text-slate-300 hover:text-indigo-500 transition-colors shrink-0"
                                                    >
                                                        <Square className="w-5 h-5" />
                                                    </div>
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 bg-indigo-50 text-indigo-600 transition-colors">
                                                        {entry.patientName[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm lg:text-base text-slate-800 truncate">{entry.patientName}</span>
                                                            <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                                <Hash className="w-3 h-3 inline mr-0.5" />{entry.chartNumber}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                                                <Phone className="w-3.5 h-3.5" />{entry.phone}
                                                            </span>
                                                            <span className="text-xs text-slate-400 truncate max-w-[150px] font-medium hidden sm:inline">
                                                                {entry.treatmentContent}
                                                            </span>
                                                            {entry.paymentNote && (
                                                                <span className="text-[11px] text-slate-400 italic font-medium">({entry.paymentNote})</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-auto">
                                                        <p className="text-base font-black text-indigo-700">
                                                            {entry.paymentAmount.toLocaleString()}<span className="text-[11px] text-slate-400 font-bold ml-0.5">원</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {/* 환자별 합계 */}
                            {deletedMonthlyEntries.length > 0 && (
                                <div className="mt-6 pt-4 border-t-2 border-red-100">
                                    <h4 className="text-xs font-black text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Trash2 className="w-3.5 h-3.5" />
                                        삭제된 수납 내역
                                    </h4>
                                    <div className="space-y-2">
                                        {deletedMonthlyEntries.map((entry, idx) => {
                                            const deletedLabel = entry.deletedAt
                                                ? new Date(entry.deletedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                : '';

                                            return (
                                                <div
                                                    key={`${entry.patientId}-deleted-${entry.paymentDate}-${idx}`}
                                                    onClick={() => navigate(`/patient/${entry.patientId}`)}
                                                    className="bg-red-50/70 border border-red-100 rounded-xl p-3 flex items-center gap-3 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                                                >
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white text-red-400 border border-red-100 shrink-0">
                                                        <Trash2 className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm lg:text-base text-slate-700 truncate">{entry.patientName}</span>
                                                            <span className="text-[11px] font-black text-slate-400 bg-white px-2 py-1 rounded border border-red-50">
                                                                <Hash className="w-3 h-3 inline mr-0.5" />{entry.chartNumber}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-slate-400">{entry.paymentDate}</span>
                                                            {deletedLabel && <span className="text-xs text-red-300 font-bold">삭제: {deletedLabel}</span>}
                                                            {entry.paymentNote && <span className="text-[11px] text-slate-400 italic">({entry.paymentNote})</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-auto">
                                                        <p className="text-base font-black text-red-500 line-through">
                                                            {entry.paymentAmount.toLocaleString()}<span className="text-[11px] text-slate-400 font-bold ml-0.5">원</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t-2 border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    환자별 수납 합계
                                </h4>
                                <div className="space-y-2">
                                    {patientTotals.map((pt, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => navigate(`/patient/${pt.id}`)}
                                            className="flex items-center justify-between bg-slate-50 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all rounded-xl px-4 py-3.5 border border-slate-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-300 w-6 text-center">{idx + 1}</span>
                                                <div>
                                                    <span className="font-bold text-sm lg:text-base text-slate-700">{pt.name}</span>
                                                    <span className="text-[11px] text-slate-400 ml-2 font-black">#{pt.chartNumber}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-base font-black text-indigo-600">{pt.total.toLocaleString()}원</span>
                                                <span className="text-[11px] text-slate-400 ml-2 font-black group-hover:text-indigo-400">({pt.count}건)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )
                    }
                </div>

                {/* 하단 합계 바 */}
                {totalRevenue > 0 && (
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-white/70" />
                            <span className="font-bold text-sm">
                                {selectedYear}년 {selectedMonth}월 총 매출
                            </span>
                        </div>
                        <span className="text-2xl font-black">
                            ₩{totalRevenue.toLocaleString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlyPayments;
