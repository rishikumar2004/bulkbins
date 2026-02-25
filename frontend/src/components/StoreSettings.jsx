import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, UserPlus, Trash2, Shield, Settings, Mail, Coins, User, CheckCircle2, AlertCircle, Check, ChevronDown, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';
import SegmentedControl from './SegmentedControl';

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

export default function StoreSettings({ businessId, theme }) {
    const { token, user, updateProfile, currentBusiness, setCurrentBusiness } = useAuth();
    const [activeSection, setActiveSection] = useState('General');
    const [loading, setLoading] = useState(false);

    // New UX State
    const [showSavedFeedback, setShowSavedFeedback] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const [currencySearch, setCurrencySearch] = useState('');

    // Forms
    const [settingsForm, setSettingsForm] = useState({
        name: '',
        currency: 'INR',
        email: '',
        secondary_email: ''
    });

    const currencyOptions = [
        { value: 'INR', label: 'INR (₹)' },
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'JPY', label: 'JPY (¥)' }
    ];

    const roleOptions = ['Staff', 'Analyst', 'Accountant', 'Owner'];

    const [members, setMembers] = useState([]);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'Staff' });

    const [profileForm, setProfileForm] = useState({
        username: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setProfileForm({
                username: user.name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (currentBusiness) {
            setSettingsForm({
                name: currentBusiness.name || '',
                currency: currentBusiness.currency || 'INR',
                // Pre-fill primary email from account email if none set on business
                email: currentBusiness.email || user?.email || '',
                secondary_email: currentBusiness.secondary_email || ''
            });
            fetchMembers();
        }
    }, [currentBusiness, businessId, user]);

    const fetchMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setMembers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateSettings = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsForm)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Settings updated');
                // Update global context
                setCurrentBusiness({ ...currentBusiness, ...settingsForm });
                setShowSavedFeedback(true);
                setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                setTimeout(() => setShowSavedFeedback(false), 3000);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelChanges = () => {
        if (currentBusiness) {
            setSettingsForm({
                name: currentBusiness.name || '',
                currency: currentBusiness.currency || 'INR',
                email: currentBusiness.email || '',
                secondary_email: currentBusiness.secondary_email || ''
            });
        }
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        const success = await updateProfile(profileForm);
        setLoading(false);
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(inviteForm)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Member added successfully');
                setInviteForm({ email: '', role: 'Staff' });
                fetchMembers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to add member');
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                toast.success('Role updated');
                fetchMembers();
            } else {
                const data = await res.json();
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Member removed');
                fetchMembers();
            } else {
                const data = await res.json();
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const isDark = theme === 'dark';
    const isOwner = currentBusiness?.role === 'Owner';
    const cardClass = `p-8 rounded-3xl ${isDark ? 'bg-slate-900/50 border border-white/5' : 'bg-white border border-slate-100'} shadow-xl transition-all duration-300`;
    const inputClass = `w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} focus:ring-2 focus:ring-primary-500 transition-all ${!isOwner ? 'opacity-70 cursor-not-allowed' : ''}`;
    const btnClass = `px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${loading || !isOwner ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="space-y-0 animate-fade-in relative min-h-[calc(100vh+10px)]">
            {/* Global Actions - Portaled to Header */}
            {document.getElementById('settings-actions-portal') ? createPortal(
                <div className="flex flex-col items-end">
                    <div className="flex gap-3">
                        {activeSection === 'General' && isOwner && (
                            <button
                                type="button"
                                onClick={handleCancelChanges}
                                disabled={loading || showSavedFeedback}
                                className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Discard
                            </button>
                        )}
                        <button
                            onClick={activeSection === 'General' ? handleUpdateSettings : (activeSection === 'Account' ? handleUpdateProfile : undefined)}
                            disabled={loading || showSavedFeedback || (activeSection === 'Team') || (!isOwner && activeSection === 'General')}
                            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shadow-xl ${showSavedFeedback
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20 active:scale-100'
                                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/20 active:scale-95'
                                } ${loading || (!isOwner && activeSection === 'General') ? 'opacity-50 cursor-not-allowed' : ''} ${activeSection === 'Team' ? 'opacity-0 pointer-events-none hidden md:flex' : ''}`}
                        >
                            {showSavedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {showSavedFeedback ? 'Changes Saved' : loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                    <span className={`text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-2 block mr-2 text-right transition-opacity duration-300 ${activeSection === 'General' && isOwner ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
                        Last updated {lastUpdated}
                    </span>
                </div>,
                document.getElementById('settings-actions-portal')
            ) : (
                <div className="flex flex-col items-end mb-4">
                    <div className="flex gap-3">
                        {activeSection === 'General' && isOwner && (
                            <button
                                type="button"
                                onClick={handleCancelChanges}
                                disabled={loading || showSavedFeedback}
                                className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Discard
                            </button>
                        )}
                        <button
                            onClick={activeSection === 'General' ? handleUpdateSettings : (activeSection === 'Account' ? handleUpdateProfile : undefined)}
                            disabled={loading || showSavedFeedback || (activeSection === 'Team') || (!isOwner && activeSection === 'General')}
                            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shadow-xl ${showSavedFeedback
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20 active:scale-100'
                                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/20 active:scale-95'
                                } ${loading || (!isOwner && activeSection === 'General') ? 'opacity-50 cursor-not-allowed' : ''} ${activeSection === 'Team' ? 'opacity-0 pointer-events-none hidden md:flex' : ''}`}
                        >
                            {showSavedFeedback ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {showSavedFeedback ? 'Changes Saved' : loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                    <span className={`text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-2 block mr-2 text-right transition-opacity duration-300 ${activeSection === 'General' && isOwner ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'}`}>
                        Last updated {lastUpdated}
                    </span>
                </div>
            )}

            {/* Navigation Tabs - SegmentedControl */}
            <div className="mb-10 mt-6">
                <SegmentedControl
                    name="settings-nav"
                    value={activeSection}
                    onChange={setActiveSection}
                    options={[
                        { value: 'General', label: 'General' },
                        { value: 'Team', label: 'Team' },
                        { value: 'Account', label: 'Account' },
                    ]}
                />
            </div>

            {activeSection === 'General' && (
                <div className={`${cardClass} max-w-4xl`}>
                    <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                        {/* Store Info Section */}
                        <div className="space-y-8">
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                                    <Settings className="w-5 h-5" />
                                </div>
                                Store Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-0 md:pl-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black block ml-1">Store Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Settings className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={settingsForm.name}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                            className={`${inputClass} pl-12 font-bold text-lg`}
                                            required
                                            disabled={!isOwner}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium ml-1">This name is displayed on customer receipts and invoices.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black block ml-1">Default Currency</label>

                                    {/* Custom Searchable Currency Dropdown */}
                                    <div className="relative">
                                        <div
                                            className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} cursor-pointer flex items-center justify-between transition-all ${!isOwner ? 'opacity-70 pointer-events-none' : 'hover:border-primary-400'}`}
                                            onClick={() => isOwner && setIsCurrencyOpen(!isCurrencyOpen)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Coins className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-lg">{currencyOptions.find(c => c.value === settingsForm.currency)?.label || settingsForm.currency}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isCurrencyOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-40 animate-scale-in origin-top-y">
                                                <div className="p-3 border-b border-slate-100 dark:border-slate-700 relative bg-slate-50/50 dark:bg-slate-900/50">
                                                    <Search className="absolute left-6 top-6 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search currency..."
                                                        value={currencySearch}
                                                        onChange={e => setCurrencySearch(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-950 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 border border-slate-200 dark:border-slate-700"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="max-h-56 overflow-y-auto no-scrollbar pb-2">
                                                    {currencyOptions.filter(c => c.label.toLowerCase().includes(currencySearch.toLowerCase()) || c.value.toLowerCase().includes(currencySearch.toLowerCase())).map(option => (
                                                        <div
                                                            key={option.value}
                                                            className={`px-5 py-3 mx-2 mt-1 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${settingsForm.currency === option.value ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-500 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                            onClick={() => {
                                                                setSettingsForm({ ...settingsForm, currency: option.value });
                                                                setIsCurrencyOpen(false);
                                                                setCurrencySearch('');
                                                            }}
                                                        >
                                                            {option.label}
                                                            {settingsForm.currency === option.value && <Check className="w-4 h-4" />}
                                                        </div>
                                                    ))}
                                                    {currencyOptions.filter(c => c.label.toLowerCase().includes(currencySearch.toLowerCase()) || c.value.toLowerCase().includes(currencySearch.toLowerCase())).length === 0 && (
                                                        <div className="px-5 py-6 text-center text-slate-400 text-sm font-medium">No currencies found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium ml-1">All financial reports will compile in this currency.</p>
                                </div>
                            </div>
                        </div>

                        {/* Divider between sections */}
                        <div className="border-t border-slate-200 dark:border-white/10 my-6"></div>

                        <div className="pt-2">
                            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Mail className="w-5 h-5" />
                                </div>
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-0 md:pl-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black block ml-1">Primary Email <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <input
                                            type="email"
                                            value={settingsForm.email || user?.email || ''}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                                            className={`${inputClass} pl-12 pr-12 font-bold text-lg ${settingsForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsForm.email) ? 'border-red-500 focus:ring-red-500' : ''}`}
                                            placeholder="primary@store.com"
                                            disabled={!isOwner}
                                        />
                                        {settingsForm.email && (
                                            <div className="absolute right-4 top-4 animate-in fade-in zoom-in duration-200">
                                                {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsForm.email)
                                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    : <AlertCircle className="w-5 h-5 text-red-500" />
                                                }
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium ml-1">This email receives system alerts, security codes, and primary invoices.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black block ml-1">Billing Email (Optional)</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                        <input
                                            type="email"
                                            value={settingsForm.secondary_email}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, secondary_email: e.target.value })}
                                            className={`${inputClass} pl-12 pr-12 font-bold text-lg ${settingsForm.secondary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsForm.secondary_email) ? 'border-red-500 focus:ring-red-500' : ''}`}
                                            placeholder="accounting@store.com"
                                            disabled={!isOwner}
                                        />
                                        {settingsForm.secondary_email && (
                                            <div className="absolute right-4 top-4 animate-in fade-in zoom-in duration-200">
                                                {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsForm.secondary_email)
                                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    : <AlertCircle className="w-5 h-5 text-red-500" />
                                                }
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium ml-1">If provided, invoices will be CC'd securely to this address.</p>
                                </div>
                            </div>
                        </div>

                        {!isOwner && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-center gap-3">
                                <Shield className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-bold">Only the store owner can modify overarching business settings.</p>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {activeSection === 'Team' && (
                <div className="space-y-8 max-w-4xl">
                    {/* Invite Member */}
                    <div className={cardClass}>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <UserPlus className="w-6 h-6 text-primary-400" />
                            Invite New Member
                        </h3>
                        <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2 w-full">
                                <label className="text-sm font-medium text-slate-400">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className={inputClass}
                                    placeholder="colleague@example.com"
                                    required
                                />
                            </div>
                            <div className="w-full md:w-48 space-y-2">
                                <label className="text-sm font-medium text-slate-400">Role</label>
                                <CustomSelect
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    options={roleOptions}
                                />
                            </div>
                            <button
                                type="submit"
                                className={`${btnClass} bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 w-full md:w-auto h-[50px]`}
                            >
                                <UserPlus className="w-5 h-5" />
                                Invite
                            </button>
                        </form>
                        <p className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            User must already be registered on the platform to be added.
                        </p>
                    </div>

                    {/* Members List */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold px-2">Team Members ({members.length})</h3>
                        <div className="grid gap-4">
                            {members.map((member) => (
                                <div key={member.user_id} className={`${cardClass} flex flex-col md:flex-row items-center justify-between gap-6 py-6`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-lg">{member.name}</h4>
                                            <p className="text-slate-400 text-sm">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="min-w-[140px]">
                                            <CustomSelect
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                                                options={roleOptions}
                                                disabled={currentBusiness.role !== 'Owner'}
                                            />
                                        </div>

                                        {currentBusiness.role === 'Owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                                                title="Remove Member"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'Account' && (
                <div className={`${cardClass} max-w-4xl`}>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                        <User className="w-6 h-6 text-primary-400" />
                        Personal Account Settings
                    </h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={profileForm.username}
                                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                                        className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} w-full px-4 py-3 rounded-xl border pl-10 focus:ring-2 focus:ring-primary-500 transition-all`}
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Personal Registered Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} w-full px-4 py-3 rounded-xl border pl-10 focus:ring-2 focus:ring-primary-500 transition-all`}
                                        placeholder="personal@email.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Updating Profile...' : 'Update Account'}
                            </button>
                            <p className="mt-4 text-xs text-slate-400 italic">
                                Note: Changing your email will require you to log in with the new email next time.
                            </p>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
