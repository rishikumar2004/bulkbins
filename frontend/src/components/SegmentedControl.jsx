import React from 'react';
import { motion } from 'framer-motion';

/**
 * SegmentedControl - A premium sliding selector component
 * 
 * @param {Array} options - Array of { label: string, value: string }
 * @param {string} value - Current selected value
 * @param {function} onChange - Callback when value changes
 * @param {string} className - Optional container classes
 * @param {string} activeColor - Tailwind background color class for the slider (e.g., 'bg-primary-500')
 * @param {string} name - Unique name for the layoutId (required if multiple per page)
 */
const SegmentedControl = ({
    options,
    value,
    onChange,
    className = "",
    activeColor = "bg-primary-500",
    name = "segmented-control"
}) => {
    return (
        <div className={`inline-flex p-1 bg-slate-100/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden ${className}`}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`relative px-5 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] transition-colors duration-300 z-10 flex-shrink-0 flex items-center justify-center min-w-[90px] ${isActive
                                ? 'text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <span className="relative z-20 transition-transform duration-300">
                            {option.label}
                        </span>
                        {isActive && (
                            <motion.div
                                layoutId={`indicator-${name}`}
                                className={`absolute inset-0 ${activeColor} rounded-xl`}
                                initial={false}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                    mass: 0.8
                                }}
                                style={{
                                    boxShadow: activeColor.includes('primary')
                                        ? '0 4px 12px rgba(62, 140, 78, 0.3)'
                                        : activeColor.includes('amber')
                                            ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                                            : '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;
