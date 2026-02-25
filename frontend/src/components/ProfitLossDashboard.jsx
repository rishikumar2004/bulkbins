import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatINR } from '../utils/formatCurrency';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ProfitLossDashboard = ({ data: staticData, theme, reportGranularity = 'monthly', customStart, customEnd, businessId }) => {
    const [liveData, setLiveData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!businessId) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                let url = `${API_BASE_URL}/api/businesses/${businessId}/ai/dashboard?granularity=${reportGranularity}`;
                if (reportGranularity === 'custom' && customStart && customEnd) {
                    url += `&start_date=${customStart}&end_date=${customEnd}`;
                }
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) setLiveData(await res.json());
            } catch (e) {
                console.error('ProfitLossDashboard fetch error', e);
            } finally {
                setIsLoading(false);
            }
        };
        if (reportGranularity !== 'custom' || (customStart && customEnd)) {
            fetchData();
        }
    }, [businessId, reportGranularity, customStart, customEnd]);

    const isDark = theme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#ffffff12' : '#00000010';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#ffffff10' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    // Use live fetched data if available, derive KPIs from it
    const totalSales = liveData?.total_sales ?? 0;
    const totalExpenses = liveData?.total_expenses ?? 0;
    const totalCogs = liveData?.total_cogs ?? 0;
    const grossProfit = liveData?.gross_profit ?? 0;
    const netProfit = liveData?.net_profit ?? 0;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

    // Chart data from backend's period_analysis (renamed weekly_analysis)
    const chartData = liveData?.weekly_analysis ?? [];

    // Fallback to static data for the line chart if no live data
    const lineChartData = chartData.length > 0
        ? chartData.map(w => ({ month: w.label, profit: w.profit, sales: w.revenue, expenses: w.expenses }))
        : (staticData ?? []);

    const expenseBreakdown = [{ name: 'Breakdown', COGS: totalCogs, Operating: totalExpenses }];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass p-3 rounded-xl shadow-lg border" style={{ background: tooltipBg, borderColor: tooltipBorder }}>
                    <p className="font-bold text-xs mb-2" style={{ color: tooltipText }}>{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1" style={{ color: tooltipText }}>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}
                            </span>
                            <span className="font-bold">{formatINR(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Loading {reportGranularity} data...</span>
            </div>
        );
    }

    if (!liveData && (!staticData || staticData.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <DollarSign className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-600" />
                <p className="font-bold uppercase tracking-widest text-xs text-slate-500 dark:text-slate-400">Insufficient data for P&L analysis</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass p-5 rounded-[2rem] border-slate-200 dark:border-white/5 bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Revenue</div>
                    <div className="text-2xl font-serif font-black text-[#0f172a] dark:text-white transition-all duration-500 truncate">{formatINR(totalSales)}</div>
                </div>
                <div className="glass p-5 rounded-[2rem] border-emerald-500/20 bg-emerald-500/10 backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">Gross Profit</div>
                    <div className="text-2xl font-serif font-black text-emerald-600 dark:text-emerald-400 truncate">{formatINR(grossProfit)}</div>
                    <div className="text-[8px] text-emerald-600/60 font-bold uppercase mt-1">Sales - COGS</div>
                </div>
                <div className="glass p-5 rounded-[2rem] border-slate-200 dark:border-white/5 bg-white/65 dark:bg-white/[0.02] backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Op. Expenses</div>
                    <div className="text-2xl font-serif font-black text-slate-900 dark:text-white transition-all duration-500 truncate">{formatINR(totalExpenses)}</div>
                </div>
                <div className="glass p-5 rounded-[2rem] border-primary-500/20 bg-primary-500/10 backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-primary-500 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-2">Net Profit</div>
                    <div className={`text-2xl font-serif font-black truncate ${netProfit >= 0 ? 'text-primary-500 dark:text-primary-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatINR(netProfit)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass p-8 rounded-[3rem] border-slate-200 dark:border-white/5 h-[400px] bg-white dark:bg-white/5 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-2xl font-serif font-black text-[#0f172a] dark:text-white">Profit Performance</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Institutional Revenue Tracking</p>
                        </div>
                        <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest ${netProfit >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{profitMargin}% Margin</span>
                        </div>
                    </div>
                    <div className="w-full h-[250px] flex-grow">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="month" stroke={textColor} fontSize={10} axisLine={false} tickLine={false} tickMargin={10} />
                                <YAxis stroke={textColor} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`} width={60} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 1 }} />
                                <Line type="monotone" dataKey="profit" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] border-slate-200 dark:border-white/5 h-[400px] bg-white dark:bg-white/5 flex flex-col">
                    <h4 className="text-xl font-serif text-slate-900 dark:text-white mb-2">Cost Breakdown</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-6">Profit & Inventory Analysis</p>
                    <div className="w-full flex-grow flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={expenseBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip content={<CustomTooltip />} cursor={false} />
                                <Bar dataKey="COGS" stackId="a" fill="#10b981" radius={[8, 0, 0, 8]}>
                                    <LabelList dataKey="COGS" position="inside" formatter={(val) => totalCogs + totalExpenses > 0 ? `${((val / (totalCogs + totalExpenses)) * 100).toFixed(0)}%` : ''} fill="#fff" fontSize={12} fontWeight="bold" />
                                </Bar>
                                <Bar dataKey="Operating" stackId="a" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                                    <LabelList dataKey="Operating" position="inside" formatter={(val) => totalCogs + totalExpenses > 0 ? `${((val / (totalCogs + totalExpenses)) * 100).toFixed(0)}%` : ''} fill="#fff" fontSize={12} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Direct COGS</span>
                            </div>
                            <span className="text-sm font-serif font-bold text-slate-900 dark:text-white">{formatINR(totalCogs)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded bg-blue-500"></div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Operating Expenses</span>
                            </div>
                            <span className="text-sm font-serif font-bold text-slate-900 dark:text-white">{formatINR(totalExpenses)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitLossDashboard;
