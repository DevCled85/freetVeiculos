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
  X
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
  const [newLog, setNewLog] = useState({
    vehicle_id: '',
    mileage: 0,
    liters: 0,
    value: 0,
    date: new Date().toISOString().split('T')[0]
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
      .select('*, vehicles(brand, model, plate)')
      .eq('driver_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentLogs(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('fuel_logs')
        .insert([{
          ...newLog,
          driver_id: profile.id
        }]);

      if (error) throw error;

      // Update vehicle mileage
      await supabase
        .from('vehicles')
        .update({ mileage: newLog.mileage })
        .eq('id', newLog.vehicle_id);

      setIsAdding(false);
      fetchRecentLogs();
      setNewLog({ vehicle_id: '', mileage: 0, liters: 0, value: 0, date: new Date().toISOString().split('T')[0] });
      addToast('Abastecimento registrado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error logging fuel:', error);
      addToast(error.message || 'Erro ao registrar abastecimento.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="grid grid-cols-1 gap-4">
        {recentLogs.length > 0 ? (
          recentLogs.map((log: any) => (
            <motion.div
              layout
              key={log.id}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-elegant flex flex-col md:flex-row gap-6 items-center"
            >
              <div className="p-4 bg-primary-500/10 text-primary-400 rounded-2xl shrink-0">
                <Fuel size={32} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-bold text-white capitalize">
                    {log.vehicles?.model} <span className="text-sm font-normal text-slate-400">/ {log.vehicles?.brand}</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    {new Date(log.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-slate-400 font-medium uppercase tracking-widest mb-4">
                  {log.vehicles?.plate}
                </p>

                <div className="grid grid-cols-3 gap-8">
                  <div className="flex items-center gap-2">
                    <Droplets size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Litros</p>
                      <p className="text-sm font-bold text-slate-200">{log.liters}L</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valor</p>
                      <p className="text-sm font-bold text-slate-200">R$ {log.value.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">KM</p>
                      <p className="text-sm font-bold text-slate-200">{log.mileage.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
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
                        <option key={v.id} value={v.id}>{v.model} / {v.brand} ({v.plate})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quilometragem</label>
                      <input
                        type="number"
                        required
                        value={newLog.mileage}
                        onChange={(e) => setNewLog({ ...newLog, mileage: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data</label>
                      <input
                        type="date"
                        required
                        value={newLog.date}
                        onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
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
                        value={newLog.liters}
                        onChange={(e) => setNewLog({ ...newLog, liters: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor Total (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newLog.value}
                        onChange={(e) => setNewLog({ ...newLog, value: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      />
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
