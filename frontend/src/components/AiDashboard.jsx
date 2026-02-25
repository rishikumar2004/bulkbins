import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import CustomSelect from '../components/CustomSelect';
import SegmentedControl from '../components/SegmentedControl';
import ThemedDatePicker from '../components/ThemedDatePicker';
import ExportModal from '../components/ExportModal';
import { getAiDashboard, exportReportExcel, exportReportPdf } from "../services/aiApi";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { formatINR } from '../utils/formatCurrency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function Dashboard(props) {
    const { businessId: propBusinessId, theme } = props;
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total_sales: 0,
        total_cogs: 0,
        gross_profit: 0,
        total_expenses: 0,
        net_profit: 0,
        prediction: { amount: 0, confidence: "" },
        reorder_recommendations: [],
        alerts: [],
        weekly_analysis: [],
        expense_breakdown: [],
        monthly_profit_trend: [],
        monthly_summary: {
            this_month: { sales: 0, expenses: 0, profit: 0 },
            last_month: { sales: 0, expenses: 0, profit: 0 },
            growth: { sales: 0, profit: 0 }
        },
        product_performance: {
            top_profitable: [],
            low_stock: [],
            low_margin: []
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [reportGranularity, setReportGranularity] = useState(props.reportGranularity || 'monthly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showReportsMenu, setShowReportsMenu] = useState(false);

    // --- Dynamic Date Logic ---
    const getDynamicDateRange = () => {
        const today = new Date();
        const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (reportGranularity === 'daily') {
            return formatDate(today);
        } else if (reportGranularity === 'weekly') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 6);
            return `${formatDate(lastWeek)} – ${formatDate(today)}`;
        } else if (reportGranularity === 'monthly') {
            const lastMonth = new Date(today);
            lastMonth.setDate(today.getDate() - 29);
            return `${formatDate(lastMonth)} – ${formatDate(today)}`;
        } else if (reportGranularity === 'custom' && customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            return `${formatDate(start)} – ${formatDate(end)}`;
        }
        return `${formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000))} – ${formatDate(today)}`; // default fallback
    };

    useEffect(() => {
        if (props.reportGranularity) {
            setReportGranularity(props.reportGranularity);
        }
    }, [props.reportGranularity]);

    const downloadFile = (content, fileName, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const convertToCSV = (data) => {
        if (!data || !data.length) return "";
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || "")).join(","));
        return [headers.join(","), ...rows].join("\n");
    };

    const role = localStorage.getItem("role");
    const businessId = propBusinessId || localStorage.getItem("activeBusinessId");

    // Sync with prop granularity
    useEffect(() => {
        if (props.reportGranularity) {
            setReportGranularity(props.reportGranularity);
        }
    }, [props.reportGranularity]);

    useEffect(() => {
        if (businessId) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    let data;
                    if (reportGranularity === 'custom' && customStart && customEnd) {
                        data = await getAiDashboard(businessId, reportGranularity, customStart, customEnd);
                    } else if (reportGranularity !== 'custom') {
                        data = await getAiDashboard(businessId, reportGranularity);
                    }
                    if (data) setStats(data);
                } catch (err) {
                    console.error("Dashboard fetch error:", err);
                    toast.error("Failed to refresh analytics");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [businessId, reportGranularity, customStart, customEnd]);

    //   if (!businessId) {
    //     navigate("/my-businesses");
    //     return null;
    //   }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // --- CHART DATA CONFIG ---
    const chartData = {
        labels: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.label) : [],
        datasets: [
            {
                label: 'Revenue',
                data: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.revenue) : [],
                backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
                borderColor: isDark ? '#93c5fd' : '#2563eb',
                borderWidth: 1,
                borderRadius: 6,
            },
            {
                label: 'Expenses',
                data: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.expenses) : [],
                backgroundColor: isDark ? '#94a3b8' : '#64748b',
                borderColor: isDark ? '#cbd5e1' : '#475569',
                borderWidth: 1,
                borderRadius: 6,
            },
            {
                label: 'Profit',
                data: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.profit) : [],
                backgroundColor: isDark ? '#34d399' : '#10b981',
                borderColor: isDark ? '#6ee7b7' : '#059669',
                borderWidth: 1,
                borderRadius: 6,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11, weight: 'bold' }, color: textColor, padding: 16 } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } }
        }
    };

    const expenseChartData = {
        labels: stats.expense_breakdown ? stats.expense_breakdown.map(e => e.category) : [],
        datasets: [{
            data: stats.expense_breakdown ? stats.expense_breakdown.map(e => e.amount) : [],
            backgroundColor: isDark
                ? ['#60a5fa', '#34d399', '#94a3b8', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#818cf8']
                : ['#3b82f6', '#10b981', '#64748b', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'],
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
        }]
    };

    const profitTrendData = {
        labels: stats.monthly_profit_trend ? stats.monthly_profit_trend.map(m => m.month) : [],
        datasets: [{
            label: 'Net Profit',
            data: stats.monthly_profit_trend ? stats.monthly_profit_trend.map(m => m.profit) : [],
            borderColor: isDark ? '#34d399' : '#10B981',
            backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: isDark ? '#34d399' : '#10B981',
            pointBorderColor: isDark ? '#1e293b' : '#fff',
            pointBorderWidth: 2,
            borderWidth: 3,
        }]
    };

    const m = stats.monthly_summary || {
        this_month: { sales: 0, expenses: 0, profit: 0 },
        last_month: { sales: 0, expenses: 0, profit: 0 },
        growth: { sales: 0, profit: 0 }
    };

    return (
        <div className="bg-transparent font-sans text-slate-700 dark:text-slate-200 selection:bg-primary-500/30 -mt-2">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">{reportGranularity} overview</span>
                        <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                        <span className="text-[10px] font-bold text-slate-500">{getDynamicDateRange()}</span>
                        <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                        <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            <span className="text-[9px] font-black tracking-widest text-red-500 uppercase">Live</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 flex-grow ml-4">

                    {(role === "owner" || role === "accountant" || role === "editor" || role === "staff" || role === "Owner" || role === "Analyst") && (
                        <button
                            onClick={() => navigate("/transactions")}
                            className="px-6 py-2.5 bg-green-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all active:scale-95"
                        >
                            View Transactions
                        </button>
                    )}

                    {(role === "owner" || role === "accountant" || role === "Owner") && (
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-6 py-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl text-sm font-bold shadow-sm hover:bg-sky-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span>📥</span> Export for AI
                                <span className="text-[10px] opacity-50">▼</span>
                            </button>

                            {showExportMenu && (
                                <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden fade-in">
                                    {[
                                        { label: "JSON Format", ext: "json", type: "application/json" },
                                        { label: "CSV Spreadsheet", ext: "csv", type: "text/csv" },
                                        { label: "Excel Workbook", ext: "csv", type: "application/vnd.ms-excel" }
                                    ].map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={async () => {
                                                setShowExportMenu(false);
                                                const data = await import("../services/aiApi").then(m => m.exportAiData(businessId));
                                                let content = opt.ext === "json" ? JSON.stringify(data, null, 2) : convertToCSV(data);
                                                downloadFile(content, `ai_export_${businessId}.${opt.ext}`, opt.type);
                                                toast.success(`${opt.label} Downloaded`);
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-sky-400 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(role === "owner" || role === "accountant" || role === "Owner") && (
                        <div className="relative">
                            <button
                                onClick={() => setShowReportsMenu(!showReportsMenu)}
                                className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl text-sm font-bold shadow-sm hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span>📊</span> Finance Reports
                                <span className="text-[10px] opacity-50">▼</span>
                            </button>

                            {showReportsMenu && (
                                <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden fade-in">
                                    <button
                                        onClick={async () => {
                                            setShowReportsMenu(false);
                                            const toastId = toast.loading("Generating Excel Report...");
                                            try {
                                                const blob = await exportReportExcel(businessId);
                                                if (blob.size < 100) throw new Error("Report generation failed");
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
                                                a.click();
                                                toast.success("Excel Report Exported", { id: toastId });
                                            } catch (err) {
                                                toast.error(err.message || "Failed to generate report", { id: toastId });
                                                console.error(err);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-400 transition-colors border-b border-slate-100 dark:border-white/5 flex items-center gap-2"
                                    >
                                        <span>📈</span> Full Financial Pack (Excel)
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowReportsMenu(false);
                                            const toastId = toast.loading("Generating PDF Summary...");
                                            try {
                                                const blob = await exportReportPdf(businessId);
                                                if (blob.size < 100) throw new Error("Report generation failed");
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `Managerial_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
                                                a.click();
                                                toast.success("PDF Report Exported", { id: toastId });
                                            } catch (err) {
                                                toast.error(err.message || "Failed to generate PDF", { id: toastId });
                                                console.error(err);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-400 transition-colors flex items-center gap-2"
                                    >
                                        <span>📄</span> Managerial Summary (PDF)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                    <div className="hidden lg:block ml-4 -mt-[5px]">
                        <SegmentedControl
                            name="report-granularity"
                            value={reportGranularity}
                            onChange={setReportGranularity}
                            options={[
                                { value: 'daily', label: 'Daily' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'custom', label: 'Custom' },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* REPORT GRANULARITY SELECTOR */}
            <div className="mb-6 -mt-2 w-full flex justify-end">
                {/* Custom Date Range Pickers */}
                {reportGranularity === 'custom' && (
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
                            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold ml-1 flex items-center gap-1">
                                <span className="animate-pulse">⚠</span> Select both dates
                            </span>
                        )}
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10 animate-pulse">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Synthesizing latest financial data...</span>
                </div>
            )}

            {!isLoading && stats.total_sales === 0 && stats.total_expenses === 0 && (
                <div className="bg-white/65 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 backdrop-blur-xl p-12 rounded-[2rem] text-center mb-10 group hover:border-primary-500/30 transition-all">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <span className="text-4xl opacity-50">📉</span>
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">No Transactions Found</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 border-b border-slate-100 dark:border-white/5 pb-8">
                        We couldn't find any financial records for this period. Start recording sales or expenses to see AI-powered insights here.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/transactions')}
                            className="px-8 py-3.5 bg-primary-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-primary-600 transition-all"
                        >
                            + Record Sales
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl text-sm font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                            Refresh View
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-white/65 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 backdrop-blur-[12px] p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-black/5 w-full mb-4 mt-6 relative overflow-hidden group">
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -ml-32 -mb-32"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="text-primary-400 text-[10px] font-black uppercase tracking-[0.3em]">📡 Operational Intelligence</span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Overview Analytics</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Financial health overview for the selected period.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3 rounded-2xl flex items-center space-x-3">
                                <span className="text-indigo-500 text-lg">🎯</span>
                                <div className="flex flex-col">
                                    <span className="text-slate-800 dark:text-white font-bold text-sm">
                                        {stats.net_profit > 0 ? Math.min(100, Math.round((stats.net_profit / Math.max(1, stats.total_sales)) * 100 * 3)) : 0}%
                                    </span>
                                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Goal Status</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stat Cards with Sparklines */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {[
                            {
                                label: 'Total Revenue',
                                value: formatINR(stats.total_sales),
                                change: m.growth.sales >= 0 ? `+${m.growth.sales.toFixed(1)}%` : `${m.growth.sales.toFixed(1)}%`,
                                trend: m.growth.sales >= 0 ? 'up' : 'down',
                                sparkColor: isDark ? '#60a5fa' : '#3b82f6',
                                sparkData: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.revenue) : []
                            },
                            {
                                label: 'Net Profit',
                                value: formatINR(stats.net_profit),
                                change: m.growth.profit >= 0 ? `+${m.growth.profit.toFixed(1)}%` : `${m.growth.profit.toFixed(1)}%`,
                                trend: m.growth.profit >= 0 ? 'up' : 'down',
                                sparkColor: isDark ? '#34d399' : '#10b981',
                                sparkData: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.profit) : []
                            },
                            {
                                label: 'Op. Expenses',
                                value: formatINR(stats.total_expenses),
                                change: stats.total_expenses > 0 ? `-${((stats.total_expenses / Math.max(1, Math.abs(stats.total_sales))) * 100).toFixed(1)}%` : '0%',
                                trend: 'down',
                                sparkColor: isDark ? '#94a3b8' : '#64748b',
                                sparkData: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.expenses) : []
                            },
                            {
                                label: 'Profit Margin',
                                value: stats.total_sales > 0 ? `${((stats.net_profit / stats.total_sales) * 100).toFixed(1)}%` : '0%',
                                change: m.growth.profit >= 0 ? `+${m.growth.profit.toFixed(1)}%` : `${m.growth.profit.toFixed(1)}%`,
                                trend: m.growth.profit >= 0 ? 'up' : 'down',
                                sparkColor: isDark ? '#a78bfa' : '#8b5cf6',
                                sparkData: stats.weekly_analysis ? stats.weekly_analysis.map(w => (w.profit / (w.revenue || 1)) * 100) : []
                            }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">{stat.label}</span>
                                    <span className={`text-[11px] font-black ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-xl md:text-2xl font-serif text-slate-900 dark:text-white font-bold">{stat.value}</p>
                                    <div className="w-16 h-8 opacity-70">
                                        {stat.sparkData.length > 0 && (
                                            <Line
                                                data={{
                                                    labels: stat.sparkData.map((_, idx) => idx),
                                                    datasets: [{
                                                        data: stat.sparkData,
                                                        borderColor: stat.sparkColor,
                                                        borderWidth: 2,
                                                        pointRadius: 0,
                                                        tension: 0.3
                                                    }]
                                                }}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                                    scales: {
                                                        x: { display: false },
                                                        y: { display: false, min: Math.min(...stat.sparkData) - 1, max: Math.max(...stat.sparkData) + 1 }
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Line Chart */}
                    <div className="relative h-[350px] w-full bg-white/30 dark:bg-white/[0.02] rounded-2xl p-6 border border-slate-200/50 dark:border-white/10 shadow-inner">
                        <div className="absolute top-6 right-6 flex items-center space-x-6 z-10">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                <span className="text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">Revenue</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Profit</span>
                            </div>
                        </div>
                        <Line
                            data={{
                                labels: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.label) : [],
                                datasets: [
                                    {
                                        label: 'Revenue',
                                        data: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.revenue) : [],
                                        borderColor: isDark ? '#60a5fa' : '#3b82f6',
                                        backgroundColor: 'transparent',
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 4,
                                        pointBackgroundColor: isDark ? '#60a5fa' : '#3b82f6',
                                        pointBorderColor: isDark ? '#1e293b' : '#fff',
                                        pointBorderWidth: 2,
                                        borderWidth: 3,
                                    },
                                    {
                                        label: 'Profit',
                                        data: stats.weekly_analysis ? stats.weekly_analysis.map(w => w.profit) : [],
                                        borderColor: isDark ? '#34d399' : '#10b981',
                                        backgroundColor: 'transparent',
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 4,
                                        pointBackgroundColor: isDark ? '#34d399' : '#10b981',
                                        pointBorderColor: isDark ? '#1e293b' : '#fff',
                                        pointBorderWidth: 2,
                                        borderWidth: 3,
                                        borderDash: [5, 5],
                                    }
                                ],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: isDark ? '#1e293b' : '#fff',
                                        titleColor: isDark ? '#f8fafc' : '#0f172a',
                                        bodyColor: isDark ? '#94a3b8' : '#475569',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.1)',
                                        borderWidth: 1,
                                        padding: 12,
                                        displayColors: true,
                                        callbacks: {
                                            label: (context) => ` ${context.dataset.label}: ${formatINR(context.parsed.y)} `
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        grid: { color: gridColor, drawBorder: false },
                                        ticks: {
                                            color: textColor,
                                            font: { size: 10 },
                                            callback: (value) => '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value)
                                        }
                                    },
                                    x: {
                                        grid: { display: false },
                                        ticks: { color: textColor, font: { size: 10 } }
                                    },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* MAIN ANALYSIS BLOCK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* WEEKLY ANALYSIS (2/3 width) */}
                <div className="lg:col-span-2 bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-black/5 border border-slate-200 dark:border-white/10">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                        <span>📅</span> {reportGranularity.charAt(0).toUpperCase() + reportGranularity.slice(1)} Performance Analysis
                    </h2>
                    <div className="h-72">
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* AI FINANCIAL BRIEFING (1/3 width) */}
                <div className="bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-black/5 border border-slate-200 dark:border-white/10 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -mr-16 -mt-16"></div>
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">✨</span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Financial Briefing</h2>
                        </div>

                        {stats.expense_breakdown && stats.expense_breakdown.length > 0 ? (
                            <div className="space-y-4">
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            Primary expenditure is <b>{stats.expense_breakdown.length > 0 ? [...stats.expense_breakdown].sort((a, b) => b.amount - a.amount)[0].category : 'N/A'}</b> at {formatINR([...stats.expense_breakdown].sort((a, b) => b.amount - a.amount)[0].amount)}
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            Sales grew by <b>{Math.abs(m.growth.sales).toFixed(1)}%</b> compared to last period
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${stats.net_profit < 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            {stats.net_profit < 0 ? "Expenses are exceeding revenue. Review overhead costs." : "Profit margins are healthy. Consider reinvesting."}
                                        </p>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500/60 italic">Collecting data for AI insights...</p>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5">
                        <button
                            onClick={() => navigate('/transactions')}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                            {stats.net_profit < 0 ? "Review Expenses" : "Optimize Inventory"}
                        </button>
                    </div>
                </div>
            </div>

            {/* FINANCIAL INTELLIGENCE HUB */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {/* CATEGORY BREAKDOWN */}
                <div className="bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-black/5 border border-slate-200 dark:border-white/10">
                    <div className="mb-6">
                        <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Expense Anatomy</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Where is your money going?</p>
                    </div>
                    <div className="h-64 relative">
                        {stats.expense_breakdown && stats.expense_breakdown.length > 0 ? (
                            <Doughnut
                                data={expenseChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: textColor } } },
                                    cutout: '70%'
                                }}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">No expense categories yet</div>
                        )}
                    </div>
                </div>

                {/* PROFIT TREND */}
                <div className="bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-black/5 border border-slate-200 dark:border-white/10">
                    <div className="mb-6">
                        <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Net Profit Trend</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Performance trajectory</p>
                    </div>
                    <div className="h-64">
                        <Line data={{
                            ...profitTrendData,
                            datasets: [{
                                ...profitTrendData.datasets[0],
                                fill: false,
                                backgroundColor: 'transparent'
                            }]
                        }} options={{ ...chartOptions, plugins: { legend: { display: false } }, interaction: { mode: 'index', intersect: false } }} />
                    </div>
                </div>
            </div>
        </div >
    );
}

function StatCard({ title, value, icon, color, subValue }) {
    return (
        <div className="bg-white dark:bg-white/5 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 hover:shadow-md transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full -mr-12 -mt-12 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors"></div>
            <div className="relative z-10 flex justify-between items-start mb-3">
                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest font-sans">{title}</p>
                <span className="text-lg p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">{icon}</span>
            </div>
            <p className={`text-2xl md:text-3xl font-serif font-black ${color} relative z-10 truncate`}>{value}</p>
            {subValue && <div className="mt-2 flex items-center gap-1.5">{subValue}</div>}
        </div>
    );
}

export default Dashboard;
