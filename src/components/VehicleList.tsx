import React, { useEffect, useState } from 'react';
import { supabase, Vehicle, isSupabaseConfigured, OilChange } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
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
  X,
  Droplets,
  History,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, ToastContainer } from './Toast';

const PREDEFINED_COLORS = [
  'Branco',
  'Preto',
  'Prata',
  'Cinza',
  'Vermelho',
  'Azul',
  'Outro'
];

const CAR_BRANDS: Record<string, string[]> = {
  'Audi': ['A3', 'A4', 'A5', 'Q3', 'Q5', 'Q7', 'e-tron'],
  'BMW': ['Série 3', 'X1', 'X3', 'X5', 'iX', 'Série 1'],
  'BYD': ['Dolphin', 'Dolphin Mini', 'Song Plus', 'Seal', 'Yuan Plus'],
  'Caoa Chery': ['Tiggo 5x', 'Tiggo 7', 'Tiggo 8', 'Arrizo 6', 'iCar'],
  'Chevrolet': ['Onix', 'Onix Plus', 'Tracker', 'Montana', 'S10', 'Equinox', 'Spin', 'Cruze', 'Silverado'],
  'Citroën': ['C3', 'C3 Aircross', 'C4 Cactus', 'Jumpy'],
  'Fiat': ['Mobi', 'Argo', 'Cronos', 'Pulse', 'Fastback', 'Strada', 'Toro', 'Fiorino', 'Ducato'],
  'Ford': ['Ranger', 'Maverick', 'Bronco Sport', 'Mustang', 'Transit', 'Territory'],
  'GWM': ['Haval H6', 'Ora 03'],
  'Honda': ['City', 'City Hatchback', 'HR-V', 'ZR-V', 'CR-V', 'Civic'],
  'Hyundai': ['HB20', 'HB20S', 'Creta', 'Tucson'],
  'Jeep': ['Renegade', 'Compass', 'Commander', 'Gladiator', 'Wrangler'],
  'Kia': ['Sportage', 'Niro', 'Stonic', 'Carnival'],
  'Mitsubishi': ['L200 Triton', 'Eclipse Cross', 'Pajero Sport'],
  'Nissan': ['Kicks', 'Versa', 'Sentra', 'Frontier'],
  'Peugeot': ['208', '2008', 'Partner Rapid', 'Expert'],
  'Renault': ['Kwid', 'Stepway', 'Logan', 'Duster', 'Oroch', 'Master', 'Megane E-Tech'],
  'Toyota': ['Yaris', 'Yaris Hatch', 'Corolla', 'Corolla Cross', 'Hilux', 'SW4', 'RAV4'],
  'Volkswagen': ['Polo', 'Virtus', 'Nivus', 'T-Cross', 'Taos', 'Saveiro', 'Amarok', 'Jetta GLI', 'Gol', 'Voyage'],
  'Volvo': ['EX30', 'XC40', 'C40', 'XC60', 'XC90'],
  'Outra': ['Outro']
};

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, color: 'Branco', status: 'active', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, color: 'Prata', status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, color: 'Preto', status: 'active', created_at: '' },
];

// --- Confirmation Modal Component ---
const ConfirmationModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}> = ({ show, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'info', loading = false }) => (
  <AnimatePresence>
    {show && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[120] overflow-hidden"
        >
          <div className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
              type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                'bg-primary-500/10 border-primary-500/20 text-primary-400'
              }`}>
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-primary-600 hover:bg-primary-700'
                  }`}
              >
                {loading ? 'Processando...' : confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const VehicleList: React.FC = () => {
  const { profile } = useAuth();
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
    color: 'Branco',
    status: 'active' as const
  });
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [showOilModal, setShowOilModal] = useState<Vehicle | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<Vehicle | null>(null);
  const [vehiclesWithHistory, setVehiclesWithHistory] = useState<Set<string>>(new Set());
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();

    if (isSupabaseConfigured) {
      const channel = supabase.channel('vehicles-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchVehicles();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_oil_changes' }, () => {
          fetchHistoryExistence();
        })
        .subscribe();

      fetchHistoryExistence();

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

  const fetchHistoryExistence = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('vehicle_oil_changes')
      .select('vehicle_id');

    if (data) {
      const ids = new Set(data.map(item => item.vehicle_id));
      setVehiclesWithHistory(ids);
    }
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
      setNewVehicle({ brand: '', model: '', year: new Date().getFullYear(), plate: '', mileage: 0, color: 'Branco', status: 'active' });
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
      setNewVehicle({ brand: '', model: '', year: new Date().getFullYear(), plate: '', mileage: 0, color: 'Branco', status: 'active' });
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
        color: editingVehicle.color,
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
                <h3 className="text-lg font-bold text-white capitalize">{v.model}<span className="text-sm font-normal text-slate-400">/{v.brand}</span></h3>
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

                {vehiclesWithHistory.has(v.id) ? (
                  <button
                    onClick={() => setShowHistoryModal(v)}
                    className="mt-4 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest transition-all shadow-sm group/btn"
                  >
                    <History size={14} className="group-hover/btn:rotate-[-10deg] transition-transform" />
                    Histórico de Troca de Óleo
                  </button>
                ) : (
                  <div className="mt-4 w-full py-2 bg-slate-800/30 border border-slate-800/50 border-dashed rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest cursor-default">
                    Sem registro de troca de óleo
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setEditingVehicle(v)}
                  className="text-slate-500 hover:text-primary-400 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => setShowOilModal(v)}
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                  title="Troca de Óleo"
                >
                  <Droplets size={18} />
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
                      <select
                        required
                        value={editingVehicle ? editingVehicle.brand : newVehicle.brand}
                        onChange={(e) => {
                          const brand = e.target.value;
                          if (editingVehicle) {
                            setEditingVehicle({ ...editingVehicle, brand, model: '' });
                          } else {
                            setNewVehicle({ ...newVehicle, brand, model: '' });
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all custom-select"
                      >
                        <option value="" disabled hidden>Escolha a marca</option>
                        {Object.keys(CAR_BRANDS).map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Modelo</label>
                      <select
                        required
                        value={editingVehicle ? editingVehicle.model : newVehicle.model}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, model: e.target.value })
                          : setNewVehicle({ ...newVehicle, model: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all custom-select"
                        disabled={!(editingVehicle ? editingVehicle.brand : newVehicle.brand)}
                      >
                        <option value="" disabled hidden>Escolha o modelo</option>
                        {(CAR_BRANDS[editingVehicle ? editingVehicle.brand : newVehicle.brand] || []).map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cor</label>
                      <select
                        value={editingVehicle ? (editingVehicle.color || 'Branco') : newVehicle.color}
                        onChange={(e) => editingVehicle
                          ? setEditingVehicle({ ...editingVehicle, color: e.target.value })
                          : setNewVehicle({ ...newVehicle, color: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      >
                        {PREDEFINED_COLORS.map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
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
      {/* Oil Change Modal */}
      <AnimatePresence>
        {showOilModal && (
          <OilChangeModal
            vehicle={showOilModal}
            onClose={() => {
              setShowOilModal(null);
            }}
            addToast={addToast}
            onHistoryChange={fetchHistoryExistence}
          />
        )}
      </AnimatePresence>

      {/* Oil Change History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <OilChangeHistoryModal
            vehicle={showHistoryModal}
            onClose={() => setShowHistoryModal(null)}
            onHistoryChange={fetchHistoryExistence}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Oil Change Modal Component ---
const OilChangeModal: React.FC<{
  vehicle: Vehicle,
  onClose: () => void,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  editingRecord?: OilChange | null,
  onHistoryChange?: () => void
}> = ({ vehicle, onClose, addToast, editingRecord, onHistoryChange }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [data, setData] = useState({
    current_mileage: editingRecord ? editingRecord.current_mileage : '' as string | number,
    next_change_mileage: editingRecord ? editingRecord.next_change_mileage : '' as string | number,
    change_date: editingRecord ? editingRecord.change_date : new Date().toISOString().split('T')[0],
    next_change_date: editingRecord ? editingRecord.next_change_date : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mileageNum = parseInt(data.current_mileage.toString());
    const nextMileageNum = parseInt(data.next_change_mileage.toString());

    if (isNaN(mileageNum) || mileageNum < vehicle.mileage) {
      addToast(`A quilometragem não pode ser menor que a atual do veículo (${vehicle.mileage} km).`, 'error');
      return;
    }

    if (isNaN(nextMileageNum) || nextMileageNum <= mileageNum) {
      addToast('A quilometragem da próxima troca deve ser maior que a atual.', 'error');
      return;
    }

    if (editingRecord) {
      setShowConfirm(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    const mileageNum = parseInt(data.current_mileage.toString());
    const nextMileageNum = parseInt(data.next_change_mileage.toString());

    setLoading(true);

    if (editingRecord) {
      const { error } = await supabase
        .from('vehicle_oil_changes')
        .update({
          current_mileage: mileageNum,
          next_change_mileage: nextMileageNum,
          change_date: data.change_date,
          next_change_date: data.next_change_date
        })
        .eq('id', editingRecord.id);

      if (!error) {
        if (mileageNum > vehicle.mileage) {
          await supabase.from('vehicles').update({ mileage: mileageNum }).eq('id', vehicle.id);
        }

        // Notify
        await supabase.from('notifications').insert([{
          title: 'Troca de Óleo Atualizada',
          message: `O registro de troca de óleo do veículo ${vehicle.plate} foi atualizado por ${profile?.full_name}.`,
          type: 'system'
        }]);

        addToast('Troca de óleo atualizada!', 'success');
        if (onHistoryChange) onHistoryChange();
        onClose();
      } else {
        addToast('Erro ao atualizar: ' + error.message, 'error');
      }
    } else {
      const { error } = await supabase
        .from('vehicle_oil_changes')
        .insert([{
          vehicle_id: vehicle.id,
          driver_id: profile?.id,
          current_mileage: mileageNum,
          next_change_mileage: nextMileageNum,
          change_date: data.change_date,
          next_change_date: data.next_change_date
        }]);

      if (!error) {
        if (mileageNum > vehicle.mileage) {
          await supabase.from('vehicles').update({ mileage: mileageNum }).eq('id', vehicle.id);
        }

        // Notify
        await supabase.from('notifications').insert([{
          title: 'Nova Troca de Óleo',
          message: `Uma nova troca de óleo foi registrada para o veículo ${vehicle.plate} por ${profile?.full_name}.`,
          type: 'system'
        }]);

        addToast('Troca de óleo registrada com sucesso!', 'success');
        if (onHistoryChange) onHistoryChange();
        onClose();
      } else {
        addToast('Erro ao registrar troca de óleo: ' + error.message, 'error');
      }
    }
    setLoading(false);
    setShowConfirm(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[90] overflow-hidden"
      >
        {/* Background Photo Watermark */}
        {(vehicle as any).photo_url && (
          <div
            className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none grayscale"
            style={{
              backgroundImage: `url(${(vehicle as any).photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}

        <div className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Droplets size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">{editingRecord ? 'Editar Registro' : 'Troca de Óleo'}</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Veículo</p>
            <p className="text-sm font-bold text-white uppercase">{vehicle.model} / {vehicle.brand} ({vehicle.plate})</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">KM desta Troca</label>
                <input
                  type="number"
                  required
                  value={data.current_mileage}
                  onChange={e => setData(prev => ({ ...prev, current_mileage: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">KM da Próxima</label>
                <input
                  type="number"
                  required
                  value={data.next_change_mileage}
                  onChange={e => setData(prev => ({ ...prev, next_change_mileage: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data da Troca</label>
                <input
                  type="date"
                  required
                  value={data.change_date}
                  onChange={e => setData(prev => ({ ...prev, change_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data da Próxima</label>
                <input
                  type="date"
                  required
                  value={data.next_change_date}
                  onChange={e => setData(prev => ({ ...prev, next_change_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : editingRecord ? 'Atualizar' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <ConfirmationModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeSave}
        loading={loading}
        title="Salvar Alterações?"
        message="Deseja confirmar as alterações feitas neste registro de troca de óleo?"
        confirmText="Salvar"
        type="warning"
      />
    </>
  );
};

// --- Oil Change History Modal ---
const OilChangeHistoryModal: React.FC<{
  vehicle: Vehicle,
  onClose: () => void,
  onHistoryChange?: () => void
}> = ({ vehicle, onClose, onHistoryChange }) => {
  const { profile } = useAuth();
  const { toasts, addToast, dismissToast } = useToast();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<OilChange | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('vehicle_oil_changes')
      .select('*, profiles(full_name)')
      .eq('vehicle_id', vehicle.id)
      .order('change_date', { ascending: false });

    if (data) setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [vehicle.id]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('vehicle_oil_changes').delete().eq('id', deletingId);
    if (!error) {
      // Notify
      await supabase.from('notifications').insert([{
        title: 'Troca de Óleo Removida',
        message: `Um registro de troca de óleo do veículo ${vehicle.plate} foi excluído por ${profile?.full_name}.`,
        type: 'system'
      }]);

      addToast('Registro excluído com sucesso.', 'info');
      fetchHistory();
      if (onHistoryChange) onHistoryChange();
    } else {
      addToast('Erro ao excluir: ' + error.message, 'error');
    }
    setDeleteLoading(false);
    setDeletingId(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[90] overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 text-primary-500 rounded-lg">
                <History size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Histórico de Trocas</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex justify-between items-center relative overflow-hidden">
            {/* Background Photo Watermark */}
            {(vehicle as any).photo_url && (
              <div
                className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none grayscale"
                style={{
                  backgroundImage: `url(${(vehicle as any).photo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Veículo</p>
              <p className="text-sm font-bold text-white uppercase">{vehicle.model} ({vehicle.plate})</p>
            </div>
            <div className="text-right relative z-10">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Trocas</p>
              <p className="text-sm font-bold text-primary-400">{history.length}</p>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse"></div>)}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>
              </div>
            ) : (
              history.map((record) => (
                <div key={record.id} className="p-4 bg-slate-800/30 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors group/item relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-200 uppercase tracking-tighter">
                          Troca em: {new Date(record.change_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[8px] text-slate-500 font-medium">Responsável: {record.profiles?.full_name || 'Sistema'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="p-1.5 text-slate-500 hover:text-primary-400 opacity-0 group-hover/item:opacity-100 transition-all"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="text-[10px] font-mono text-slate-600">#{record.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">KM Registrado</p>
                      <p className="text-xs font-bold text-slate-200">{record.current_mileage.toLocaleString()} km</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Próxima Troca (KM)</p>
                      <p className="text-xs font-bold text-amber-400">{record.next_change_mileage.toLocaleString()} km</p>
                    </div>
                    <div className="col-span-2 bg-slate-900/50 p-2 rounded-lg flex justify-between items-center">
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Próxima Troca (Data)</p>
                      <p className="text-xs font-bold text-amber-400">{new Date(record.next_change_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <OilChangeModal
            vehicle={vehicle}
            editingRecord={editingRecord}
            onClose={() => {
              setEditingRecord(null);
              fetchHistory();
            }}
            addToast={addToast}
            onHistoryChange={onHistoryChange}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal
        show={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={executeDelete}
        loading={deleteLoading}
        title="Excluir Registro?"
        message="Tem certeza que deseja excluir permanentemente este registro de troca de óleo? Esta ação não pode ser desfeta."
        confirmText="Excluir"
        type="danger"
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
