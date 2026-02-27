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

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
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

export const ChecklistForm: React.FC = () => {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<Record<string, { ok: boolean, notes: string }>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!isSupabaseConfigured) {
        setVehicles(MOCK_VEHICLES);
        return;
      }
      const { data } = await supabase.from('vehicles').select('*').eq('status', 'active');
      if (data) setVehicles(data);
    };
    fetchVehicles();

    // Initialize items
    const initialItems: Record<string, { ok: boolean, notes: string }> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialItems[item] = { ok: true, notes: '' };
    });
    setItems(initialItems);
  }, []);

  const handleSubmit = async () => {
    if (!selectedVehicle || !profile) return;
    setLoading(true);

    try {
      // 1. Create Checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('checklists')
        .insert([{
          vehicle_id: selectedVehicle,
          driver_id: profile.id,
          status: 'pending'
        }])
        .select()
        .single();

      if (checklistError) throw checklistError;

      // 2. Create Checklist Items
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

      // 3. Create Notification for Supervisors
      await supabase.from('notifications').insert([{
        title: 'Novo Checklist Recebido',
        message: `O motorista ${profile.full_name} enviou um checklist para o veículo ${vehicles.find(v => v.id === selectedVehicle)?.plate}.`,
        type: 'checklist'
      }]);

      setSuccess(true);
    } catch (error) {
      console.error('Error submitting checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-3xl border border-zinc-200 shadow-xl text-center max-w-md mx-auto"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 mb-2">Enviado com Sucesso!</h3>
        <p className="text-zinc-500 mb-8">Seu checklist foi registrado e o supervisor foi notificado.</p>
        <button 
          onClick={() => {
            setSuccess(false);
            setStep(1);
            setSelectedVehicle('');
          }}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Novo Checklist
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((i) => (
          <div 
            key={i} 
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
              step >= i ? 'bg-emerald-600' : 'bg-zinc-200'
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
            className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
          >
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Selecione o Veículo</h3>
            <div className="grid grid-cols-1 gap-3">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    selectedVehicle === v.id 
                      ? 'border-emerald-600 bg-emerald-50' 
                      : 'border-zinc-100 hover:border-zinc-200 bg-zinc-50/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${selectedVehicle === v.id ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-400'}`}>
                      <Car size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">{v.brand} {v.model}</p>
                      <p className="text-sm text-zinc-500 uppercase tracking-widest">{v.plate}</p>
                    </div>
                  </div>
                  {selectedVehicle === v.id && <CheckCircle2 className="text-emerald-600" size={24} />}
                </button>
              ))}
            </div>
            <button
              disabled={!selectedVehicle}
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
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
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Car size={20} />
                </div>
                <span className="font-bold text-zinc-900">
                  {vehicles.find(v => v.id === selectedVehicle)?.plate}
                </span>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-600"
              >
                Alterar
              </button>
            </div>

            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-zinc-700">{item}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setItems({ ...items, [item]: { ...items[item], ok: true } })}
                        className={`p-2 rounded-lg transition-all ${
                          items[item].ok ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <button
                        onClick={() => setItems({ ...items, [item]: { ...items[item], ok: false } })}
                        className={`p-2 rounded-lg transition-all ${
                          !items[item].ok ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-400'
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
                        className="w-full mt-2 p-3 bg-red-50/50 border border-red-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
              >
                <ChevronLeft size={20} />
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
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
