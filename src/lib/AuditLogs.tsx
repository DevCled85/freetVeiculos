import React, { useState, useEffect } from 'react';
import { supabase, AuditLog } from './supabase';
import {
    Search,
    Filter,
    History,
    User,
    Database,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Clock
} from 'lucide-react';
import { formatDate } from './utils';

export const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tableFilter, setTableFilter] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (tableFilter !== 'all') {
            query = query.eq('table_name', tableFilter);
        }

        const { data, error } = await query.limit(100);

        if (error) {
            console.error('Error fetching logs:', error);
        } else {
            const filteredData = (data || []).filter(log => log.user_email !== 'super@fleetcheck.com');
            setLogs(filteredData);
        }
        setLoading(false);
    };

    const filteredLogs = logs.filter(log =>
    (log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getActionColor = (action: string) => {
        switch (action) {
            case 'INSERT': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getTableName = (name: string) => {
        const names: Record<string, string> = {
            'vehicles': 'Veículos',
            'profiles': 'Perfis',
            'damages': 'Avarias',
            'fuel_logs': 'Abastecimentos',
            'checklists': 'Checklists'
        };
        return names[name] || name;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Logs de Auditoria</h1>
                    <p className="text-slate-400 mt-1">Histórico detalhado de alterações no sistema.</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <Clock size={16} />
                    <span>Últimos 100 registros</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por e-mail, ação ou tabela..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none transition-all"
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                    >
                        <option value="all">Todas as Tabelas</option>
                        <option value="vehicles">Veículos</option>
                        <option value="profiles">Perfis</option>
                        <option value="damages">Avarias</option>
                        <option value="fuel_logs">Abastecimentos</option>
                        <option value="checklists">Checklists</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/20">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tabela</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                            <span>Carregando logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum log encontrado para os critérios selecionados.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            className={`group hover:bg-slate-800/30 transition-colors cursor-pointer ${expandedId === log.id ? 'bg-slate-800/40' : ''}`}
                                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-medium">{formatDate(log.created_at)}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-slate-300 text-sm truncate max-w-[150px]">{log.user_email || 'Sistema'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-300 text-sm">
                                                    <Database size={14} className="text-slate-500" />
                                                    {getTableName(log.table_name)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-500 group-hover:text-primary-400 transition-colors">
                                                    {expandedId === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === log.id && (
                                            <tr className="bg-slate-800/20">
                                                <td colSpan={5} className="px-6 py-6 ring-1 ring-inset ring-slate-700/30">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {log.old_data && (
                                                            <div className="space-y-2">
                                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                                                    Estado Anterior
                                                                </h4>
                                                                <div className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-60 border border-slate-800 ring-1 ring-red-500/10">
                                                                    {Object.entries(log.old_data).map(([key, value]) => {
                                                                        const isChanged = log.new_data && JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key]);
                                                                        return (
                                                                            <div key={key} className={`py-0.5 ${isChanged ? 'bg-red-500/10 text-red-300' : 'text-slate-400'}`}>
                                                                                <span className="opacity-50">"{key}":</span> {JSON.stringify(value, null, 2)}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {log.new_data && (
                                                            <div className="space-y-2">
                                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                                    Novo Estado
                                                                </h4>
                                                                <div className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-60 border border-slate-800 ring-1 ring-green-500/10">
                                                                    {Object.entries(log.new_data).map(([key, value]) => {
                                                                        const isChanged = log.old_data && JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key]);
                                                                        const isNew = log.old_data && !(key in log.old_data);
                                                                        return (
                                                                            <div key={key} className={`py-0.5 ${isNew ? 'bg-green-500/20 text-green-300 font-bold' : isChanged ? 'bg-green-500/10 text-green-300' : 'text-slate-400'}`}>
                                                                                <span className="opacity-50">"{key}":</span> {JSON.stringify(value, null, 2)}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {log.action === 'UPDATE' && log.old_data && log.new_data && (
                                                            <div className="md:col-span-2 pt-2">
                                                                <div className="bg-primary-500/5 border border-primary-500/10 rounded-lg p-3 flex items-center gap-2 text-xs text-primary-400/80 italic">
                                                                    <ArrowRight size={14} />
                                                                    <span>Dica: Compare as propriedades alteradas no JSON acima.</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
