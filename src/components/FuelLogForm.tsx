import React, { useState, useEffect } from 'react';
import { supabase, Vehicle, FuelLog, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useToast, ToastContainer } from './Toast';
import {
  Fuel,
  Car,
  Calendar,
  DollarSign,
  Droplets,
  TrendingUp,
  CheckCircle2,
  History,
  Plus,
  X,
  Camera,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
];

const MOCK_FUEL_LOGS: any[] = [
  { id: '1', vehicle_id: '1', mileage: 14500, liters: 45, value: 250, date: new Date().toISOString(), vehicles: { brand: 'Toyota', model: 'Corolla', plate: 'ABC-1234' } },
];

export const FuelLogForm: React.FC = () => {
  const { profile } = useAuth();
  const { toasts, addToast, dismissToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentLogs, setRecentLogs] = useState<FuelLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [newLog, setNewLog] = useState({
    vehicle_id: '',
    mileage: 0,
    liters: 0,
    value: 0
  });

  useEffect(() => {
    fetchVehicles();
    fetchRecentLogs();

    if (isSupabaseConfigured) {
      const channel = supabase.channel('fuel-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_logs' }, () => {
          fetchRecentLogs();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchVehicles();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const fetchVehicles = async () => {
    if (!isSupabaseConfigured) {
      setVehicles(MOCK_VEHICLES);
      return;
    }
    const { data } = await supabase.from('vehicles').select('*');
    if (data) setVehicles(data);
  };

  const fetchRecentLogs = async () => {
    if (!isSupabaseConfigured) {
      setRecentLogs(MOCK_FUEL_LOGS as any);
      return;
    }
    if (!profile) return;
    const { data } = await supabase
      .from('fuel_logs')
      .select('*, vehicles(brand, model, plate, color, photo_url)')
      .eq('driver_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentLogs(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const selectedVehicle = vehicles.find(v => v.id === newLog.vehicle_id);
    if (!selectedVehicle) {
      addToast('Selecione um veículo válido.', 'error');
      return;
    }

    setLoading(true);

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
          setLoading(false);
          return;
        }
      } else {
        const lastMileage = previousLogs[0].mileage;
        if (newLog.mileage < lastMileage) {
          addToast(`A quilometragem não pode ser menor que a do último abastecimento (${lastMileage} km).`, 'error');
          setLoading(false);
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
      fetchRecentLogs();
      setNewLog({ vehicle_id: '', mileage: 0, liters: 0, value: 0 });
      setPhotoFile(null);
      addToast('Abastecimento registrado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error logging fuel:', error);
      addToast(error.message || 'Erro ao registrar abastecimento.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      fetchRecentLogs();

    } catch (error: any) {
      console.error('Error uploading missing receipt:', error);
      addToast(error.message || 'Erro ao anexar comprovante.', 'error');
    } finally {
      setUploadingLogId(null);
    }
  };

  if (!profile) return <div className="p-8 text-center text-slate-400">Carregando perfil...</div>;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History size={20} className="text-slate-400" />
          Histórico Recente
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-primary-900/50 transition-all"
        >
          <Plus size={20} />
          Registrar Abastecimento
        </button>
      </div>

      {/* Recent Logs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentLogs.length > 0 ? (
          recentLogs.map((log: any) => {
            const isToday = new Date(log.created_at).toDateString() === new Date().toDateString();
            return (
              <div key={log.id} className="relative mt-4">
                {isToday && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-primary-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-lg border border-primary-400 whitespace-nowrap shadow-primary-500/50">
                    Abastecido Hoje
                  </div>
                )}
                <motion.div
                  layout
                  className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-elegant overflow-hidden hover:border-slate-700 transition-colors"
                >
                  {/* Vehicle Background Image with Gradient Overlay */}
                  {log.vehicles?.photo_url && (
                    <>
                      <div
                        className="absolute inset-0 z-0 bg-no-repeat opacity-30 mix-blend-luminosity"
                        style={{
                          backgroundImage: `url(${log.vehicles.photo_url})`,
                          backgroundSize: '80%',
                          backgroundPosition: 'top right',
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
                          <a
                            href={log.photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 px-3 bg-primary-500/80 text-white hover:bg-primary-500 backdrop-blur-sm rounded-xl transition-colors shadow-lg text-[10px] font-bold uppercase"
                            title="Ver Comprovante"
                          >
                            <Camera size={14} /> Comprovante
                          </a>
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

                    <div className="p-5 space-y-4">
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
                  </div>
                </motion.div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 border-dashed text-center">
            <Fuel size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhum abastecimento registrado</p>
          </div>
        )}
      </div>

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
                      disabled={loading}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Salvando...' : (
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
    </div>
  );
};
