import React, { useState, useEffect } from 'react';
import { supabase, FuelLog, Vehicle, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast, ToastContainer } from './Toast';
import {
    Fuel,
    Search,
    Camera,
    Droplets,
    DollarSign,
    TrendingUp,
    X,
    User,
    MapPin,
    Calendar,
    Edit2,
    Trash2,
    Plus,
    CheckCircle2,
    Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Extended type to include joined data
type FuelLogExtended = FuelLog & {
    profiles?: { full_name: string };
    vehicles?: { brand: string; model: string; plate: string; color?: string; photo_url?: string };
};

export const FuelListSupervisor: React.FC = () => {
    const { profile } = useAuth();
    const [logs, setLogs] = useState<FuelLogExtended[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const { toasts, addToast, dismissToast } = useToast();
    const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);

    // Add Fuel States
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [newLog, setNewLog] = useState({
        vehicle_id: '',
        mileage: 0,
        liters: 0,
        value: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit/Delete States
    const [editingLog, setEditingLog] = useState<Partial<FuelLog> | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchLogs(true);
        fetchVehicles();

        if (isSupabaseConfigured) {
            const channel = supabase.channel('fuel-supervisor')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_logs' }, () => {
                    fetchLogs(false);
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, []);

    const fetchVehicles = async () => {
        if (!isSupabaseConfigured) return;
        const { data } = await supabase.from('vehicles').select('*');
        if (data) setVehicles(data);
    };

    const fetchLogs = async (showLoading = false) => {
        if (showLoading) setLoading(true);

        if (!isSupabaseConfigured) {
            // Mock Data if no supabase
            setLogs([{
                id: '1', vehicle_id: '1', driver_id: '1', mileage: 12000, liters: 40, value: 200, date: new Date().toISOString(), created_at: new Date().toISOString(), photo_url: 'https://placehold.co/600x400',
                profiles: { full_name: 'Motorista Mock' },
                vehicles: { brand: 'Toyota', model: 'Corolla', plate: 'ABC-1234' }
            }]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('fuel_logs')
            .select('*, profiles(full_name), vehicles(brand, model, plate, color, photo_url)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const filteredData = data.filter((log: any) => log.profiles?.full_name !== 'Desenvolvedor (Super)' && log.profiles?.username !== 'super');
            setLogs(filteredData as any[]);
        }
        setLoading(false);
    };

    const filteredLogs = logs.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        const plateMatch = log.vehicles?.plate.toLowerCase().includes(searchLower);
        const driverMatch = log.profiles?.full_name?.toLowerCase().includes(searchLower);
        const modelMatch = log.vehicles?.model.toLowerCase().includes(searchLower);
        return plateMatch || driverMatch || modelMatch;
    });

    // Grouping by relative time
    const getRelativeCategory = (dateStr: string) => {
        const logDate = new Date(dateStr);
        const now = new Date();

        // Reset times for accurate day differences
        const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
        const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffDays = Math.floor((currentDay.getTime() - logDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays <= 7) return 'Últimos 7 dias';
        if (diffDays <= 14) return 'Últimos 14 dias';
        if (diffDays <= 30) return 'Último 1 mês';
        if (diffDays <= 60) return 'Últimos 2 meses';
        if (diffDays <= 90) return 'Últimos 3 meses';
        if (diffDays <= 180) return 'Últimos 6 meses';
        if (diffDays <= 365) return 'Último 1 ano';
        return 'Mais antigos';
    };

    const groupedLogs = filteredLogs.reduce((acc, log) => {
        const group = getRelativeCategory(log.created_at);
        if (!acc[group]) acc[group] = [];
        acc[group].push(log);
        return acc;
    }, {} as Record<string, FuelLogExtended[]>);

    const categoryOrder = [
        'Hoje',
        'Ontem',
        'Últimos 7 dias',
        'Últimos 14 dias',
        'Último 1 mês',
        'Últimos 2 meses',
        'Últimos 3 meses',
        'Últimos 6 meses',
        'Último 1 ano',
        'Mais antigos'
    ];

    const sortedGroupedLogs = (Object.entries(groupedLogs) as [string, FuelLogExtended[]][]).sort(
        ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    const handleUploadMissingReceipt = async (logId: string, file: File) => {
        try {
            setUploadingLogId(logId);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('fuel-receipts')
                .upload(filePath, file);

            if (uploadError) throw new Error('Falha ao upar comprovante: ' + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('fuel-receipts')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('fuel_logs')
                .update({ photo_url: publicUrl })
                .eq('id', logId);

            if (updateError) throw updateError;

            addToast('Comprovante anexado com sucesso!', 'success');
            fetchLogs();

        } catch (error: any) {
            console.error('Error uploading missing receipt:', error);
            addToast(error.message || 'Erro ao anexar comprovante.', 'error');
        } finally {
            setUploadingLogId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('fuel_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            addToast('Abastecimento excluído com sucesso!', 'success');
            fetchLogs(false);
        } catch (error: any) {
            console.error('Error deleting log:', error);
            addToast(error.message || 'Erro ao excluir abastecimento.', 'error');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingLog?.id) return;

        setIsSavingEdit(true);
        try {
            const { error } = await supabase
                .from('fuel_logs')
                .update({
                    liters: editingLog.liters,
                    value: editingLog.value,
                    mileage: editingLog.mileage,
                })
                .eq('id', editingLog.id);

            if (error) throw error;
            addToast('Abastecimento atualizado com sucesso!', 'success');
            setEditingLog(null);
            fetchLogs(false);
        } catch (error: any) {
            console.error('Error updating log:', error);
            addToast('Erro ao atualizar abastecimento.', 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        const selectedVehicle = vehicles.find(v => v.id === newLog.vehicle_id);
        if (!selectedVehicle) {
            addToast('Selecione um veículo válido.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Mileage Validation
            const { data: previousLogs, error: prevError } = await supabase
                .from('fuel_logs')
                .select('mileage')
                .eq('vehicle_id', newLog.vehicle_id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (prevError) throw prevError;

            const isFirstLog = !previousLogs || previousLogs.length === 0;

            if (isFirstLog) {
                if (newLog.mileage < selectedVehicle.mileage) {
                    addToast(`A quilometragem não pode ser menor que a inicial do veículo (${selectedVehicle.mileage} km).`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            } else {
                const lastMileage = previousLogs[0].mileage;
                if (newLog.mileage < lastMileage) {
                    addToast(`A quilometragem não pode ser menor que a do último abastecimento (${lastMileage} km).`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            }

            let finalPhotoUrl = null;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('fuel-receipts')
                    .upload(filePath, photoFile);

                if (uploadError) throw new Error('Falha ao upar comprovante: ' + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('fuel-receipts')
                    .getPublicUrl(filePath);

                finalPhotoUrl = publicUrl;
            }

            const { error } = await supabase
                .from('fuel_logs')
                .insert([{
                    ...newLog,
                    photo_url: finalPhotoUrl,
                    driver_id: profile.id
                }]);

            if (error) throw error;

            setIsAdding(false);
            fetchLogs(false);
            setNewLog({ vehicle_id: '', mileage: 0, liters: 0, value: 0 });
            setPhotoFile(null);
            addToast('Abastecimento registrado com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error logging fuel:', error);
            addToast(error.message || 'Erro ao registrar abastecimento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Fuel size={24} className="text-primary-400" />
                    Todos os Abastecimentos
                </h3>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    <div className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Buscar por placa, motorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary-900/50 transition-all whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Registrar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedGroupedLogs.length > 0 ? (
                        sortedGroupedLogs.map(([category, categoryLogs]) => (
                            <div key={category}>
                                {category !== 'Hoje' && (
                                    <div className="flex items-center gap-3 mb-4">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] px-2 py-1">
                                            {category}
                                        </h4>
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-700/30 to-transparent"></div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {categoryLogs.map(log => {
                                        const isToday = new Date(log.created_at).toDateString() === new Date().toDateString();
                                        return (
                                            <div key={log.id} className="relative mt-4">
                                                {isToday && (
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-primary-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-lg border border-primary-400 whitespace-nowrap shadow-primary-500/50">
                                                        Abastecido Hoje
                                                    </div>
                                                )}
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-elegant overflow-hidden hover:border-slate-700 transition-colors"
                                                >
                                                    {/* Vehicle Background Image with Gradient Overlay */}
                                                    {log.vehicles?.photo_url && (
                                                        <>
                                                            <div
                                                                className="absolute inset-0 z-0 bg-no-repeat opacity-30 mix-blend-luminosity"
                                                                style={{
                                                                    backgroundImage: `url(${log.vehicles.photo_url})`,
                                                                    backgroundSize: '80%',   // Fills most of the card, adjust as needed
                                                                    backgroundPosition: 'top right', // anchors image to top right
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-900 via-slate-900/90 to-transparent" />
                                                        </>
                                                    )}

                                                    <div className="relative z-10">
                                                        <div className="p-5 border-b border-slate-800/50 flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-white text-lg drop-shadow-md">
                                                                    {log.vehicles?.model} <span className="text-sm font-normal text-slate-300">/ {log.vehicles?.brand}</span>
                                                                </h4>
                                                                <p className="text-xs text-slate-300 font-medium uppercase tracking-widest mt-1 drop-shadow-md">
                                                                    {log.vehicles?.plate} {log.vehicles?.color ? `- ${log.vehicles.color}` : ''}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 z-20">
                                                                {log.photo_url ? (
                                                                    <button
                                                                        onClick={() => setSelectedPhoto(log.photo_url!)}
                                                                        className="flex items-center gap-2 p-2 px-3 bg-primary-500/80 text-white hover:bg-primary-500 backdrop-blur-sm rounded-xl transition-colors shadow-lg text-[10px] font-bold uppercase"
                                                                        title="Ver Comprovante"
                                                                    >
                                                                        <Camera size={14} /> Comprovante
                                                                    </button>
                                                                ) : (
                                                                    <label
                                                                        className={`flex items-center justify-center p-2 bg-red-500/80 text-white hover:bg-red-500 backdrop-blur-sm rounded-xl transition-colors shadow-lg cursor-pointer ${uploadingLogId === log.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                                        title="Adicionar Comprovante"
                                                                    >
                                                                        {uploadingLogId === log.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={18} />}
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            capture="environment"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                if (e.target.files && e.target.files[0]) {
                                                                                    handleUploadMissingReceipt(log.id, e.target.files[0]);
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {editingLog?.id === log.id ? (
                                                            <div className="p-5 space-y-4 bg-slate-800/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Litros</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            value={editingLog.liters || ''}
                                                                            onChange={e => setEditingLog({ ...editingLog, liters: parseFloat(e.target.value) })}
                                                                            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                                                                            step="0.01"
                                                                        />
                                                                        <Droplets size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor Total (R$)</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            value={editingLog.value || ''}
                                                                            onChange={e => setEditingLog({ ...editingLog, value: parseFloat(e.target.value) })}
                                                                            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                                                                            step="0.01"
                                                                        />
                                                                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quilometragem</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            value={editingLog.mileage || ''}
                                                                            onChange={e => setEditingLog({ ...editingLog, mileage: parseInt(e.target.value) })}
                                                                            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                                                                        />
                                                                        <TrendingUp size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-3 pt-2">
                                                                    <button
                                                                        onClick={handleEditSave}
                                                                        disabled={isSavingEdit}
                                                                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                                                    >
                                                                        {isSavingEdit ? (
                                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                        ) : (
                                                                            'Salvar Edição'
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingLog(null)}
                                                                        className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-5 space-y-4">
                                                                <div className="flex items-center gap-3 text-slate-200 bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 p-3 rounded-xl shadow-sm">
                                                                    <User size={18} className="text-primary-400" />
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Motorista</p>
                                                                        <p className="text-sm font-semibold">{log.profiles?.full_name}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 text-slate-200">
                                                                    <Calendar size={18} className="text-slate-400" />
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Data e Hora (Registro exato)</p>
                                                                        <p className="text-sm">{new Date(log.created_at).toLocaleString('pt-BR', {
                                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                                            hour: '2-digit', minute: '2-digit'
                                                                        })}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/50 mt-2">
                                                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/50 p-2 rounded-xl text-center shadow-sm flex flex-col items-center justify-center">
                                                                        <Droplets size={14} className="text-slate-400 mb-1" />
                                                                        <p className="text-[9px] uppercase font-bold text-slate-400">Litros</p>
                                                                        <p className="font-bold text-white text-[11px] whitespace-nowrap">{log.liters.toFixed(1)}L</p>
                                                                    </div>
                                                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/50 p-2 rounded-xl text-center shadow-sm overflow-hidden flex flex-col items-center justify-center">
                                                                        <DollarSign size={14} className="text-slate-400 mb-1" />
                                                                        <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                                                                        <p className="font-bold text-white text-[11px] whitespace-nowrap tracking-tighter" title={log.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
                                                                            {log.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/50 p-2 rounded-xl text-center shadow-sm flex flex-col items-center justify-center">
                                                                        <TrendingUp size={14} className="text-slate-400 mb-1" />
                                                                        <p className="text-[9px] uppercase font-bold text-slate-400">KM</p>
                                                                        <p className="font-bold text-white text-[11px] whitespace-nowrap">{log.mileage.toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>

                                                {/* Edit / Delete Buttons (Bottom pill like "Abastecido Hoje") */}
                                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                                    <button
                                                        onClick={() => setEditingLog(editingLog?.id === log.id ? null : log)}
                                                        className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md transition-all"
                                                        title="Editar Abastecimento"
                                                    >
                                                        <Edit2 size={12} /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(log.id)}
                                                        className="flex items-center gap-1.5 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md transition-all"
                                                        title="Excluir Abastecimento"
                                                    >
                                                        <Trash2 size={12} /> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <Fuel size={48} className="mx-auto mb-4 text-slate-600" />
                            <p className="text-slate-400 font-medium text-lg mb-2">Nenhum abastecimento encontrado.</p>
                            <p className="text-slate-500 text-sm">Tente limpar os filtros de busca ou aguarde novos registros.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
                            onClick={() => setDeleteConfirmId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-full max-w-sm px-4"
                        >
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Excluir Abastecimento?</h3>
                                <p className="text-slate-400 mb-6 text-sm">Tem certeza que deseja apagar este registro? Esta ação não poderá ser desfeita.</p>

                                <div className="w-full grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deleteConfirmId)}
                                        disabled={isDeleting}
                                        className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex justify-center items-center shadow-lg shadow-red-500/20 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            'Excluir'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add Fuel Log Modal */}
            <AnimatePresence>
                {isAdding && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                            onClick={() => setIsAdding(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">Registrar Abastecimento</h3>
                                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-200">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Veículo</label>
                                        <select
                                            required
                                            value={newLog.vehicle_id}
                                            onChange={(e) => setNewLog({ ...newLog, vehicle_id: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        >
                                            <option value="">Selecione um veículo</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.model} / {v.brand} ({v.plate}) {v.color ? `- ${v.color}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quilometragem</label>
                                            <input
                                                type="number"
                                                required
                                                value={newLog.mileage || ''}
                                                onChange={(e) => setNewLog({ ...newLog, mileage: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Litros</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={newLog.liters || ''}
                                                onChange={(e) => setNewLog({ ...newLog, liters: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor Total (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={newLog.value || ''}
                                                onChange={(e) => setNewLog({ ...newLog, value: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Comprovante do Posto (Foto)</label>
                                        <div className="border-2 border-dashed border-slate-700 hover:border-primary-500/50 rounded-xl p-4 text-center transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="receipt-photo"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setPhotoFile(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            <label htmlFor="receipt-photo" className="cursor-pointer flex flex-col items-center gap-2">
                                                {photoFile ? (
                                                    <>
                                                        <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center">
                                                            <CheckCircle2 size={24} />
                                                        </div>
                                                        <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">{photoFile.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center">
                                                            <Upload size={24} />
                                                        </div>
                                                        <span className="text-sm text-slate-400 font-medium">Clique para anexar comprovante</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? 'Salvando...' : (
                                                <>
                                                    <CheckCircle2 size={20} />
                                                    Salvar Registro
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Photo View Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedPhoto(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-full max-w-3xl flex flex-col items-center"
                        >
                            <div className="w-full flex justify-end mb-4">
                                <button
                                    onClick={() => setSelectedPhoto(null)}
                                    className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 w-full max-h-[80vh] flex items-center justify-center">
                                <img
                                    src={selectedPhoto}
                                    alt="Comprovante de Abastecimento"
                                    className="max-w-full max-h-[80vh] object-contain"
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
};
