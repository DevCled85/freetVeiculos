import React, { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    isWithinInterval,
    isBefore,
    isAfter,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(startDate ? new Date(startDate + 'T12:00:00') : new Date());

    // Track tentative selection (e.g., user clicked start and is hovering/looking for end)
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const start = startDate ? new Date(startDate + 'T12:00:00') : null;
    const end = endDate ? new Date(endDate + 'T12:00:00') : null;

    const handleDateClick = (day: Date) => {
        // If no start date, or we already have both, start fresh
        if (!start || (start && end)) {
            onChange(format(day, 'yyyy-MM-dd'), '');
        }
        // If we have a start but no end, form the range
        else if (start && !end) {
            if (isBefore(day, start)) {
                // Clicked before start: switch the order
                onChange(format(day, 'yyyy-MM-dd'), format(start, 'yyyy-MM-dd'));
            } else {
                onChange(format(start, 'yyyy-MM-dd'), format(day, 'yyyy-MM-dd'));
            }
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-white font-bold capitalize text-sm">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "eeeeEE"; // Su, Mo, Tu...
        const startDateOfWeek = startOfWeek(currentMonth, { weekStartsOn: 0 }); // Sunday start

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center text-[10px] font-bold text-slate-500 uppercase flex-1 pb-2">
                    {format(addDays(startDateOfWeek, i), dateFormat, { locale: ptBR }).substring(0, 3)}
                </div>
            );
        }
        return <div className="flex w-full border-b border-slate-800 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDateOfWeek = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDateOfWeek = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const rows = [];
        let days = [];
        let day = startDateOfWeek;
        let formattedDate = "";

        while (day <= endDateOfWeek) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;

                // Logic for styling
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelectedStart = start && isSameDay(day, start);
                const isSelectedEnd = end && isSameDay(day, end);

                let isWithinRange = false;
                if (start && end) {
                    isWithinRange = isWithinInterval(day, { start, end }) && !isSelectedStart && !isSelectedEnd;
                } else if (start && hoverDate) {
                    const tempStart = isBefore(hoverDate, start) ? hoverDate : start;
                    const tempEnd = isBefore(hoverDate, start) ? start : hoverDate;
                    isWithinRange = isWithinInterval(day, { start: tempStart, end: tempEnd }) && !isSelectedStart && !isSameDay(day, hoverDate);
                }

                const isHoverEdge = !end && start && hoverDate && isSameDay(day, hoverDate) && !isSelectedStart;

                let bgClass = "bg-transparent hover:bg-slate-800 text-slate-300";
                if (!isCurrentMonth) {
                    bgClass = "text-slate-600 hover:bg-slate-800/50";
                }

                // Active selection styling
                if (isSelectedStart || isSelectedEnd) {
                    bgClass = "bg-primary-600 font-bold text-white shadow-md shadow-primary-900/50 relative z-10";
                } else if (isWithinRange) {
                    bgClass = "bg-primary-500/10 text-primary-300 font-medium";
                } else if (isHoverEdge) {
                    bgClass = "bg-primary-500/20 text-primary-300 font-bold border border-primary-500/30";
                }

                // Connection bridges
                const isStartHalf = isSelectedStart && (end || hoverDate) && !isSameDay(start, end || hoverDate) && !isAfter(start, end || hoverDate);
                const isEndHalf = (isSelectedEnd || isHoverEdge) && start && !isSameDay(start, day) && !isBefore(day, start);
                const isLeftHalf = isWithinRange && i !== 0 && !isSelectedStart;
                const isRightHalf = isWithinRange && i !== 6 && !isSelectedEnd;

                days.push(
                    <div
                        key={day.toString()}
                        className="flex-1 h-10 flex items-center justify-center relative"
                        onMouseEnter={() => setHoverDate(cloneDay)}
                        onMouseLeave={() => setHoverDate(null)}
                    >
                        {/* Background connection bridges for the range visually connecting adjacent cells */}
                        {(isStartHalf || isLeftHalf || isWithinRange || isSelectedEnd) && (end || hoverDate) && (
                            <div className={`absolute h-8 top-1 bg-primary-500/10 ${isSelectedStart && !isSameDay(start, end || hoverDate) ? 'right-0 w-1/2 rounded-l-full' : ''
                                } ${(isSelectedEnd || isHoverEdge) ? 'left-0 w-1/2 rounded-r-full' : ''
                                } ${isWithinRange ? 'w-full' : ''
                                }`} />
                        )}

                        <button
                            onClick={() => handleDateClick(cloneDay)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all z-10 relative ${bgClass} ${isSameDay(day, new Date()) && !isSelectedStart && !isSelectedEnd && !isWithinRange ? 'border border-primary-500/50 text-primary-400 font-bold' : ''}`}
                        >
                            {formattedDate}
                        </button>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="flex w-full mt-1" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="w-full">{rows}</div>;
    };

    const clearSelection = () => {
        onChange('', '');
    };

    return (
        <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-2xl w-full select-none">
            {renderHeader()}
            {renderDays()}
            <div className="min-h-[220px]">
                {renderCells()}
            </div>

            {/* Helper text / Clear button */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    {!start ? 'Selecione o início' : !end ? 'Selecione o fim' : 'Período Completo'}
                </p>
                {(start || end) && (
                    <button
                        onClick={clearSelection}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition-colors"
                    >
                        Limpar <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};
