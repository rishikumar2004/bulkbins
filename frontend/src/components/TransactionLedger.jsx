import React, { useState, useMemo } from 'react';
import {
    Plus,
    Settings,
    TrendingUp,
    TrendingDown,
    RefreshCcw,
    Sliders,
    DollarSign,
    Search,
    Calendar
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import SegmentedControl from './SegmentedControl';
import ThemedDatePicker from './ThemedDatePicker';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatINR = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(value);
};

export default function TransactionLedger({
    transactions,
    role,
    id,
    token,
    isAddingTransaction,
    setIsAddingTransaction,
    isEditingTransaction,
    setIsEditingTransaction,
    editingTransaction,
    setEditingTransaction,
    transactionForm,
    setTransactionForm,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handleRefund,
    handleAutoClassify,
    isClassifying,
    inventory
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState('all'); // all, today, week, month, custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [visibleCount, setVisibleCount] = useState(15);
    const [receiptFile, setReceiptFile] = useState(null);

    // Helper to get start/end dates for predefined ranges
    const getDateRangeBounds = (range) => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (range) {
            case 'today':
                return { start, end };
            case 'week':
                start.setDate(now.getDate() - 7);
                return { start, end };
            case 'month':
                start.setMonth(now.getMonth() - 1);
                return { start, end };
            case 'custom':
                if (customStart && customEnd) {
                    return {
                        start: new Date(customStart),
                        end: new Date(new Date(customEnd).setHours(23, 59, 59, 999))
                    };
                }
                return { start: new Date(0), end: new Date() };
            case 'all':
            default:
                return { start: new Date(0), end: new Date() };
        }
    };

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        const { start, end } = getDateRangeBounds(dateRange);
        const term = searchTerm.toLowerCase();

        return transactions
            .filter(txn => {
                const txnDate = new Date(txn.timestamp);
                const matchesDate = txnDate >= start && txnDate <= end;
                const matchesSearch = !term ||
                    (txn.description && txn.description.toLowerCase().includes(term)) ||
                    (txn.category && txn.category.toLowerCase().includes(term));
                return matchesDate && matchesSearch;
            })
            // Ensure they are sorted newest first if not already
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [transactions, dateRange, searchTerm, customStart, customEnd]);

    // Group by Date for the rendering logic
    const groupedTransactions = useMemo(() => {
        const groups = {};
        filteredTransactions.slice(0, visibleCount).forEach(txn => {
            const dateStr = new Date(txn.timestamp).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(txn);
        });
        return groups;
    }, [filteredTransactions, visibleCount]);

    // Summary calculations
    const summary = useMemo(() => {
        return filteredTransactions.reduce((acc, txn) => {
            if (txn.type === 'Sale') {
                acc.totalSales += txn.amount;
                acc.netChange += txn.amount;
                if (typeof txn.profit === 'number') acc.totalProfit += txn.profit;
            } else if (txn.type === 'Refund') {
                acc.totalSales -= txn.amount;
                acc.netChange -= txn.amount;
                if (typeof txn.profit === 'number') acc.totalProfit -= txn.profit;
            } else { // Expense or Adjustment
                acc.netChange -= txn.amount;
                if (typeof txn.profit === 'number') acc.totalProfit += txn.profit;
            }
            return acc;
        }, { totalSales: 0, totalProfit: 0, netChange: 0 });
    }, [filteredTransactions]);

    return (
        <div className="space-y-6">

            {/* 5. Sticky Summary Bar */}
            <div className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center space-x-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Sales</p>
                            <p className="text-xl font-serif text-slate-900 dark:text-white">{formatINR(summary.totalSales)}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Net Flow</p>
                            <p className={`text-xl font-serif ${summary.netChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {summary.netChange >= 0 ? '+' : '-'}{formatINR(Math.abs(summary.netChange))}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Est. Profit</p>
                            <p className={`text-xl font-serif ${summary.totalProfit >= 0 ? 'text-primary-500' : 'text-rose-500'}`}>
                                {summary.totalProfit >= 0 ? '+' : '-'}{formatINR(Math.abs(summary.totalProfit))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Area with Filter Controls */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between pb-4">
                <SegmentedControl
                    name="transaction-date-range"
                    value={dateRange}
                    onChange={setDateRange}
                    options={[
                        { value: 'all', label: 'All Time' },
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'Week' },
                        { value: 'month', label: 'Month' },
                        { value: 'custom', label: 'Custom' },
                    ]}
                />

                {/* 10. Search/Category Filter */}
                <div className="relative w-full xl:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search description, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full py-3.5 pl-12 pr-6 text-sm text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/5 transition-all shadow-sm"
                    />
                </div>
            </div>

            {dateRange === 'custom' && (
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
                </div>
            )}

            {/* Transaction List */}
            <div className="space-y-8 pb-12">
                {Object.keys(groupedTransactions).length === 0 ? (
                    <div className="py-20 text-center opacity-40 glass rounded-3xl border border-slate-200 dark:border-white/5">
                        <DollarSign className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-sm">No transactions match your filters</p>
                    </div>
                ) : (
                    Object.entries(groupedTransactions).map(([dateLabel, txns]) => (
                        <div key={dateLabel} className="space-y-3">
                            {/* 9. Date Headers */}
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 sticky top-[88px] z-10 bg-slate-50/90 dark:bg-[#0f172a]/90 py-2 backdrop-blur-sm -mx-2 px-2">
                                {dateLabel}
                            </h3>

                            {/* 6. Tightened vertical spacing via space-y-2 instead of typical space-y-4 */}
                            <div className="space-y-2">
                                {txns.map(txn => {
                                    // 2. Distinct Icons & 4. Negative Profit Tint
                                    const isSale = txn.type === 'Sale';
                                    const isRefund = txn.type === 'Refund';
                                    const isExpense = txn.type === 'Expense';
                                    const isAdjustment = txn.type === 'Adjustment';
                                    const isNegativeProfit = txn.type === 'Sale' && typeof txn.profit === 'number' && txn.profit < 0;

                                    let Icon = TrendingUp;
                                    let iconBg = 'bg-slate-500/10';
                                    let iconColor = 'text-slate-400';

                                    if (isSale) {
                                        Icon = TrendingUp;
                                        iconBg = 'bg-emerald-500/10';
                                        iconColor = 'text-emerald-500';
                                    } else if (isRefund) {
                                        Icon = RefreshCcw;
                                        iconBg = 'bg-amber-500/10';
                                        iconColor = 'text-amber-500';
                                    } else if (isExpense) {
                                        Icon = TrendingDown;
                                        iconBg = 'bg-rose-500/10';
                                        iconColor = 'text-rose-500';
                                    } else if (isAdjustment) {
                                        Icon = Sliders;
                                        iconBg = 'bg-blue-500/10';
                                        iconColor = 'text-blue-500';
                                    }

                                    return (
                                        <div
                                            key={txn.id}
                                            // Conditional Red Tint for Negative Profit
                                            className={`glass p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between group transition-all duration-200 hover:shadow-md ${isNegativeProfit
                                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800'
                                                : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                                                <div className={`p-3 rounded-xl shrink-0 ${iconBg} ${iconColor}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-slate-900 dark:text-white text-base font-bold line-clamp-1">{txn.description || txn.category}</div>
                                                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2">
                                                        <span>{txn.category}</span>
                                                        {txn.receipt_url && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                <a href={`${BASE_URL}${txn.receipt_url}`} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">Receipt</a>
                                                            </>
                                                        )}
                                                        {txn.quantity > 1 && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                <span>Qty {txn.quantity}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto sm:space-x-6 pl-12 sm:pl-0">
                                                <div className="text-left sm:text-right flex-shrink-0">
                                                    {/* Primary scanned value */}
                                                    <div className={`text-lg font-serif font-bold ${isSale || isAdjustment ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {isSale || isAdjustment ? '+' : '-'}{formatINR(txn.amount)}
                                                    </div>

                                                    {/* 3. Visually smaller profit value */}
                                                    {txn.type === 'Sale' && typeof txn.profit === 'number' && (
                                                        <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${txn.profit >= 0 ? 'text-primary-500/80' : 'text-rose-500'
                                                            }`}>
                                                            {txn.profit >= 0 ? 'Margin: +' : 'Loss: -'}{formatINR(Math.abs(txn.profit))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 7. Hover Actions instead of static icons */}
                                                {(role === 'Owner' || role === 'Accountant') && (
                                                    <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setTransactionForm({
                                                                    amount: txn.amount,
                                                                    category: txn.category,
                                                                    type: txn.type,
                                                                    inventory_item_id: txn.inventory_item_id || '',
                                                                    quantity: txn.quantity || 1,
                                                                    timestamp: new Date(txn.timestamp).toISOString().split('T')[0],
                                                                    description: txn.description || ''
                                                                });
                                                                setIsEditingTransaction(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        {isSale && (
                                                            <button
                                                                className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                Refund
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteTransaction(txn.id)}
                                                            className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}

                {/* 8. Load More Pagination */}
                {filteredTransactions.length > visibleCount && (
                    <div className="pt-6 pb-12 flex justify-center">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 15)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm flex flex-col items-center"
                        >
                            <span>Load More</span>
                            <span className="text-[9px] text-slate-400 mt-1 normal-case tracking-normal">
                                Showing {visibleCount} of {filteredTransactions.length}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Editing Modal Logic (adapted from original) */}
            {isEditingTransaction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setIsEditingTransaction(false)}></div>
                    <div className="glass p-6 sm:p-10 rounded-2xl border-primary-500/30 w-full max-w-4xl relative z-10 animate-scale-in max-h-[95vh] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-inherit py-2 z-20 border-b border-transparent">
                            <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 dark:text-white">Revise Transaction</h2>
                            <button onClick={() => { setIsEditingTransaction(false); setEditingTransaction(null); }} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all">
                                <Plus className="w-6 h-6 sm:w-8 sm:h-8 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTransaction} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Type</label>
                                    <CustomSelect
                                        value={transactionForm.type}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
                                        options={[
                                            { value: 'Sale', label: 'Sale' },
                                            { value: 'Refund', label: 'Refund' },
                                            { value: 'Expense', label: 'Expense' },
                                            { value: 'Adjustment', label: 'Adjustment' }
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                    <CustomSelect
                                        value={transactionForm.category}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                        options={[
                                            { value: 'Produce', label: 'Produce' },
                                            { value: 'Inventory Acquisition', label: 'Inventory Acquisition' },
                                            { value: 'Utility', label: 'Utility' },
                                            { value: 'Rent', label: 'Rent' },
                                            { value: 'Salary', label: 'Salary' },
                                            { value: 'Tax', label: 'Tax' },
                                            { value: 'Other', label: 'Other' }
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Description</label>
                                    <input
                                        type="text"
                                        placeholder="Enter details..."
                                        value={transactionForm.description}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={transactionForm.amount}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Quantity</label>
                                    <input
                                        type="number"
                                        value={transactionForm.quantity}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Date</label>
                                    <ThemedDatePicker
                                        value={transactionForm.timestamp}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, timestamp: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                <button type="submit" className="flex-grow bg-primary-500 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:bg-primary-600 transition-all">
                                    Update Transaction
                                </button>
                                <button type="button" onClick={() => { setIsEditingTransaction(false); setEditingTransaction(null); }} className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-xl text-sm font-bold transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
