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
    } catch (error) {
      console.error('Error reporting damage:', error);
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 flex items-center gap-2 hover:bg-zinc-50">
            <Filter size={16} />
            Filtros
          </button>
        </div>
        {profile?.role === 'driver' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-red-100 transition-all"
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
              className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-6"
            >
              <div className="w-full md:w-32 h-32 bg-zinc-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {damage.photo_url ? (
                  <img src={damage.photo_url} alt="Damage" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={32} className="text-zinc-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      damage.priority === 'high' ? 'bg-red-100 text-red-600' :
                      damage.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {damage.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      damage.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {damage.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(damage.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-zinc-900 mb-1">
                  {damage.vehicles?.brand} {damage.vehicles?.model}
                </h4>
                <p className="text-sm text-zinc-500 font-medium mb-3 uppercase tracking-widest">
                  {damage.vehicles?.plate}
                </p>
                <p className="text-zinc-600 text-sm leading-relaxed">{damage.description}</p>
              </div>

              {profile?.role === 'supervisor' && damage.status === 'pending' && (
                <div className="flex items-center shrink-0">
                  <button 
                    onClick={() => setResolvingId(damage.id)}
                    className="w-full md:w-auto px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Resolver
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-zinc-200 border-dashed text-center">
            <AlertTriangle size={48} className="text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Nenhuma avaria registrada</p>
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Resolver Avaria?</h3>
                <p className="text-zinc-500 text-sm mb-6">Confirme que o problema foi devidamente corrigido e o veículo está pronto para uso.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResolvingId(null)}
                    className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResolve}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-900">Reportar Avaria</h3>
                  <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Veículo</label>
                    <select
                      required
                      value={newDamage.vehicle_id}
                      onChange={(e) => setNewDamage({...newDamage, vehicle_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="">Selecione um veículo</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Descrição</label>
                    <textarea
                      required
                      value={newDamage.description}
                      onChange={(e) => setNewDamage({...newDamage, description: e.target.value})}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder="Descreva o problema detalhadamente..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Prioridade</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewDamage({...newDamage, priority: p as any})}
                          className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                            newDamage.priority === p 
                              ? p === 'high' ? 'border-red-500 bg-red-50 text-red-600' :
                                p === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-600' :
                                'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-400'
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
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
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
