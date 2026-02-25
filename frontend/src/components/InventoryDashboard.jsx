import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, AlertCircle, Settings, ChevronDown, ChevronRight, Edit2, Trash2, ArrowUpDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '../utils/formatCurrency';
import CustomSelect from './CustomSelect';
import SegmentedControl from './SegmentedControl';
import toast from 'react-hot-toast';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api`;

export default function InventoryDashboard({ inventory, fetchInventory, role, id, token }) {
    const [inventorySearch, setInventorySearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '', stock_quantity: 0, selling_price: 0, cost_price: 0,
        reorder_level: 5, category: 'Produce', description: '', lead_time: 7
    });

    const categories = [
        { title: 'Produce Market', icon: '🥦', key: 'Produce' },
        { title: 'Artisanal Bakery', icon: '🥖', key: 'Bakery' },
        { title: 'Dairy & Farm', icon: '🥛', key: 'Dairy' },
        { title: 'Meat & Seafood', icon: '🥩', key: 'Meat' },
        { title: 'Other Essentials', icon: '📦', key: 'Others' }
    ];

    // Accordion State
    const [expandedCategories, setExpandedCategories] = useState(
        categories.reduce((acc, cat) => ({ ...acc, [cat.key]: true }), {})
    );

    // Filter State
    const [activeFilter, setActiveFilter] = useState('All');

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Bulk Actions State
    const [selectedItems, setSelectedItems] = useState([]);

    const toggleCategory = (key) => {
        setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleSelection = (itemId) => {
        setSelectedItems(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
    };

    const toggleSelectAll = (sectionProducts) => {
        const sectionIds = sectionProducts.map(p => p.id);
        const allSelected = sectionIds.every(id => selectedItems.includes(id));
        if (allSelected) {
            setSelectedItems(prev => prev.filter(id => !sectionIds.includes(id)));
        } else {
            const newIds = sectionIds.filter(id => !selectedItems.includes(id));
            setSelectedItems(prev => [...prev, ...newIds]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedItems.length} selected items?`)) return;
        try {
            const promises = selectedItems.map(itemId =>
                fetch(`${API_URL}/businesses/${id}/inventory/${itemId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            );
            await Promise.all(promises);
            toast.success(`Deleted ${selectedItems.length} items`);
            setSelectedItems([]);
            fetchInventory();
        } catch (err) {
            toast.error('Bulk deletion failed');
        }
    };

    // Summary KPIs
    const totalItemsCount = inventory.length;
    const lowStockItems = useMemo(() => inventory.filter(p => p.stock_quantity <= (p.reorder_level || 5)), [inventory]);
    const lowStockCount = lowStockItems.length;
    const totalInventoryValue = inventory.reduce((sum, p) => sum + (p.stock_quantity * (p.cost_price || 0)), 0);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const method = isEditingItem ? 'PUT' : 'POST';
        const url = isEditingItem
            ? `${API_URL}/businesses/${id}/inventory/${editingItem.id}`
            : `${API_URL}/businesses/${id}/inventory`;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newItem)
            });
            if (response.ok) {
                toast.success(isEditingItem ? 'Product updated!' : 'Product added!');
                setIsAddModalOpen(false);
                setIsEditingItem(false);
                setEditingItem(null);
                setNewItem({ name: '', stock_quantity: 0, selling_price: 0, cost_price: 0, reorder_level: 5, category: 'Produce', description: '', lead_time: 7 });
                fetchInventory();
            } else {
                toast.error('Action failed');
            }
        } catch (error) {
            toast.error('Network error');
        }
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setIsEditingItem(true);
        setNewItem({ ...item, cost_price: item.cost_price || 0, reorder_level: item.reorder_level || 5, lead_time: item.lead_time || 7 });
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-24 relative">
            {/* Header / Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Centralized Asset Ledger</p>
                </div>
                {(role === 'Owner' || role === 'Accountant') && (
                    <button
                        onClick={() => {
                            setIsEditingItem(false);
                            setNewItem({ name: '', stock_quantity: 0, selling_price: 0, cost_price: 0, reorder_level: 5, category: 'Produce', description: '', lead_time: 7 });
                            setIsAddModalOpen(true);
                        }}
                        className="bg-primary-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                    >
                        + Add New Item
                    </button>
                )}
            </div>

            {/* Summary Strip (Req 9) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Items</span>
                    <span className="text-2xl font-serif font-black text-slate-900 dark:text-white">{totalItemsCount}</span>
                </div>
                <div
                    onClick={() => lowStockCount > 0 && setIsLowStockModalOpen(true)}
                    className={`glass p-5 rounded-xl border border-rose-500/20 flex justify-between items-center shadow-sm bg-rose-500/5 transition-all ${lowStockCount > 0 ? 'cursor-pointer hover:bg-rose-500/10 active:scale-[0.98]' : 'opacity-70'}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                        Low Stock Alerts
                        {lowStockCount > 0 && <ChevronRight className="w-3 h-3" />}
                    </span>
                    <span className="text-2xl font-serif font-black text-rose-600">{lowStockCount}</span>
                </div>
                <div className="glass p-5 rounded-xl border border-emerald-500/20 flex justify-between items-center shadow-sm bg-emerald-500/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Total Inv Value</span>
                    <span className="text-2xl font-serif font-black text-emerald-600">{formatINR(totalInventoryValue)}</span>
                </div>
            </div>

            {/* Sticky Search & Filter (Req 2) */}
            <div className="sticky top-0 z-20 py-4 backdrop-blur-xl bg-slate-50/80 dark:bg-[#0f172a]/80 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center px-2">
                <SegmentedControl
                    name="inventory-category-filter"
                    value={activeFilter}
                    onChange={setActiveFilter}
                    options={[
                        { value: 'All', label: 'All' },
                        ...categories.map(c => ({
                            value: c.key,
                            label: (
                                <div className="flex items-center gap-1.5 transition-all">
                                    <span className="text-sm scale-110">{c.icon}</span>
                                    <span>{c.title.split(' ')[0]}</span>
                                </div>
                            )
                        }))
                    ]}
                />
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full py-3 pl-11 pr-4 text-sm font-semibold shadow-sm focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/5 transition-all text-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Bulk Actions Bar (Req 10) */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-fade-in-up border border-slate-700 dark:border-slate-200">
                    <span className="text-white dark:text-slate-900 text-sm font-bold">
                        {selectedItems.length} items selected
                    </span>
                    <div className="w-px h-4 bg-slate-700 dark:bg-slate-300"></div>
                    <button onClick={handleBulkDelete} className="text-rose-400 hover:text-rose-300 dark:text-rose-600 dark:hover:text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Delete Selected
                    </button>
                    <button onClick={() => setSelectedItems([])} className="text-slate-400 hover:text-white dark:hover:text-slate-900 text-xs font-bold underline">
                        Cancel
                    </button>
                </div>
            )}

            {/* Accordion Categories (Req 3) */}
            {categories.filter(c => activeFilter === 'All' || activeFilter === c.key).map(section => {
                const searchTerm = inventorySearch.toLowerCase().trim();
                let products = inventory.filter(p => {
                    const matchesCategory = section.key === 'Others' ? !['Produce', 'Bakery', 'Dairy', 'Meat'].includes(p.category) : p.category === section.key;
                    if (!matchesCategory) return false;
                    if (!searchTerm) return true;
                    return p.name?.toLowerCase().includes(searchTerm) || p.description?.toLowerCase().includes(searchTerm);
                });

                if (products.length === 0) return null;

                // Apply Sorting (Req 7)
                if (sortConfig.key) {
                    products = [...products].sort((a, b) => {
                        let aVal, bVal;
                        if (sortConfig.key === 'price') { aVal = a.selling_price; bVal = b.selling_price; }
                        else if (sortConfig.key === 'profit') { aVal = a.selling_price - (a.cost_price || 0); bVal = b.selling_price - (b.cost_price || 0); }
                        else if (sortConfig.key === 'stock') { aVal = a.stock_quantity; bVal = b.stock_quantity; }

                        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                const sectionSelectedAll = products.length > 0 && products.every(p => selectedItems.includes(p.id));

                return (
                    <div key={section.key} className="glass rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                        <button
                            onClick={() => toggleCategory(section.key)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{section.icon}</span>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{section.title}</h3>
                                <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">{products.length}</span>
                            </div>
                            {expandedCategories[section.key] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                        </button>

                        {expandedCategories[section.key] && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-white/5">
                                            <th className="p-3 pl-4 w-10">
                                                <input type="checkbox" checked={sectionSelectedAll && products.length > 0} onChange={() => toggleSelectAll(products)} className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
                                            </th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Product Details</th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 group cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => handleSort('price')}>
                                                <div className="flex items-center gap-1">Price / Cost <ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
                                            </th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 group cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => handleSort('profit')}>
                                                <div className="flex items-center gap-1">Profit ROI <ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
                                            </th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 group cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => handleSort('stock')}>
                                                <div className="flex items-center gap-1">Stock Level <ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
                                            </th>
                                            {(role === 'Owner' || role === 'Accountant') && (
                                                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right pr-4">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-transparent">
                                        {products.map(item => {
                                            const profitVal = item.selling_price - (item.cost_price || 0);
                                            const roi = item.cost_price > 0 ? (profitVal / item.cost_price) : 0;
                                            // Profit Color Coding (Req 6)
                                            let profitColorClass = 'text-slate-600 dark:text-slate-400';
                                            if (roi >= 0.5) profitColorClass = 'text-emerald-500';
                                            else if (roi < 0.2) profitColorClass = 'text-rose-500';

                                            const isLowStock = item.stock_quantity <= (item.reorder_level || 5);
                                            const isSelected = selectedItems.includes(item.id);

                                            return (
                                                <tr key={item.id} className={`group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-500/5' : ''}`}>
                                                    <td className="p-3 pl-4">
                                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(item.id)} className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
                                                    </td>
                                                    <td className="p-3"> {/* Reduced Padding (Req 5) */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[180px]">{item.name}</span>
                                                            {/* Low Stock Badge (Req 4) */}
                                                            {isLowStock && (
                                                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest rounded animate-pulse whitespace-nowrap">Low Stock</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.description || item.category}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-slate-200">{formatINR(item.selling_price)}</div>
                                                        <div className="text-[10px] text-slate-500">Cost: {formatINR(item.cost_price || 0)}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className={`font-bold text-sm ${profitColorClass}`}>{formatINR(profitVal)}</div>
                                                        <div className={`text-[10px] font-black ${profitColorClass}`}>{(roi * 100).toFixed(0)}% ROI</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{item.stock_quantity} <span className="text-[10px] font-normal text-slate-500">units</span></div>
                                                    </td>
                                                    {(role === 'Owner' || role === 'Accountant') && (
                                                        <td className="p-3 pr-4 text-right">
                                                            {/* Hover Buttons (Req 8) */}
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openEditModal(item)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                                    <Edit2 className="w-3 h-3" /> Edit
                                                                </button>
                                                                {role === 'Owner' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm('Remove this item?')) return;
                                                                            await fetch(`${API_URL}/businesses/${id}/inventory/${item.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                                                                            fetchInventory();
                                                                        }}
                                                                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" /> Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Collapsible Modal (Req 1) */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-white/10 my-auto flex flex-col max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
                                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary-500" /> {isEditingItem ? 'Edit Product' : 'Add New Item'}
                                </h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    <Plus className="w-5 h-5 rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <form id="inventoryForm" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Product Name</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Category</label>
                                        <CustomSelect value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} options={['Produce', 'Bakery', 'Dairy', 'Meat', 'Others']} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Stock Qty</label>
                                        <input type="number" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.stock_quantity} onChange={(e) => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value) || 0 })} required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Description</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.description || ''} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Selling Price</label>
                                        <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.selling_price} onChange={(e) => setNewItem({ ...newItem, selling_price: parseFloat(e.target.value) || 0 })} required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Cost Price</label>
                                        <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.cost_price} onChange={(e) => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) || 0 })} required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Min Alert (Reorder)</label>
                                        <input type="number" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.reorder_level} onChange={(e) => setNewItem({ ...newItem, reorder_level: parseInt(e.target.value) || 5 })} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-2 block">Lead Time (Days)</label>
                                        <input type="number" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all dark:text-white" value={newItem.lead_time || 7} onChange={(e) => setNewItem({ ...newItem, lead_time: parseInt(e.target.value) || 7 })} />
                                    </div>
                                </form>
                            </div>
                            <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3 sticky bottom-0 z-10">
                                <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase tracking-widest">Cancel</button>
                                <button form="inventoryForm" type="submit" className="px-6 py-2.5 bg-primary-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-95">Save Item</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Low Stock Alerts Modal */}
            <AnimatePresence>
                {isLowStockModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/60"
                        onClick={() => setIsLowStockModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
                        >
                            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                                        <AlertCircle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white font-serif">Low Stock Alerts</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {lowStockItems.length} {lowStockItems.length === 1 ? 'item requires' : 'items require'} immediate attention
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsLowStockModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-6 md:p-8 space-y-4 no-scrollbar">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-black">{item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-xl font-black text-rose-500">{item.stock_quantity}</span>
                                                <span className="text-xs text-rose-500/70 uppercase font-black tracking-widest pt-1">Left</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-black">
                                                Reorder at {item.reorder_level}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
