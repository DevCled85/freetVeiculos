import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { FileText, Calendar, User, Eye, ArrowLeft, Download, EyeOff } from 'lucide-react';
import { SystemReport } from './SystemReport';
import { useToast } from './Toast';

export const SavedReports: React.FC = () => {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_reports')
                .select('*, profiles:created_by(full_name)')
                .order('created_at', { ascending: false });

            if (error) {
                // If the table doesn't exist yet, it will throw an error. We catch it gracefully.
                console.warn('Erro ao buscar relatórios. Talvez a tabela não exista ainda.', error);
                setReports([]);
            } else {
                setReports(data || []);
            }
        } catch (err: any) {
            console.error('Catch error:', err);
        } finally {
            setLoading(false);
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

                            <button
                                onClick={() => setSelectedReport(report)}
                                className="w-full py-2.5 bg-slate-700/50 hover:bg-primary-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-600 hover:border-primary-500"
                            >
                                <Eye size={18} />
                                Visualizar Relatório
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
