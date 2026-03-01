import React, { useState, useEffect } from 'react';
import { supabase, Vehicle, ChecklistItem, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Car,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, ToastContainer } from './Toast';

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', current_driver: 'João Silva', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
  { id: '4', brand: 'Fiat', model: 'Strada', year: 2023, plate: 'FRT-9090', mileage: 5000, status: 'inactive', created_at: '' },
];

const CHECKLIST_ITEMS = [
  'Nível de óleo do motor',
  'Nível de água do radiador',
  'Calibragem dos pneus',
  'Estado dos pneus (sulcos)',
  'Luzes (faróis, setas, freio)',
  'Limpadores de para-brisa',
  'Freio de mão',
  'Cintos de segurança',
  'Extintor de incêndio',
  'Estepe e ferramentas',
  'Limpeza interna/externa',
  'Documentação do veículo'
];

export const ChecklistForm: React.FC<{ initialVehicleId?: string }> = ({ initialVehicleId }) => {
  const { profile } = useAuth();
  const { toasts, addToast, dismissToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(initialVehicleId || '');
  const [step, setStep] = useState(initialVehicleId ? 2 : 1);
  const [items, setItems] = useState<Record<string, { ok: boolean, notes: string }>>({});
  const [todayChecklists, setTodayChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!isSupabaseConfigured) {
        setVehicles(MOCK_VEHICLES);
        return;
      }
      const { data } = await supabase.from('vehicles').select('*');
      if (data) setVehicles(data);

      const today = new Date().toISOString().split('T')[0];
      const { data: ctData } = await supabase
        .from('checklists')
        .select('vehicle_id, driver_id')
        .gte('created_at', `${today}T00:00:00.000Z`);
      if (ctData) setTodayChecklists(ctData);
    };
    fetchVehicles();

    // Initialize items
    const initialItems: Record<string, { ok: boolean, notes: string }> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialItems[item] = { ok: true, notes: '' };
    });
    setItems(initialItems);

    if (isSupabaseConfigured) {
      const channel = supabase.channel('checklist-form-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, () => {
          fetchVehicles();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchVehicles();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedVehicle || !profile) return;
    setLoading(true);

    try {
      // 0. Server-Side Race Condition Defense: Check if someone else already submitted a checklist today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingChecklist, error: checkError } = await supabase
        .from('checklists')
        .select('id')
        .eq('vehicle_id', selectedVehicle)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingChecklist) {
        throw new Error('Este veículo acabou de ser assumido por outro motorista. Atualize a página e selecione outro veículo.');
      }

      // 1. Check if all items are OK upfront
      const isAllOk = Object.values(items).every((data: any) => data.ok);

      // 2. Create Checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('checklists')
        .insert([{
          vehicle_id: selectedVehicle,
          driver_id: profile.id,
          status: isAllOk ? 'resolved' : 'pending'
        }])
        .select()
        .single();

      if (checklistError) throw checklistError;

      // 3. Create Checklist Items
      const itemsToInsert = Object.entries(items).map(([name, data]) => ({
        checklist_id: checklist.id,
        item_name: name,
        is_ok: (data as any).ok,
        notes: (data as any).notes
      }));

      const { error: itemsError } = await supabase
        .from('checklist_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 4. Update Vehicle to "In Use"
      const { error: vehicleUpdateError } = await supabase
        .from('vehicles')
        .update({ current_driver: profile.full_name })
        .eq('id', selectedVehicle);

      if (vehicleUpdateError) throw vehicleUpdateError;

      // 5. Create Notification for Supervisors
      const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
      await supabase.from('notifications').insert([{
        title: 'Novo Checklist Recebido',
        message: `O motorista ${profile.full_name} enviou um checklist e assumiu o veículo ${selectedVehicleData?.plate || 'Desconhecido'}.`,
        type: 'checklist'
      }]);

      setSuccess(true);
      addToast('Checklist enviado com sucesso! Bom trabalho.', 'success');
    } catch (error: any) {
      console.error('Error submitting checklist:', error);
      addToast(error.message || 'Erro ao salvar checklist.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 p-12 rounded-3xl border border-slate-800 shadow-2xl text-center max-w-md mx-auto"
      >
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <div className="w-20 h-20 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Enviado com Sucesso!</h3>
        <p className="text-slate-400 mb-8">Seu checklist foi registrado e o supervisor foi notificado.</p>
        <button
          onClick={() => {
            setSuccess(false);
            setStep(1);
            setSelectedVehicle('');
          }}
          className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors"
        >
          Novo Checklist
        </button>
      </motion.div>
    );
  }

  const availableVehicles = vehicles.filter(v => {
    if (v.status !== 'active') return false;

    const todayChecklist = todayChecklists.find(c => c.vehicle_id === v.id);
    if (todayChecklist) {
      // Já teve checklist hoje: veículo indisponível para qualquer um
      return false;
    }

    // Ninguém pegou hoje: disponível se não tiver um current_driver bloqueando de dias anteriores (ou for o próprio)
    return !v.current_driver || v.current_driver === profile?.full_name;
  });

  return (
    <div className="max-w-2xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Progress Bar */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary-500' : 'bg-slate-800'
              }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-6">Selecione o Veículo</h3>
            <div className="grid grid-cols-1 gap-3">
              {availableVehicles.length > 0 ? (
                availableVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedVehicle === v.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${selectedVehicle === v.id ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        <Car size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white">{v.brand} {v.model}</p>
                        <p className="text-sm text-slate-400 uppercase tracking-widest">{v.plate}</p>
                      </div>
                    </div>
                    {selectedVehicle === v.id && <CheckCircle2 className="text-primary-400" size={24} />}
                  </button>
                ))
              ) : (
                <div className="text-center py-12 p-6 bg-slate-800/50 rounded-2xl border border-slate-800">
                  <div className="w-16 h-16 bg-slate-800 text-slate-500 border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-300 mb-1">Nenhum Veículo Disponível</h4>
                  <p className="text-sm text-slate-500">Todos os veículos ativos da frota já estão em uso no momento.</p>
                </div>
              )}
            </div>
            <button
              disabled={!selectedVehicle}
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-primary-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all"
            >
              Continuar
              <ChevronRight size={20} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl">
                  <Car size={20} />
                </div>
                <span className="font-bold text-white">
                  {vehicles.find(v => v.id === selectedVehicle)?.plate}
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-bold text-slate-400 hover:text-slate-300 transition-colors"
              >
                Alterar
              </button>
            </div>

            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-300">{item}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setItems({ ...items, [item]: { ...items[item], ok: true } })}
                        className={`p-2 rounded-xl transition-all ${items[item].ok ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-sm' : 'bg-slate-800 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'
                          }`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <button
                        onClick={() => setItems({ ...items, [item]: { ...items[item], ok: false } })}
                        className={`p-2 rounded-xl transition-all ${!items[item].ok ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-sm' : 'bg-slate-800 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'
                          }`}
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                  {!items[item].ok && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <textarea
                        placeholder="Descreva o problema..."
                        value={items[item].notes}
                        onChange={(e) => setItems({ ...items, [item]: { ...items[item], notes: e.target.value } })}
                        className="w-full mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all scrollbar-dark"
                        rows={2}
                      />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
              >
                <ChevronLeft size={20} />
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="flex-[2] bg-primary-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-900/50"
              >
                {loading ? 'Enviando...' : (
                  <>
                    <Save size={20} />
                    Finalizar Checklist
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
