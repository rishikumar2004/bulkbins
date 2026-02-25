import React, { useMemo, useState } from 'react';
import {
    BarChart3,
    Calendar,
    TrendingUp,
    Calculator,
    TrendingDown,
    DollarSign,
    Package,
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    CreditCard,
    ChevronDown,
    Wand2,
    Search
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import SegmentedControl from './SegmentedControl';
import ThemedDatePicker from './ThemedDatePicker';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatINR } from '../utils/formatCurrency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const SimpleSummaryDashboard = ({ transactions = [] }) => {
    const [period, setPeriod] = useState('Weekly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const aggregatedData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let labels = [];
        let revenueData = [];
        let expenseData = [];
        let profitData = [];

        if (period === 'Daily') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = d.toLocaleDateString([], { weekday: 'short' });
                labels.push(label);

                const dayTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.toDateString() === d.toDateString();
                });

                const rev = dayTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0);
                const exp = dayTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
                const prof = dayTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0);

                revenueData.push(rev);
                expenseData.push(exp);
                profitData.push(prof);
            }
        } else if (period === 'Weekly') {
            // Current month by weeks (approximate)
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            for (let w = 0; w < 4; w++) {
                const startDay = w * 7 + 1;
                const endDay = (w + 1) * 7;

                const weekTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth && tDate.getDate() >= startDay && tDate.getDate() <= endDay;
                });

                const rev = weekTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0);
                const exp = weekTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
                const prof = weekTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0);

                revenueData.push(rev);
                expenseData.push(exp);
                profitData.push(prof);
            }
        } else if (period === 'Monthly') {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.forEach((month, idx) => {
                const monthTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.getFullYear() === currentYear && tDate.getMonth() === idx;
                });
                revenueData.push(monthTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(monthTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(monthTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            });
        } else if (period === 'Quarterly') {
            labels = ['Q1', 'Q2', 'Q3', 'Q4'];
            for (let q = 0; q < 4; q++) {
                const quarterTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    const tQ = Math.floor(tDate.getMonth() / 3);
                    return tDate.getFullYear() === currentYear && tQ === q;
                });
                revenueData.push(quarterTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(quarterTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(quarterTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            }
        } else if (period === 'Yearly') {
            const years = [...new Set(transactions.map(t => new Date(t.timestamp).getFullYear()))].sort();
            labels = years.length > 0 ? years.map(String) : [currentYear.toString()];
            labels.forEach(year => {
                const yearTxns = transactions.filter(t => new Date(t.timestamp).getFullYear().toString() === year);
                revenueData.push(yearTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(yearTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(yearTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            });
        } else if (period === 'HalfYearly') {
            labels = ['H1 (Jan-Jun)', 'H2 (Jul-Dec)'];
            for (let h = 0; h < 2; h++) {
                const halfTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    const m = tDate.getMonth();
                    return tDate.getFullYear() === currentYear && (h === 0 ? m < 6 : m >= 6);
                });
                revenueData.push(halfTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(halfTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(halfTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            }
        } else if (period === 'Custom') {
            if (customStart && customEnd) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                const filtered = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate >= start && tDate <= end;
                });
                // Group by month within the custom range
                const monthMap = {};
                filtered.forEach(t => {
                    const d = new Date(t.timestamp);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthMap[key]) monthMap[key] = { rev: 0, exp: 0, prof: 0 };
                    if (t.type === 'Sale') monthMap[key].rev += t.amount;
                    if (t.type === 'Expense') monthMap[key].exp += t.amount;
                    monthMap[key].prof += (t.profit || (t.type === 'Sale' ? t.amount : -t.amount));
                });
                const sortedKeys = Object.keys(monthMap).sort();
                labels = sortedKeys;
                sortedKeys.forEach(k => {
                    revenueData.push(monthMap[k].rev);
                    expenseData.push(monthMap[k].exp);
                    profitData.push(monthMap[k].prof);
                });
            }
        }

        return { labels, revenueData, expenseData, profitData };
    }, [transactions, period, customStart, customEnd]);

    const chartData = {
        labels: aggregatedData.labels,
        datasets: [
            {
                label: 'Revenue',
                data: aggregatedData.revenueData,
                backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue
                borderRadius: 8,
            },
            {
                label: 'Expenses',
                data: aggregatedData.expenseData,
                backgroundColor: 'rgba(244, 63, 94, 0.6)', // Rose
                borderRadius: 8,
            },
            {
                label: 'Profit',
                data: aggregatedData.profitData,
                backgroundColor: 'rgba(16, 185, 129, 0.6)', // Emerald
                borderRadius: 8,
            }
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { weight: 'bold' } } },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1' }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
        }
    };

    const periodTotalProfit = aggregatedData.profitData.reduce((acc, val) => acc + val, 0);

    return (
        <div className="bg-slate-50 rounded-[2.5rem] p-8 text-slate-900 shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-10">
                <div className="p-3 bg-indigo-900 rounded-2xl text-white">
                    <Calculator className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Profit Calculation Dashboard</h2>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{period} Profit Analysis</h3>
                    </div>

                    {/* Period Switcher */}
                    <SegmentedControl
                        name="summary-period"
                        value={period}
                        onChange={setPeriod}
                        options={[
                            { value: 'Daily', label: 'Daily' },
                            { value: 'Weekly', label: 'Weekly' },
                            { value: 'Monthly', label: 'Monthly' },
                            { value: 'Quarterly', label: 'Quarterly' },
                            { value: 'HalfYearly', label: 'Half-Year' },
                            { value: 'Yearly', label: 'Yearly' },
                            { value: 'Custom', label: 'Custom' },
                        ]}
                        activeColor="bg-indigo-900"
                    />
                </div>

                {/* Custom Date Range Pickers */}
                {period === 'Custom' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white/60 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2">From</span>
                            <ThemedDatePicker
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-[180px]"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">To</span>
                            <ThemedDatePicker
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-[180px]"
                            />
                        </div>
                        {(!customStart || !customEnd) && (
                            <span className="text-[10px] text-amber-500 font-bold ml-1 animate-pulse">Select both dates</span>
                        )}
                    </div>
                )}

                <div className="h-[300px] mb-10">
                    <Bar data={chartData} options={options} />
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-10 ml-2">
                    <div className="flex items-center space-x-3 text-indigo-600">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-bold">Automatic profit calculation</span>
                    </div>
                    <div className="flex items-center space-x-3 text-indigo-500">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm font-bold">Daily/weekly/monthly summaries</span>
                    </div>
                    <div className="flex items-center space-x-3 text-indigo-400">
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-sm font-bold">Revenue vs expenses breakdown</span>
                    </div>
                </div>

                {/* Status Footer */}
                <div className="bg-indigo-50 rounded-2xl p-6 flex justify-between items-center">
                    <div className="flex items-center space-x-3 text-indigo-700">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-bold">Current {period} Profit</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">
                        {periodTotalProfit >= 0 ? '+' : ''}{formatINR(periodTotalProfit)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleSummaryDashboard;
