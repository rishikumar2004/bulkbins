import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemedDatePicker = ({ value, onChange, placeholder = 'Select date...', className = '', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [pickerStyle, setPickerStyle] = useState({});
    const triggerRef = useRef(null);
    const pickerRef = useRef(null);

    // Format date for display
    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Calculate position
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const shouldFlip = spaceBelow < 350 && spaceAbove > spaceBelow;

            setPickerStyle({
                position: 'fixed',
                left: `${Math.max(10, rect.left)}px`,
                top: shouldFlip ? 'auto' : `${rect.bottom + 8}px`,
                bottom: shouldFlip ? `${window.innerHeight - rect.top + 8}px` : 'auto',
                zIndex: 9999
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    useEffect(() => {
        const handleClick = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handleDateSelect = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        onChange({ target: { value: dateStr } });
        setIsOpen(false);
    };

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const days = [];

        // Padding for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let d = 1; d <= totalDays; d++) {
            const current = new Date(year, month, d);
            const isToday = current.getTime() === today.getTime();
            const isSelected = value && new Date(value).toDateString() === current.toDateString();

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleDateSelect(current)}
                    className={`h-10 w-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${isSelected
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : isToday
                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                >
                    {d}
                </button>
            );
        }

        return days;
    };

    const changeMonth = (offset) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-full py-2.5 px-5 text-left text-xs font-bold transition-all flex items-center justify-between gap-3 group/btn ${disabled ? 'opacity-50 cursor-not-allowed cursor-not-allowed' : 'hover:border-primary-500/50 hover:bg-slate-50 dark:hover:bg-primary-500/5 shadow-sm'
                    } ${isOpen ? 'border-primary-500 ring-4 ring-primary-500/10' : ''}`}
            >
                <span className={!value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}>
                    {value ? formatDateDisplay(value) : placeholder}
                </span>
                <CalendarIcon className={`w-4 h-4 text-slate-400 group-hover/btn:text-primary-500 transition-colors ${isOpen ? 'text-primary-500' : ''}`} />
            </button>

            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={pickerRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={pickerStyle}
                        className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 w-[340px] select-none"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-serif font-black text-slate-900 dark:text-white">
                                {monthName} <span className="text-slate-400 font-sans text-sm ml-1">{viewDate.getFullYear()}</span>
                            </h4>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                                <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="h-8 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => { onChange({ target: { value: '' } }); setIsOpen(false); }}
                                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDateSelect(new Date())}
                                className="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ThemedDatePicker;
