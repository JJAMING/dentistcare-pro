
import React, { useState, useMemo } from 'react';
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
    Square
} from 'lucide-react';
import { Patient, Payment } from '../types';

interface MonthlyPaymentsProps {
    patients: Patient[];
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
}

const MonthlyPayments: React.FC<MonthlyPaymentsProps> = ({ patients }) => {
    const navigate = useNavigate();
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

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
        setCheckedItems(new Set()); // 월 변경 시 체크 초기화
    };

    const toggleCheck = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const uncheckAll = () => {
        setCheckedItems(new Set());
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
                                paymentNote: payment.note || ''
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

    // 일자별 그룹핑
    const groupedByDate = useMemo(() => {
        const groups: Record<string, PaymentEntry[]> = {};
        monthlyEntries.forEach(entry => {
            if (!groups[entry.paymentDate]) {
                groups[entry.paymentDate] = [];
            }
            groups[entry.paymentDate].push(entry);
        });
        return groups;
    }, [monthlyEntries]);

    // 환자별 합계
    const patientTotals = useMemo(() => {
        const totals: Record<string, { id: string; name: string; chartNumber: string; phone: string; total: number; count: number }> = {};
        monthlyEntries.forEach(entry => {
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
    }, [monthlyEntries]);

    const totalRevenue = monthlyEntries.reduce((sum, e) => sum + e.paymentAmount, 0);
    const totalPatients = patientTotals.length;
    const totalTransactions = monthlyEntries.length;

    // CSV 내보내기
    const handleExportCSV = () => {
        const header = '날짜,환자명,차트번호,전화번호,진료내용,수납금액,비고';
        const rows = monthlyEntries.map(e =>
            `${e.paymentDate},${e.patientName},${e.chartNumber},${e.phone},"${e.treatmentContent}",${e.paymentAmount},${e.paymentNote}`
        );
        const csv = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `월별수납_${selectedYear}년${selectedMonth}월.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-8 animate-in fade-in duration-500 overflow-hidden">
            <div className="bg-white rounded-[1.5rem] lg:rounded-[2rem] shadow-sm border border-slate-200 w-full h-full overflow-hidden flex flex-col">
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
                        {checkedItems.size > 0 && (
                            <button
                                onClick={uncheckAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200 animate-in fade-in"
                            >
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                                모두 해제 ({checkedItems.size})
                            </button>
                        )}
                        <button
                            onClick={handleExportCSV}
                            disabled={monthlyEntries.length === 0}
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
                <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-slate-50/50 shrink-0">
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">총 매출</span>
                        </div>
                        <p className="text-base lg:text-xl font-black text-indigo-600 truncate">
                            {totalRevenue.toLocaleString()}<span className="text-[10px] text-slate-400 ml-0.5 font-bold">원</span>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {monthlyEntries.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-bold text-lg">수납 내역이 없습니다</p>
                            <p className="text-sm mt-1">{selectedYear}년 {selectedMonth}월 수납 기록이 없습니다.</p>
                        </div>
                    ) : (
                        <>
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

                                        {entries.map((entry, idx) => {
                                            const entryKey = `${entry.patientId}-${date}-${idx}`;
                                            const isChecked = checkedItems.has(entryKey);

                                            return (
                                                <div
                                                    key={entryKey}
                                                    onClick={() => navigate(`/patient/${entry.patientId}`)}
                                                    className={`bg-white border rounded-xl p-3 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group ${isChecked ? 'border-indigo-400 bg-indigo-50/30 shadow-sm' : 'border-slate-100'}`}
                                                >
                                                    <div
                                                        onClick={(e) => toggleCheck(entryKey, e)}
                                                        className="p-1 -ml-1 hover:bg-slate-100 rounded text-slate-300 hover:text-indigo-500 transition-colors shrink-0"
                                                    >
                                                        {isChecked ? (
                                                            <CheckSquare className="w-5 h-5 text-indigo-500" />
                                                        ) : (
                                                            <Square className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${isChecked ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
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
