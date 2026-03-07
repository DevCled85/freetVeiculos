import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { FileText, Calendar, User, Eye, ArrowLeft, Download, EyeOff, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemReport } from './SystemReport';
import { useToast } from './Toast';

export const SavedReports: React.FC = () => {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [reports, setReports] = useState<any[]>([]);
    const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ id: string; type: 'monthly' | 'system' } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        const handleOpenMonthly = (e: any) => {
            if (e.detail?.preloadedData) {
                setSelectedReport({
                    title: `Relatório Mensal`,
                    data: e.detail.preloadedData,
                    created_at: e.detail.createdAt,
                    profiles: { full_name: 'Sistema Automático' }
                });
            }
        };
        window.addEventListener('openMonthlyReport', handleOpenMonthly);
        return () => window.removeEventListener('openMonthlyReport', handleOpenMonthly);
    }, []);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [systemRes, monthlyRes] = await Promise.all([
                supabase.from('system_reports').select('*, profiles:created_by(full_name)').order('created_at', { ascending: false }),
                supabase.from('monthly_reports').select('*').order('created_at', { ascending: false })
            ]);

            setReports(systemRes.data || []);
            setMonthlyReports(monthlyRes.data || []);
        } catch (err: any) {
            console.error('Catch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setDeleteLoading(true);
        try {
            const table = deleteModal.type === 'monthly' ? 'monthly_reports' : 'system_reports';
            const { error } = await supabase.from(table).delete().eq('id', deleteModal.id);
            if (error) throw error;

            if (deleteModal.type === 'monthly') {
                setMonthlyReports(prev => prev.filter(r => r.id !== deleteModal.id));
            } else {
                setReports(prev => prev.filter(r => r.id !== deleteModal.id));
            }

            addToast('Relatório apagado com sucesso.', 'success');
            setDeleteModal(null);
        } catch (error: any) {
            addToast('Erro ao apagar relatório.', 'error');
            console.error(error);
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (selectedReport) {
        return (
            <div className="animate-fade-in">
                <div className="mb-6 flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700 print:hidden">
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold transition-colors bg-slate-700/50 px-4 py-2 rounded-lg hover:bg-slate-700 shrink-0"
                    >
                        <ArrowLeft size={20} />
                        Voltar para Lista
                    </button>
                    <div className="flex items-center gap-4 text-right">
                        <div>
                            <p className="text-white font-bold text-lg">{selectedReport.title}</p>
                            <p className="text-sm text-slate-400">Gerado por: {selectedReport.profiles?.full_name}</p>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-500 shadow shadow-primary-500/20 shrink-0 transition-all"
                        >
                            <Download size={18} /> Imprimir
                        </button>
                    </div>
                </div>

                {/* Render the SystemReport component in read-only preloaded mode */}
                <div className="border-4 border-slate-800 print:border-0 rounded-3xl print:rounded-none overflow-hidden shadow-2xl print:shadow-none relative">
                    {/* Header indicating it's a snapshot */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg z-10 flex items-center gap-2 print:hidden">
                        <Calendar size={14} />
                        Cópia Histórica ({new Date(selectedReport.created_at).toLocaleDateString('pt-BR')})
                    </div>

                    {/* The Report itself */}
                    <div className="bg-white text-slate-900 pointer-events-none pb-20">
                        {/* We use pointer-events-none so it's strictly a read-only snapshot, except we might want to let them scroll. So maybe just wrap in a read-only context inside SystemReport if needed. But this is fine for now. */}
                        <SystemReport preloadedData={selectedReport.data} createdAt={selectedReport.created_at} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">Histórico de Relatórios</h2>
                    <p className="text-slate-400 mt-1">Consulte relatórios gerados e salvos anteriormente.</p>
                </div>
            </div>

            {monthlyReports.length > 0 && (
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                        <Calendar size={22} />
                        Relatórios Mensais Automáticos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {monthlyReports.map((report) => (
                            <div
                                key={report.id}
                                className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 transition-all hover:shadow-xl shadow-emerald-500/5 hover:-translate-y-1 group flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0 border border-emerald-500/30">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs font-bold text-white bg-emerald-600 px-2.5 py-1 rounded-t-md">
                                            {new Date(report.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="block text-[10px] font-mono text-emerald-200 bg-emerald-700/80 px-2.5 py-0.5 rounded-b-md border-t border-emerald-500/50">
                                            {new Date(report.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-emerald-400 mb-1 drop-shadow-sm flex items-center gap-2">
                                    Relatório Mensal
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Auto</span>
                                </h3>
                                <p className="text-[11px] text-slate-400 mb-6 font-medium">
                                    Mês de Referência: <span className="text-white font-bold">{report.month_key}</span>
                                </p>

                                <div className="mt-auto flex items-center gap-2 text-sm text-slate-400 mb-6">
                                    <User size={16} />
                                    <span className="truncate">Gerado pelo Sistema</span>
                                </div>

                                <button
                                    onClick={() => setSelectedReport({
                                        title: `Relatório Mensal - ${report.month_key}`,
                                        data: report.data,
                                        created_at: report.created_at,
                                        profiles: { full_name: 'Sistema Automático' }
                                    })}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
                                >
                                    <Eye size={18} />
                                    Visualizar Relatório
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FileText size={22} className="text-primary-500" />
                Relatórios Personalizados
            </h3>

            {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-800/30 border border-slate-700/50 rounded-3xl text-center">
                    <div className="p-4 bg-slate-800 rounded-full mb-4">
                        <FileText size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Nenhum relatório salvo</h3>
                    <p className="text-slate-400 max-w-sm">
                        Relatórios gerados pelos supervisores através da aba Dashboard aparecerão aqui para consulta futura.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-slate-800/80 border border-slate-700 hover:border-primary-500/50 rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400 shrink-0">
                                    <FileText size={24} />
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-slate-500 bg-slate-900 px-2.5 py-1 rounded-t-md">
                                        {new Date(report.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="block text-[10px] font-mono text-slate-400 bg-slate-900/50 px-2.5 py-0.5 rounded-b-md border-t border-slate-800">
                                        {new Date(report.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">
                                Relatório Personalizado
                            </h3>
                            <p className="text-[11px] text-slate-400 mb-6 break-words leading-relaxed font-medium">
                                {report.title.replace('Relatório Geral - ', '').replace('Relatório Geral ', '')}
                            </p>

                            <div className="mt-auto flex items-center gap-2 text-sm text-slate-400 mb-6">
                                <User size={16} />
                                <span className="truncate">{report.profiles?.full_name || 'Usuário Desconhecido'}</span>
                            </div>

                            <div className="mt-auto flex gap-2">
                                <button
                                    onClick={() => setSelectedReport(report)}
                                    className="flex-1 py-2.5 bg-slate-700/50 hover:bg-primary-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-600 hover:border-primary-500"
                                >
                                    <Eye size={18} />
                                    Visualizar
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ id: report.id, type: 'system' })}
                                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl flex items-center justify-center transition-colors border border-red-500/20"
                                    title="Apagar Relatório"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            <AnimatePresence>
                {deleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full relative p-6 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Remover Relatório?</h2>
                            <p className="text-sm text-slate-400 mb-6">Esta ação removerá o relatório salvo do banco de dados e não poderá ser desfeita.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-60 shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] transition-colors">
                                    {deleteLoading ? 'Removendo...' : 'Remover'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
