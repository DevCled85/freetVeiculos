import React, { useEffect, useState } from 'react';
import { supabase, Vehicle, isSupabaseConfigured } from '../lib/supabase';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload,
  Car,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, ToastContainer } from './Toast';

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
];

export const VehicleList: React.FC = () => {
  const { toasts, addToast, dismissToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newVehicle, setNewVehicle] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    mileage: 0,
    status: 'active' as const
  });
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();

    if (isSupabaseConfigured) {
      const channel = supabase.channel('vehicles-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchVehicles();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      // Load from localStorage or use defaults
      const saved = localStorage.getItem('mock_vehicles');
      setVehicles(saved ? JSON.parse(saved) : MOCK_VEHICLES);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setVehicles(data);
    setLoading(false);
  };

  const uploadVehiclePhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `photos/${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('vehicles').upload(path, file);
    if (error) { addToast('Erro ao upar imagem: ' + error.message, 'error'); return null; }
    return supabase.storage.from('vehicles').getPublicUrl(path).data.publicUrl;
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      const vehicle: Vehicle = {
        ...newVehicle,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      const updated = [vehicle, ...vehicles];
      setVehicles(updated);
      localStorage.setItem('mock_vehicles', JSON.stringify(updated));
      setIsAdding(false);
      setNewVehicle({ brand: '', model: '', year: new Date().getFullYear(), plate: '', mileage: 0, status: 'active' });
      setNewPhotoFile(null);
      return;
    }

    setFormLoading(true);
    let photo_url: string | null = null;
    if (newPhotoFile) photo_url = await uploadVehiclePhoto(newPhotoFile);

    const { error } = await supabase.from('vehicles').insert([{ ...newVehicle, photo_url }]);
    setFormLoading(false);

    if (!error) {
      setIsAdding(false);
      fetchVehicles();
      setNewVehicle({ brand: '', model: '', year: new Date().getFullYear(), plate: '', mileage: 0, status: 'active' });
      setNewPhotoFile(null);
      addToast('Veículo cadastrado com sucesso!', 'success');
    } else {
      addToast(error.message || 'Erro ao cadastrar veículo.', 'error');
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    if (!isSupabaseConfigured) {
      const updated = vehicles.map(v => v.id === editingVehicle.id ? editingVehicle : v);
      setVehicles(updated);
      localStorage.setItem('mock_vehicles', JSON.stringify(updated));
      setEditingVehicle(null);
      setEditPhotoFile(null);
      return;
    }

    setFormLoading(true);
    let photo_url = (editingVehicle as any).photo_url ?? null;
    if (editPhotoFile) photo_url = await uploadVehiclePhoto(editPhotoFile);

    const { error } = await supabase
      .from('vehicles')
      .update({
        brand: editingVehicle.brand,
        model: editingVehicle.model,
        year: editingVehicle.year,
        plate: editingVehicle.plate,
        mileage: editingVehicle.mileage,
        status: editingVehicle.status,
        photo_url
      })
      .eq('id', editingVehicle.id);
    setFormLoading(false);

    if (!error) {
      setEditingVehicle(null);
      setEditPhotoFile(null);
      fetchVehicles();
      addToast('Veículo atualizado com sucesso!', 'success');
    } else {
      addToast(error.message || 'Erro ao atualizar veículo.', 'error');
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingId) return;

    if (!isSupabaseConfigured) {
      const updated = vehicles.filter(v => v.id !== deletingId);
      setVehicles(updated);
      localStorage.setItem('mock_vehicles', JSON.stringify(updated));
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', deletingId);

    if (!error) {
      setDeletingId(null);
      fetchVehicles();
      addToast('Veículo excluído com sucesso.', 'info');
    } else {
      addToast(error.message || 'Erro ao excluir veículo.', 'error');
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por marca, modelo ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-elegant"
        >
          <Plus size={20} />
          Novo Veículo
        </button>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-900 rounded-2xl border border-slate-800 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={v.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-elegant overflow-hidden group hover:border-primary-500/50 transition-all"
            >
              <div className="relative h-36 bg-slate-800 overflow-hidden">
                {(v as any).photo_url ? (
                  <img src={(v as any).photo_url} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car size={40} className="text-slate-600" />
                  </div>
                )}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm ${v.status === 'active' ? 'bg-primary-500/80 text-white' :
                    v.status === 'maintenance' ? 'bg-amber-500/80 text-white' :
                      'bg-red-500/80 text-white'
                  }`}>
                  {v.status === 'active' ? <CheckCircle2 size={12} /> :
                    v.status === 'maintenance' ? <AlertCircle size={12} /> : <XCircle size={12} />}
                  {v.status === 'active' ? 'Ativo' : v.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white">{v.brand} {v.model}</h3>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">{v.plate}</p>

                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano</p>
                    <p className="text-sm font-bold text-slate-200">{v.year}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">KM Atual</p>
                    <p className="text-sm font-bold text-slate-200">{v.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setEditingVehicle(v)}
                  className="text-slate-500 hover:text-primary-400 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => setDeletingId(v.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Vehicle Modal */}
      <AnimatePresence>
        {(isAdding || editingVehicle) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              onClick={() => { setIsAdding(false); setEditingVehicle(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h3>
                <form onSubmit={editingVehicle ? handleEditVehicle : handleAddVehicle} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Marca</label>
                      <input
                        type="text"
                        required
                        value={editingVehicle ? editingVehicle.brand : newVehicle.brand}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, brand: e.target.value })
                          : setNewVehicle({ ...newVehicle, brand: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        placeholder="Ex: Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Modelo</label>
                      <input
                        type="text"
                        required
                        value={editingVehicle ? editingVehicle.model : newVehicle.model}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, model: e.target.value })
                          : setNewVehicle({ ...newVehicle, model: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        placeholder="Ex: Hilux"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ano</label>
                      <input
                        type="number"
                        required
                        value={editingVehicle ? editingVehicle.year : newVehicle.year}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, year: parseInt(e.target.value) })
                          : setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Placa</label>
                      <input
                        type="text"
                        required
                        value={editingVehicle ? editingVehicle.plate : newVehicle.plate}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, plate: e.target.value.toUpperCase() })
                          : setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        placeholder="ABC-1234"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quilometragem</label>
                    <input
                      type="number"
                      required
                      value={editingVehicle ? editingVehicle.mileage : newVehicle.mileage}
                      onChange={(e) => editingVehicle
                        ? setEditingVehicle({ ...editingVehicle, mileage: parseInt(e.target.value) })
                        : setNewVehicle({ ...newVehicle, mileage: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    />
                  </div>
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto do Veículo</label>
                    {editingVehicle && (editingVehicle as any).photo_url && !editPhotoFile && (
                      <div className="mb-2 w-full h-28 rounded-xl overflow-hidden relative">
                        <img src={(editingVehicle as any).photo_url} alt="Foto atual" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setEditingVehicle({ ...editingVehicle, photo_url: null } as any)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <label htmlFor="vehicle-photo" className="border-2 border-dashed border-slate-700 hover:border-primary-500/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors">
                      <input
                        type="file" id="vehicle-photo" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (editingVehicle) setEditPhotoFile(file);
                          else setNewPhotoFile(file);
                        }}
                      />
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                        <Upload size={18} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        {(editingVehicle ? editPhotoFile : newPhotoFile) ? (
                          <p className="text-sm text-primary-400 font-medium truncate">{(editingVehicle ? editPhotoFile : newPhotoFile)!.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-slate-400 font-medium">Clique para anexar foto</p>
                            <p className="text-xs text-slate-600">JPG, PNG, WEBP</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {editingVehicle && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                      <select
                        value={editingVehicle.status}
                        onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value as any })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      >
                        <option value="active">Ativo</option>
                        <option value="maintenance">Manutenção</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setEditingVehicle(null); setNewPhotoFile(null); setEditPhotoFile(null); }}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-60"
                    >
                      {formLoading ? 'Salvando...' : editingVehicle ? 'Atualizar' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              onClick={() => setDeletingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Excluir Veículo?</h3>
                <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita. O veículo será removido permanentemente da frota.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteVehicle}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
