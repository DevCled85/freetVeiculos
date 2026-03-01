import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number; // ms, default 3000
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const iconMap = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info,
    warning: AlertTriangle,
};

const colorMap = {
    success: {
        bg: 'bg-white border-l-4 border-emerald-500',
        icon: 'text-emerald-500',
        bar: 'bg-emerald-500',
    },
    error: {
        bg: 'bg-white border-l-4 border-red-500',
        icon: 'text-red-500',
        bar: 'bg-red-500',
    },
    info: {
        bg: 'bg-white border-l-4 border-primary-500',
        icon: 'text-primary-500',
        bar: 'bg-primary-500',
    },
    warning: {
        bg: 'bg-white border-l-4 border-amber-500',
        icon: 'text-amber-500',
        bar: 'bg-amber-500',
    },
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const duration = toast.duration ?? 3000;
    const Icon = iconMap[toast.type];
    const colors = colorMap[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), duration);
        return () => clearTimeout(timer);
    }, [toast.id, duration, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`relative w-80 rounded-xl shadow-lg overflow-hidden ${colors.bg}`}
        >
            <div className="flex items-start gap-3 p-4 pr-10">
                <Icon size={20} className={`shrink-0 mt-0.5 ${colors.icon}`} />
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
                <X size={14} />
            </button>
            {/* Countdown progress bar */}
            <motion.div
                className={`h-1 ${colors.bar} origin-left`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
            />
        </motion.div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
        <AnimatePresence mode="sync">
            {toasts.map((t) => (
                <Toast key={t.id} toast={t} onDismiss={onDismiss} />
            ))}
        </AnimatePresence>
    </div>
);

// Hook to manage toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, type, message, duration }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, dismissToast };
};
