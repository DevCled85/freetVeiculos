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
  Car,
  Pencil,
  Trash2
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
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editingDamage, setEditingDamage] = useState<Damage | null>(null);
  const [editingPhotoFile, setEditingPhotoFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [supervisorViewDamage, setSupervisorViewDamage] = useState<any | null>(null);

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

      // Listen for global custom event to open damage details from the Popup
      const handleOpenDetails = (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string }>;
        const damageId = customEvent.detail.id;
        // Need to ensure damages list is fresh or find it from current state
        setDamages(currentDamages => {
          const target = currentDamages.find(d => d.id === damageId);
          if (target) {
            setSupervisorViewDamage(target);
          }
          return currentDamages;
        });
      };

      window.addEventListener('openDamageDetails', handleOpenDetails);

      return () => {
        window.removeEventListener('openDamageDetails', handleOpenDetails);
        supabase.removeChannel(channel);
      };
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
      setNewDamage({ vehicle_id: '', description: '', priority: 'medium' });
      setPhotoFile(null);
      setLoading(false);
      return;
    }

    try {
      let finalPhotoUrl = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('damages')
          .upload(filePath, photoFile);

        if (uploadError) throw new Error('Falha ao upar imagem: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('damages')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('damages')
        .insert([{
          vehicle_id: newDamage.vehicle_id,
          description: newDamage.description,
          priority: 'medium', // forced default initially
          photo_url: finalPhotoUrl,
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
      setNewDamage({ vehicle_id: '', description: '', priority: 'medium' });
      setPhotoFile(null);
      addToast('Avaria reportada com sucesso!', 'info');
    } catch (error: any) {
      console.error('Error reporting damage:', error);
      addToast(error.message || 'Erro ao reportar avaria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingDamage) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      const updated = damages.map(d => d.id === editingDamage.id ? {
        ...d,
        description: editingDamage.description,
        vehicle_id: editingDamage.vehicle_id,
        vehicles: vehicles.find(v => v.id === editingDamage.vehicle_id)
      } : d);
      setDamages(updated as any);
      localStorage.setItem('mock_damages', JSON.stringify(updated));
      setEditingDamage(null);
      setEditingPhotoFile(null);
      setLoading(false);
      addToast('Avaria atualizada com sucesso!', 'success');
      return;
    }

    try {
      let finalPhotoUrl = editingDamage.photo_url;

      if (editingPhotoFile) {
        const fileExt = editingPhotoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('damages')
          .upload(filePath, editingPhotoFile);

        if (uploadError) throw new Error('Falha ao upar nova imagem: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('damages')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('damages')
        .update({
          vehicle_id: editingDamage.vehicle_id,
          description: editingDamage.description,
          priority: (editingDamage as any).priority,
          photo_url: finalPhotoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDamage.id);

      if (error) throw error;

      setEditingDamage(null);
      setEditingPhotoFile(null);
      fetchDamages();
      addToast('Avaria atualizada com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error updating damage:', error);
      addToast(error.message || 'Erro ao atualizar avaria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDamage = async () => {
    if (!editingDamage) return;
    setDeletingId(editingDamage.id);
  };

  const confirmDeleteDamage = async () => {
    if (!deletingId) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      const updated = damages.filter(d => d.id !== deletingId);
      setDamages(updated);
      localStorage.setItem('mock_damages', JSON.stringify(updated));
      setEditingDamage(null);
      setEditingPhotoFile(null);
      setDeletingId(null);
      setLoading(false);
      addToast('Avaria excluída!', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('damages')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;

      setEditingDamage(null);
      setEditingPhotoFile(null);
      setDeletingId(null);
      fetchDamages();
      addToast('Avaria excluída com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error deleting damage:', error);
      addToast(error.message || 'Erro ao excluir avaria.', 'error');
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
      // Setup Notification
      const targetDamage = damages.find(d => d.id === resolvingId);
      if (targetDamage && targetDamage.reported_by) {
        const dmgDay = new Date(targetDamage.created_at).toLocaleDateString('pt-BR');
        await supabase.from('notifications').insert([{
          user_id: targetDamage.reported_by,
          title: 'Avaria Consertada',
          message: `O supervisor marcou como resolvido/consertado o defeito reportado por você no veículo no dia ${dmgDay}.`,
          type: 'damage'
        }]);
      }

      setResolvingId(null);
      fetchDamages();
      addToast('Avaria marcada como resolvida/consertada!', 'success');
    } else {
      addToast(error.message || 'Erro ao resolver avaria.', 'error');
    }
  };

  const updatePriority = async (damageId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('damages')
        .update({ priority: newPriority })
        .eq('id', damageId);

      if (error) throw error;
      addToast(`Prioridade atualizada para ${newPriority}`, 'success');
      fetchDamages();
    } catch (err: any) {
      addToast(err.message, 'error');
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
        {damages.filter((d: any) => d.status === 'pending').length > 0 ? (
          damages.filter((d: any) => d.status === 'pending').map((damage: any) => (
            <motion.div
              layout
              key={damage.id}
              onClick={() => {
                if (profile?.role === 'supervisor') {
                  setSupervisorViewDamage(damage);
                } else if (profile?.id === damage.reported_by || !isSupabaseConfigured) {
                  setEditingDamage(damage);
                }
              }}
              className={`bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-elegant flex flex-col md:flex-row gap-6 transition-all cursor-pointer hover:border-primary-500/50 hover:bg-slate-800/80`}
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
                      {damage.priority === 'high' ? 'ALTA' : damage.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${damage.status === 'resolved' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {damage.status === 'resolved' ? 'RESOLVIDO' : 'PENDENTE'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(damage.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-white mb-1 capitalize">
                  <span className="text-slate-500 font-normal text-sm mr-2 normal-case">Marca/Modelo:</span>
                  {damage.vehicles?.model} <span className="text-sm font-normal text-slate-400">/ {damage.vehicles?.brand}</span>
                </h4>
                <p className="text-sm text-slate-400 font-medium mb-4 uppercase tracking-widest">
                  <span className="text-slate-500 font-normal normal-case mr-2">Placa:</span>
                  {damage.vehicles?.plate}
                </p>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-300 text-sm leading-relaxed">{damage.description}</p>
                </div>
              </div>

            </motion.div>
          ))
        ) : (
          <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 border-dashed text-center">
            <AlertTriangle size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma avaria registrada</p>
          </div>
        )
        }
      </div >

      {/* Resolve Confirmation Modal */}
      <AnimatePresence>
        {
          resolvingId && (
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
          )
        }
      </AnimatePresence >

      {/* Add Damage Modal */}
      <AnimatePresence>
        {
          isAdding && (
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
                          <option key={v.id} value={v.id}>
                            {`${v.model.charAt(0).toUpperCase() + v.model.slice(1).toLowerCase()} / ${v.brand.charAt(0).toUpperCase() + v.brand.slice(1).toLowerCase()} (${v.plate})`}
                          </option>
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
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto da Avaria</label>
                      <div className="border-2 border-dashed border-slate-700 hover:border-primary-500/50 rounded-xl p-4 text-center transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          id="damage-photo"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setPhotoFile(e.target.files[0]);
                            }
                          }}
                        />
                        <label htmlFor="damage-photo" className="cursor-pointer flex flex-col items-center gap-2">
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
                              <span className="text-sm text-slate-400 font-medium">Clique para anexar imagem</span>
                            </>
                          )}
                        </label>
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
          )
        }
      </AnimatePresence >

      {/* Edit Damage Modal */}
      <AnimatePresence>
        {
          editingDamage && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                onClick={() => {
                  setEditingDamage(null);
                  setEditingPhotoFile(null);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Editar Avaria</h3>
                    <button
                      onClick={() => {
                        setEditingDamage(null);
                        setEditingPhotoFile(null);
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateDamage} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Veículo</label>
                      <select
                        required
                        value={editingDamage.vehicle_id}
                        onChange={(e) => setEditingDamage({ ...editingDamage, vehicle_id: e.target.value } as any)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      >
                        <option value="">Selecione um veículo</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {`${v.model.charAt(0).toUpperCase() + v.model.slice(1).toLowerCase()} / ${v.brand.charAt(0).toUpperCase() + v.brand.slice(1).toLowerCase()} (${v.plate})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                      <textarea
                        required
                        value={editingDamage.description}
                        onChange={(e) => setEditingDamage({ ...editingDamage, description: e.target.value } as any)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        placeholder="Descreva o problema detalhadamente..."
                        rows={3}
                      />
                    </div>

                    {profile?.role === 'supervisor' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
                        <select
                          value={(editingDamage as any).priority || 'low'}
                          onChange={(e) => setEditingDamage({ ...editingDamage, priority: e.target.value } as any)}
                          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto da Avaria</label>
                      {editingDamage.photo_url && !editingPhotoFile && (
                        <div className="mb-2 w-full h-32 bg-slate-800 rounded-xl overflow-hidden relative group">
                          <img src={editingDamage.photo_url} alt="Current Damage" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="border-2 border-dashed border-slate-700 hover:border-primary-500/50 rounded-xl p-4 text-center transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          id="edit-damage-photo"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setEditingPhotoFile(e.target.files[0]);
                            }
                          }}
                        />
                        <label htmlFor="edit-damage-photo" className="cursor-pointer flex flex-col items-center gap-2">
                          {editingPhotoFile ? (
                            <>
                              <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={24} />
                              </div>
                              <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">{editingPhotoFile.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center">
                                <Upload size={24} />
                              </div>
                              <span className="text-sm text-slate-400 font-medium">Clique para escolher nova imagem (opcional)</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col md:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteDamage}
                        disabled={loading}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-red-500 hover:text-red-400 font-bold py-3.5 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                      >
                        Excluir
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )
        }
      </AnimatePresence >

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {
          deletingId && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
                onClick={() => setDeletingId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[90] overflow-hidden"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Excluir Avaria?</h3>
                  <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita. A avaria será permanentemente removida do sistema.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeletingId(null)}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDeleteDamage}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )
        }
      </AnimatePresence >

      {/* Supervisor Detail Modal */}
      <AnimatePresence>
        {supervisorViewDamage && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setSupervisorViewDamage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white">Detalhes da Avaria</h3>
                  <button onClick={() => setSupervisorViewDamage(null)} className="text-slate-400 hover:text-slate-200"><X size={22} /></button>
                </div>

                {/* Photo */}
                <div className="w-full h-40 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex items-center justify-center mb-5">
                  {supervisorViewDamage.photo_url
                    ? <img src={supervisorViewDamage.photo_url} alt="Damage" className="w-full h-full object-cover" />
                    : <Camera size={40} className="text-slate-500" />}
                </div>

                {/* Info */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${supervisorViewDamage.priority === 'high' ? 'bg-red-100 text-red-600' :
                      supervisorViewDamage.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                      {supervisorViewDamage.priority === 'high' ? 'ALTA' : supervisorViewDamage.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${supervisorViewDamage.status === 'resolved' ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                      {supervisorViewDamage.status === 'resolved' ? 'RESOLVIDO' : 'PENDENTE'}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{new Date(supervisorViewDamage.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                  </div>
                  <p className="text-base font-bold text-white capitalize">
                    {supervisorViewDamage.vehicles?.model} <span className="text-sm font-normal text-slate-400">/ {supervisorViewDamage.vehicles?.brand}</span>{' '}
                    <span className="font-mono text-slate-400 text-sm normal-case">({supervisorViewDamage.vehicles?.plate})</span>
                  </p>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <p className="text-sm text-slate-300 leading-relaxed">{supervisorViewDamage.description}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className={`grid gap-3 ${supervisorViewDamage.status === 'pending' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <button
                    onClick={() => {
                      setSupervisorViewDamage(null);
                      setDeletingId(supervisorViewDamage.id);
                    }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span className="text-xs font-bold">Excluir</span>
                  </button>
                  <button
                    onClick={() => {
                      setSupervisorViewDamage(null);
                      setEditingDamage(supervisorViewDamage);
                    }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Pencil size={18} />
                    <span className="text-xs font-bold">Editar</span>
                  </button>
                  {supervisorViewDamage.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSupervisorViewDamage(null);
                        setResolvingId(supervisorViewDamage.id);
                      }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-colors"
                    >
                      <CheckCircle2 size={18} />
                      <span className="text-xs font-bold">Resolver</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence >
    </div >
  );
};
