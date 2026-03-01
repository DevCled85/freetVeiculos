import React, { useState, useEffect } from 'react';
import { supabase, Vehicle, Damage, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  X,
  Car
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, ToastContainer } from './Toast';

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
];

const MOCK_DAMAGES: any[] = [
  { id: '1', vehicle_id: '2', description: 'Ar condicionado não gela', priority: 'medium', status: 'pending', created_at: new Date().toISOString(), vehicles: { brand: 'Ford', model: 'Ranger', plate: 'XYZ-9876' } },
  { id: '2', vehicle_id: '1', description: 'Pneu furado', priority: 'high', status: 'pending', created_at: new Date().toISOString(), vehicles: { brand: 'Toyota', model: 'Corolla', plate: 'ABC-1234' } },
];

export const DamageReport: React.FC = () => {
  const { profile } = useAuth();
  const { toasts, addToast, dismissToast } = useToast();
  const [damages, setDamages] = useState<Damage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newDamage, setNewDamage] = useState({
    vehicle_id: '',
    description: '',
    priority: 'medium' as const,
    photo_url: ''
  });

  useEffect(() => {
    fetchDamages();
    fetchVehicles();

    if (isSupabaseConfigured) {
      const channel = supabase.channel('damages-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'damages' }, () => {
          fetchDamages();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchVehicles();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const fetchDamages = async () => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem('mock_damages');
      setDamages(saved ? JSON.parse(saved) : MOCK_DAMAGES as any);
      return;
    }
    const { data } = await supabase
      .from('damages')
      .select('*, vehicles(brand, model, plate)')
      .order('created_at', { ascending: false });
    if (data) setDamages(data as any);
  };

  const fetchVehicles = async () => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem('mock_vehicles');
      setVehicles(saved ? JSON.parse(saved) : MOCK_VEHICLES);
      return;
    }
    const { data } = await supabase.from('vehicles').select('*');
    if (data) setVehicles(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      const damage: any = {
        ...newDamage,
        id: Math.random().toString(36).substr(2, 9),
        reported_by: profile.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        vehicles: vehicles.find(v => v.id === newDamage.vehicle_id)
      };
      const updated = [damage, ...damages];
      setDamages(updated);
      localStorage.setItem('mock_damages', JSON.stringify(updated));
      setIsAdding(false);
      setNewDamage({ vehicle_id: '', description: '', priority: 'medium', photo_url: '' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('damages')
        .insert([{
          ...newDamage,
          reported_by: profile.id,
          status: 'pending'
        }]);

      if (error) throw error;

      // Notify supervisors
      await supabase.from('notifications').insert([{
        title: 'Nova Avaria Reportada',
        message: `O motorista ${profile.full_name} reportou uma avaria no veículo ${vehicles.find(v => v.id === newDamage.vehicle_id)?.plate}.`,
        type: 'damage'
      }]);

      setIsAdding(false);
      fetchDamages();
      setNewDamage({ vehicle_id: '', description: '', priority: 'medium', photo_url: '' });
      addToast('Avaria reportada com sucesso!', 'info');
    } catch (error: any) {
      console.error('Error reporting damage:', error);
      addToast(error.message || 'Erro ao reportar avaria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingId) return;

    if (!isSupabaseConfigured) {
      const updated = damages.map(d => d.id === resolvingId ? { ...d, status: 'resolved' as const } : d);
      setDamages(updated);
      localStorage.setItem('mock_damages', JSON.stringify(updated));
      setResolvingId(null);
      return;
    }

    const { error } = await supabase
      .from('damages')
      .update({ status: 'resolved' })
      .eq('id', resolvingId);

    if (!error) {
      setResolvingId(null);
      fetchDamages();
      addToast('Avaria marcada como resolvida/consertada!', 'success');
    } else {
      addToast(error.message || 'Erro ao resolver avaria.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-300 flex items-center gap-2 hover:bg-slate-800">
            <Filter size={16} />
            Filtros
          </button>
        </div>
        {profile?.role === 'driver' && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-red-900/50 transition-all"
          >
            <Plus size={20} />
            Reportar Avaria
          </button>
        )}
      </div>

      {/* Damage List */}
      <div className="grid grid-cols-1 gap-4">
        {damages.length > 0 ? (
          damages.map((damage: any) => (
            <motion.div
              layout
              key={damage.id}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-elegant flex flex-col md:flex-row gap-6"
            >
              <div className="w-full md:w-32 h-32 bg-slate-800/50 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/50">
                {damage.photo_url ? (
                  <img src={damage.photo_url} alt="Damage" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={32} className="text-slate-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${damage.priority === 'high' ? 'bg-red-100 text-red-600' :
                      damage.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                      {damage.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${damage.status === 'resolved' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {damage.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(damage.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-white mb-1">
                  {damage.vehicles?.brand} {damage.vehicles?.model}
                </h4>
                <p className="text-sm text-slate-400 font-medium mb-3 uppercase tracking-widest">
                  {damage.vehicles?.plate}
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">{damage.description}</p>
              </div>

              {profile?.role === 'supervisor' && damage.status === 'pending' && (
                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => setResolvingId(damage.id)}
                    className="w-full md:w-auto px-4 py-2 bg-primary-50 text-primary-600 font-bold rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Resolver
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 border-dashed text-center">
            <AlertTriangle size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma avaria registrada</p>
          </div>
        )}
      </div>

      {/* Resolve Confirmation Modal */}
      <AnimatePresence>
        {resolvingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              onClick={() => setResolvingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Resolver Avaria?</h3>
                <p className="text-slate-400 text-sm mb-6">Confirme que o problema foi devidamente corrigido e o veículo está pronto para uso.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResolvingId(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResolve}
                    className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Damage Modal */}
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
                  <h3 className="text-xl font-bold text-white">Reportar Avaria</h3>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-200">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Veículo</label>
                    <select
                      required
                      value={newDamage.vehicle_id}
                      onChange={(e) => setNewDamage({ ...newDamage, vehicle_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    >
                      <option value="">Selecione um veículo</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                    <textarea
                      required
                      value={newDamage.description}
                      onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      placeholder="Descreva o problema detalhadamente..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewDamage({ ...newDamage, priority: p as any })}
                          className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${newDamage.priority === p
                            ? p === 'high' ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                              p === 'medium' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' :
                                'border-blue-500/50 bg-blue-500/10 text-blue-400'
                            : 'border-slate-700 bg-slate-800 text-slate-400'
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Enviando...' : (
                        <>
                          <AlertTriangle size={20} />
                          Enviar Relatório
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
