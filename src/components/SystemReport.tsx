import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateReportData, ReportData } from '../lib/reports';
import { useToast } from './Toast';
import { useAuth } from '../lib/AuthContext';
import { X, Printer, FileText, Download, Loader2, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';



interface SystemReportProps {
    preloadedData?: ReportData; // Changed to ReportData type
    onClose?: () => void;
    startDate?: string;
    endDate?: string;
    createdAt?: string; // If preloaded, the historic date of generation
}

export const SystemReport: React.FC<SystemReportProps> = ({ preloadedData, onClose, startDate, endDate, createdAt }) => {
    const { profile } = useAuth();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const hasSavedRef = useRef(false);

    useEffect(() => {
        if (preloadedData) {
            setData(preloadedData);
            setLoading(false);
            return;
        }

        const fetchReportData = async () => {
            if (!isSupabaseConfigured) {
                addToast('Banco de dados não configurado.', 'error');
                setLoading(false);
                return;
            }

            try {
                const finalData = await generateReportData(startDate, endDate);


                setData(finalData);

                // Automagically save this generated report snapshot to the database if not preloaded
                if (profile?.role === 'supervisor' && !preloadedData && !hasSavedRef.current) {
                    hasSavedRef.current = true;
                    try {
                        let title = `Relatório Geral`;
                        if (startDate && endDate) {
                            title += ` - ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                        } else if (startDate) {
                            title += ` - A partir de ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                        } else if (endDate) {
                            title += ` - Até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                        } else {
                            const monthName = new Date().toLocaleString('pt-BR', { month: 'long' });
                            title += ` - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${new Date().getFullYear()}`;
                        }

                        // We check if we already saved one today to avoid spam, but for now let's just save it.
                        await supabase.from('system_reports').insert([{
                            created_by: profile.id,
                            title: `${title} (${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`,
                            data: finalData
                        }]);
                        // Silently fails if table not created yet or fails.
                    } catch (e) {
                        console.warn('Failed to save report history', e);
                    }
                }

            } catch (err: any) {
                console.error(err);
                addToast('Erro ao gerar relatório.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preloadedData]); // Removed profile and addToast to prevent infinite loops

    // Set document title for PDF filename as soon as report loads
    useEffect(() => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const pdfName = `Relatorio_FleetCheck_${dd}-${mm}-${yyyy}_${hh}h${min}`;

        const originalTitle = document.title;
        document.title = pdfName;

        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = () => {
        window.print();
    };





    return (
        <div className={preloadedData ? "animate-fade-in" : "fixed inset-0 bg-slate-100 z-[100] flex flex-col print:bg-white print:z-auto print:static"}>
            {/* Header bar (Not printed) */}
            {!preloadedData && (
                <div className="bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 print:hidden shadow-lg border-b border-slate-800 gap-2 sm:gap-4">
                    <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-500/20 text-primary-400 rounded-lg shrink-0">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-white truncate">Relatório Geral</h2>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="sm:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:w-auto shrink-0">
                        <button
                            onClick={handlePrint}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-primary-900/50 shrink-0"
                        >
                            <Printer size={16} /> <span className="hidden sm:inline">Imprimir / PDF</span><span className="sm:hidden">PDF</span>
                        </button>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="hidden sm:flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Buscando informações gerais da frota...</p>
                </div>
            ) : data ? (
                <div className="flex-1 overflow-y-auto p-1.5 sm:p-4 md:p-8 print:p-0 bg-slate-100 print:bg-white text-slate-800 scrollbar-dark" id="printable-report">
                    <div className="max-w-5xl mx-auto bg-white print:shadow-none shadow-sm sm:shadow-2xl print:border-0 border border-slate-200 rounded-lg sm:rounded-2xl p-3 sm:p-8 md:p-12 print:p-0">
                        {/* Report Header */}
                        <div className="border-b-2 border-slate-200 pb-5 mb-8 flex flex-row items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 leading-tight">
                                    <Car className="text-primary-600 print:hidden shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
                                    <span className="flex flex-col sm:flex-row sm:gap-1.5 md:gap-2 min-w-0 flex-1">
                                        <span>Relatório de Gestão</span>
                                        <span className="text-primary-600">FleetCheck</span>
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
                                    {startDate || endDate
                                        ? `Período: ${startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}`
                                        : 'Visão global da frota, consumos e avarias.'}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Emissão</p>
                                <p className="text-base font-bold text-slate-700">{createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] font-mono text-slate-500 mb-1">{createdAt ? new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Gerado por: <span className="font-bold text-slate-700">
                                        {preloadedData ? 'Registro Histórico' : profile?.full_name}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* 1. Resumo Executivo */}
                        <section className="mb-10 page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Resumo Executivo</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Frota</p>
                                    <p className="text-2xl font-black text-slate-800">{data.metrics.totalVehicles}</p>
                                    <p className="text-xs font-medium text-emerald-600 mt-1">{data.metrics.activeVehicles} Ativos • {data.metrics.maintenanceVehicles} Parados</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Combustível</p>
                                    <p className="text-2xl font-black text-slate-800">{data.metrics.totalFuelCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">{data.metrics.totalFuelLiters.toFixed(0)} Litros Abastecidos</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Média Global</p>
                                    <p className="text-2xl font-black text-primary-600">{data.metrics.globalAvgConsumption.toFixed(1)} <span className="text-sm font-bold text-primary-600/60">km/L</span></p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Em veículos com múltiplos abastecimentos</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avarias</p>
                                    <p className="text-2xl font-black text-red-500">{data.metrics.pendingDamages}</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Pendentes de Reparo ({data.metrics.resolvedDamages} Resolvidas)</p>
                                </div>
                            </div>
                        </section>

                        {/* 2. Consumo por Veículo */}
                        <section className="mb-10 page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Consumo por Veículo</h2>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full sm:table-fixed text-left text-sm">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[8px] sm:text-[9px] tracking-widest leading-none sm:leading-tight">
                                        <tr>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 w-[28%] sm:w-[35%] align-bottom break-words whitespace-normal">Veículo</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-center sm:text-right w-[16%] align-bottom break-words whitespace-normal font-bold">Km</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-center sm:text-right w-[16%] align-bottom break-words whitespace-normal font-bold">Lts</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-center w-[18%] align-bottom break-words whitespace-normal font-bold">Média</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right w-[22%] align-bottom break-words whitespace-normal font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.vehicles.map(v => {
                                            const m = data.vehicleMetrics[v.id];
                                            if (!m || m.liters === 0) return null; // Hide vehicles with no logs
                                            const vLogs = data.fuelLogs.filter((log: any) => log.vehicle_id === v.id);
                                            return (
                                                <React.Fragment key={v.id}>
                                                    <tr className="hover:bg-slate-50 bg-slate-50/50 text-[9px] sm:text-[12px]">
                                                        <td className="px-1.5 sm:px-4 py-2 sm:py-3 font-bold text-slate-800 capitalize whitespace-normal break-words align-middle overflow-hidden text-ellipsis">
                                                            <span className="hidden sm:inline">{v.model.toLowerCase()} - </span>
                                                            <span>{v.plate}</span>
                                                            <div className="text-slate-500 font-normal mt-0.5 sm:mt-0 sm:inline sm:ml-1 text-[8px] sm:text-[11px] leading-none sm:leading-normal">({v.color || '-'})</div>
                                                        </td>
                                                        <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-center sm:text-right text-slate-600 font-medium whitespace-nowrap align-middle">{m.kmTraveled > 0 ? m.kmTraveled.toLocaleString() : '-'}</td>
                                                        <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-center sm:text-right text-slate-600 font-medium whitespace-nowrap align-middle">{m.liters.toFixed(1)}</td>
                                                        <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-center font-bold text-primary-600 whitespace-nowrap align-middle">{m.avg > 0 ? m.avg.toFixed(1) : '-'}</td>
                                                        <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-bold text-slate-800 whitespace-nowrap align-middle">{m.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                    </tr>
                                                    {vLogs.length > 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-2 sm:px-4 py-2 sm:py-3 bg-white border-b border-slate-100">
                                                                <div className="pl-2 sm:pl-4 border-l-2 border-slate-200">
                                                                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 mb-1 sm:mb-2 tracking-widest">Histórico de Abastecimentos</p>
                                                                    <div className="flex flex-row flex-wrap gap-1.5 sm:gap-2">
                                                                        {vLogs.map((log: any) => (
                                                                            <div key={log.id} className="inline-flex flex-col sm:flex-row sm:items-center bg-slate-100 px-2 py-1.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-xs text-slate-700 font-medium border border-slate-200 text-center sm:text-left leading-tight">
                                                                                <span className="text-slate-500">{new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                <span className="text-slate-300 mx-1">•</span>
                                                                                <span className="font-bold text-slate-800">{log.liters}L</span>
                                                                                {log.cost > 0 && (
                                                                                    <>
                                                                                        <span className="text-slate-300 mx-1 hidden sm:inline">-</span>
                                                                                        <span className="text-slate-600 text-[8px] sm:text-[11px] mt-0.5 sm:mt-0 font-bold">{log.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                    </>
                                                                                )}
                                                                                {log.profiles?.full_name && <span className="text-slate-400 italic mt-0.5 sm:mt-0 text-[8px] sm:text-[11px] sm:ml-1 hidden sm:inline-block">({log.profiles.full_name})</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {data.fuelLogs.length === 0 && (
                                    <div className="p-4 text-center text-sm text-slate-500">Nenhum abastecimento registrado.</div>
                                )}
                            </div>
                        </section>

                        {/* 3. Situação da Frota */}
                        <section className="mb-10 page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Situação Atual da Frota</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {data.vehicles.map(v => {
                                    return (
                                        <div key={v.id} className={`p - 3 rounded - lg border - l - 4 border bg - slate - 50 ${v.status === 'active' ? 'border-l-emerald-500 border-slate-200' : 'border-l-amber-500 border-slate-200'} `}>
                                            <p className="font-bold text-slate-800 capitalize text-sm">{v.model.toLowerCase()} <span className="font-normal text-slate-500">/ {v.brand.toLowerCase()}</span></p>
                                            <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-200 px-1.5 py-0.5 rounded inline-block">{v.plate}</p>
                                            {v.color && <span className="ml-2 text-xs text-slate-500 capitalize">{v.color}</span>}
                                            <p className="text-[10px] font-bold uppercase mt-2 tracking-wider">
                                                {v.status === 'active'
                                                    ? <span className="text-emerald-600">Disponível / Ativo</span>
                                                    : <span className="text-amber-600">Em Manutenção / Parado</span>
                                                }
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Ocorrências (Avarias Recentes)</h2>
                            {data.damages.length === 0 ? (
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">Nenhuma avaria registrada no sistema.</div>
                            ) : (
                                <div className="rounded-xl border border-slate-200">
                                    <table className="w-full sm:table-fixed text-left">
                                        <colgroup className="print:hidden">
                                            <col className="w-[80px] sm:w-[110px]" />
                                            <col />
                                            <col className="w-[100px] sm:w-[180px]" />
                                        </colgroup>
                                        <colgroup className="hidden print:table-column-group">
                                            <col className="w-[100px]" />
                                            <col className="w-[90px]" />
                                            <col />
                                            <col className="w-[70px]" />
                                            <col className="w-[85px]" />
                                        </colgroup>
                                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[8px] sm:text-[9px] tracking-widest leading-none">
                                            <tr>
                                                <th className="px-1.5 sm:px-2 py-2">Data</th>
                                                <th className="px-1.5 sm:px-2 py-2">Placa</th>
                                                <th className="px-1.5 sm:px-2 py-2 hidden print:table-cell w-[100px]">Descrição</th>
                                                <th className="px-1.5 sm:px-2 py-2 text-right">Prior. / Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[...data.damages].sort((a: any, b: any) => {
                                                if (a.status === 'pending' && b.status !== 'pending') return -1;
                                                if (a.status !== 'pending' && b.status === 'pending') return 1;
                                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                            }).slice(0, 20).map(d => (
                                                <React.Fragment key={d.id}>
                                                    <tr className="hover:bg-slate-50 border-b border-slate-100 print:border-b-0">
                                                        <td className="px-1.5 sm:px-2 py-2 text-[10px] text-slate-600 font-medium leading-tight">
                                                            {new Date(d.created_at).toLocaleDateString('pt-BR')} <span className="text-slate-400 block text-[8px] sm:text-[9px] mt-0.5">{new Date(d.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                        <td className="px-1.5 sm:px-2 py-2 text-[10px] font-bold text-slate-800 align-top">
                                                            {(d as any).vehicles?.plate || '-'}
                                                            {(d as any).vehicles?.color && <span className="text-[9px] text-slate-500 font-normal block">{(d as any).vehicles.color}</span>}
                                                        </td>
                                                        <td className="px-1.5 sm:px-2 py-2 text-[10px] text-slate-700 whitespace-normal hidden print:table-cell">{d.description}</td>
                                                        <td className="px-1.5 sm:px-2 py-2 text-right align-top">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`px-1 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase ${d.priority === 'high' ? 'bg-red-100 text-red-700' : d.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {d.priority === 'high' ? 'Alta' : d.priority === 'medium' ? 'Média' : 'Baixa'}
                                                                </span>
                                                                {d.status === 'pending'
                                                                    ? <span className="text-red-500 font-bold text-[8px] sm:text-[9px] uppercase leading-none">Pendente</span>
                                                                    : <span className="text-emerald-500 font-bold text-[8px] sm:text-[9px] uppercase leading-none">Resolvido</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Description row only for Screen view */}
                                                    <tr className="print:hidden border-b border-slate-100 bg-slate-50/20">
                                                        <td colSpan={4} className="px-2 py-1.5 text-[10px] text-slate-700">
                                                            <div className="flex gap-2">
                                                                <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mt-0.5">Descrição:</span>
                                                                <span className="flex-1 italic">{d.description}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.damages.length > 20 && (
                                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500 font-medium">Exibindo as 20 ocorrências mais recentes. Total: {data.damages.length}</div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 5. Checklists */}
                        <section className="page-break-inside-avoid mt-10">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Checklists</h2>
                            {data.checklists.length === 0 ? (
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">Nenhum checklist registrado.</div>
                            ) : (
                                <div className="rounded-xl border border-slate-200">
                                    <table className="w-full sm:table-fixed text-left">
                                        <colgroup className="print:hidden">
                                            <col className="w-[80px] sm:w-[120px]" />
                                            <col />
                                            <col className="w-[80px] sm:w-[140px]" />
                                        </colgroup>
                                        <colgroup className="hidden print:table-column-group">
                                            <col className="w-[110px]" />
                                            <col className="w-[95px]" />
                                            <col className="w-[95px]" />
                                            <col />
                                        </colgroup>
                                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[8px] sm:text-[9px] tracking-widest leading-none">
                                            <tr>
                                                <th className="px-1.5 sm:px-2 py-2">Data</th>
                                                <th className="px-1.5 sm:px-2 py-2">Veículo / Driver</th>
                                                <th className="px-1.5 sm:px-2 py-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[...data.checklists].sort((a: any, b: any) => {
                                                if (a.status !== 'resolved' && b.status === 'resolved') return -1;
                                                if (a.status === 'resolved' && b.status !== 'resolved') return 1;
                                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                            }).slice(0, 20).map((c: any) => {
                                                const driver = data.profiles.find(p => p.id === c.driver_id)?.full_name || 'Desconhecido';
                                                const badItems = (c.checklist_items || []).filter((i: any) => !i.is_ok);

                                                return (
                                                    <React.Fragment key={c.id}>
                                                        {/* Main Row: Visible in both, but status hidden on screen */}
                                                        <tr className="hover:bg-slate-50 border-b border-slate-100 print:border-b-0">
                                                            <td className="px-1.5 sm:px-2 py-2 text-[10px] text-slate-600 font-medium align-top leading-tight">
                                                                {new Date(c.created_at).toLocaleDateString('pt-BR')} <br />
                                                                <span className="text-[8px] sm:text-[9px] text-slate-400">{new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </td>
                                                            <td className="px-1.5 sm:px-2 py-2 text-[10px] align-top leading-tight">
                                                                <div className="font-bold text-slate-800">
                                                                    {c.vehicles?.plate || '-'}
                                                                </div>
                                                                <div className="text-[9px] text-slate-500 font-normal mt-0.5">{driver}</div>
                                                            </td>
                                                            <td className="px-1.5 sm:px-2 py-2 align-top text-right">
                                                                {c.status === 'resolved' ? (
                                                                    <span className="text-emerald-500 font-bold text-[9px] sm:text-[10px] leading-tight">OK</span>
                                                                ) : (
                                                                    <span className="text-red-500 font-bold text-[9px] sm:text-[10px] leading-tight">Pendente</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {/* Status row only for Screen view */}
                                                        <tr className="print:hidden border-b border-slate-100 bg-slate-50/20">
                                                            <td colSpan={3} className="px-2 py-1.5 align-top">
                                                                <div className="flex gap-2 items-start">
                                                                    <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mt-0.5 shrink-0">Status:</span>
                                                                    <div className="flex-1">
                                                                        {c.status === 'resolved' ? (
                                                                            <div>
                                                                                <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1 leading-none"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Concluído / OK</span>
                                                                                <p className="text-[9px] text-slate-500 mt-0.5 italic">Todos os itens conferidos e resolvidos.</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <span className="text-red-500 font-bold text-[10px] flex items-center gap-1 leading-none"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Com Pendências</span>
                                                                                {badItems.length > 0 && (
                                                                                    <ul className="mt-1 space-y-0.5">
                                                                                        {badItems.map((bi: any) => (
                                                                                            <li key={bi.id} className="text-[9px] text-slate-600 bg-red-50 p-1 rounded border border-red-100 flex gap-1">
                                                                                                <span className="font-bold shrink-0">{bi.item_name}:</span> <span className="italic">{bi.notes || 'Sem observação'}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {data.checklists.length > 20 && (
                                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500 font-medium">Exibindo os 20 checklists mais recentes. Total: {data.checklists.length}</div>
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            ) : null}
            {/* Print CSS */}
            <style>{`
@media print {
    @page {
        size: A4;
        margin: 6mm 10mm 18mm 10mm;
    }
    body {
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    #printable-report {
        padding: 0 !important;
        overflow: visible !important;
    }
    #printable-report > div {
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
    }
    section {
        break-inside: avoid;
    }
    table { break-inside: auto; }
    tr { break-inside: avoid; break-after: auto; }
    thead { display: table-header-group; }
    .page-break-inside-avoid { break-inside: avoid; }

    /* Fixed footer that repeats on every page */
    .print-page-footer {
        display: block !important;
        position: fixed;
        bottom: 0;
        right: 0;
        left: 0;
        height: 12mm;
        padding: 2mm 6mm 2mm 6mm;
        text-align: right;
        font-size: 7pt;
        color: #94a3b8;
        font-family: system-ui, -apple-system, sans-serif;
        letter-spacing: 0.05em;
    }
}
`}</style>

            {/* Page footer visible only in print */}
            <div className="print-page-footer" style={{ display: 'none' }}>
                FleetCheck — Relatório de Gestão
            </div>
        </div>
    );
};
