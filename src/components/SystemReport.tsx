import React, { useState, useEffect, useRef } from 'react';
import { supabase, Vehicle, Damage, FuelLog, isSupabaseConfigured } from '../lib/supabase';
import { useToast } from './Toast';
import { X, Printer, FileText, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportData {
    vehicles: Vehicle[];
    damages: Damage[];
    fuelLogs: FuelLog[];
    checklists: any[];
    metrics: {
        totalFuelLiters: number;
        totalFuelCost: number;
        avgKmL: number;
        totalVehicles: number;
        activeVehicles: number;
        maintenanceVehicles: number;
        pendingDamages: number;
        resolvedDamages: number;
    };
    vehicleMetrics: Record<string, { kmTraveled: number; liters: number; cost: number; avg: number }>;
}

export const SystemReport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!isSupabaseConfigured) {
            addToast('Banco de dados não configurado.', 'error');
            setLoading(false);
            return;
        }

        try {
            // Data range: let's get everything for a global report, or maybe last 30 days. Let's do all time for now.
            const [vehRes, damRes, fuelRes, checkRes] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('damages').select('*, vehicles(brand, model, plate)'),
                supabase.from('fuel_logs').select('*, vehicles(brand, model, plate)').order('created_at', { ascending: true }),
                supabase.from('checklists').select('id, status, created_at, vehicle_id')
            ]);

            if (vehRes.error) throw vehRes.error;
            if (damRes.error) throw damRes.error;
            if (fuelRes.error) throw fuelRes.error;

            const vehicles = vehRes.data as Vehicle[];
            const damages = damRes.data as Damage[];
            const fuelLogs = fuelRes.data as any[];
            const checklists = checkRes.data || [];

            // Calculate Metrics
            let totalFuelLiters = 0;
            let totalFuelCost = 0;
            let pendingDamages = 0;
            let resolvedDamages = 0;

            const vMetrics: Record<string, { kmTraveled: number; liters: number; cost: number; avg: number; minKm: number; maxKm: number }> = {};

            vehicles.forEach(v => {
                vMetrics[v.id] = { kmTraveled: 0, liters: 0, cost: 0, avg: 0, minKm: Infinity, maxKm: 0 };
            });

            fuelLogs.forEach(log => {
                totalFuelLiters += log.liters;
                totalFuelCost += log.value;
                const vid = log.vehicle_id;
                if (vMetrics[vid]) {
                    vMetrics[vid].liters += log.liters;
                    vMetrics[vid].cost += log.value;
                    if (log.mileage < vMetrics[vid].minKm) vMetrics[vid].minKm = log.mileage;
                    if (log.mileage > vMetrics[vid].maxKm) vMetrics[vid].maxKm = log.mileage;
                }
            });

            let totalKmTraveled = 0;
            Object.keys(vMetrics).forEach(vid => {
                const met = vMetrics[vid];
                if (met.maxKm > met.minKm && met.minKm !== Infinity) {
                    met.kmTraveled = met.maxKm - met.minKm;
                    totalKmTraveled += met.kmTraveled;
                }
                if (met.liters > 0 && met.kmTraveled > 0) {
                    met.avg = met.kmTraveled / met.liters;
                }
            });

            let avgKmL = 0;
            if (totalFuelLiters > 0 && totalKmTraveled > 0) {
                avgKmL = totalKmTraveled / totalFuelLiters;
            }

            damages.forEach(d => {
                if (d.status === 'resolved') resolvedDamages++;
                else pendingDamages++;
            });

            setData({
                vehicles,
                damages,
                fuelLogs,
                checklists,
                metrics: {
                    totalFuelLiters,
                    totalFuelCost,
                    avgKmL,
                    totalVehicles: vehicles.length,
                    activeVehicles: vehicles.filter(v => v.status === 'active').length,
                    maintenanceVehicles: vehicles.filter(v => ['maintenance', 'inactive'].includes(v.status)).length,
                    pendingDamages,
                    resolvedDamages
                },
                vehicleMetrics: vMetrics
            });

        } catch (err: any) {
            console.error(err);
            addToast('Erro ao gerar relatório.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-slate-100 z-[100] flex flex-col overflow-hidden print:bg-white print:z-auto print:static">
            {/* Header bar (Not printed) */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 print:hidden shadow-lg border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-500/20 text-primary-400 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Relatório Geral do Sistema</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-lg shadow-primary-900/50"
                    >
                        <Printer size={18} /> Imprimir / PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Buscando informações gerais da frota...</p>
                </div>
            ) : data ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 bg-slate-100 print:bg-white text-slate-800 scrollbar-dark">
                    <div className="max-w-5xl mx-auto bg-white print:shadow-none shadow-2xl print:border-0 border border-slate-200 rounded-2xl p-8 md:p-12 print:p-0">
                        {/* Report Header */}
                        <div className="border-b-2 border-slate-200 pb-6 mb-8 flex items-end justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Relatório de Gestão <span className="text-primary-600">FleetCheck</span></h1>
                                <p className="text-slate-500 font-medium mt-1">Visão global da frota, consumos e avarias.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Data de Emissão</p>
                                <p className="text-lg font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* 1. Resumo Executivo */}
                        <section className="mb-10 page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Resumo Executivo</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    <p className="text-2xl font-black text-primary-600">{data.metrics.avgKmL.toFixed(1)} <span className="text-sm font-bold text-primary-600/60">km/L</span></p>
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
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3">Veículo</th>
                                            <th className="px-4 py-3 text-right">Km Rodado</th>
                                            <th className="px-4 py-3 text-right">Litros Cons.</th>
                                            <th className="px-4 py-3 text-center">Média (km/L)</th>
                                            <th className="px-4 py-3 text-right">Custo Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.vehicles.map(v => {
                                            const m = data.vehicleMetrics[v.id];
                                            if (!m || m.liters === 0) return null; // Hide vehicles with no logs
                                            return (
                                                <tr key={v.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-bold text-slate-800 capitalize">{v.model.toLowerCase()} - {v.plate}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600 font-medium">{m.kmTraveled > 0 ? m.kmTraveled.toLocaleString() : '-'}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600 font-medium">{m.liters.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-primary-600">{m.avg > 0 ? m.avg.toFixed(1) : '-'}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{m.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                </tr>
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
                                        <div key={v.id} className={`p-3 rounded-lg border-l-4 border bg-slate-50 ${v.status === 'active' ? 'border-l-emerald-500 border-slate-200' : 'border-l-amber-500 border-slate-200'}`}>
                                            <p className="font-bold text-slate-800 capitalize text-sm">{v.model.toLowerCase()} <span className="font-normal text-slate-500">/ {v.brand.toLowerCase()}</span></p>
                                            <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-200 px-1.5 py-0.5 rounded inline-block">{v.plate}</p>
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

                        {/* 4. Resumo de Ocorrências e Procedimentos */}
                        <section className="page-break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-primary-500 pl-3">Ocorrências (Avarias Recentes)</h2>
                            {data.damages.length === 0 ? (
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">Nenhuma avaria registrada no sistema.</div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3">Data</th>
                                                <th className="px-4 py-3">Veículo</th>
                                                <th className="px-4 py-3">Prioridade</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.damages.slice(0, 20).map(d => (
                                                <tr key={d.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-600 font-medium">{new Date(d.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">{(d as any).vehicles?.plate || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${d.priority === 'high' ? 'bg-red-100 text-red-700' : d.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {d.priority === 'high' ? 'Alta' : d.priority === 'medium' ? 'Média' : 'Baixa'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {d.status === 'pending'
                                                            ? <span className="text-red-500 font-bold text-xs uppercase">Pendente</span>
                                                            : <span className="text-emerald-500 font-bold text-xs uppercase">Resolvido</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.damages.length > 20 && (
                                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500 font-medium">Exibindo as 20 ocorrências mais recentes. Total: {data.damages.length}</div>
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            ) : null}

            {/* Tailwind Print Overrides to Ensure clean print */}
            <style>{`
        @media print {
          @page { margin: 10mm; }
          body { background: white !important; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
        </div>
    );
};
