import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase, Vehicle, Damage, isSupabaseConfigured } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Car, AlertTriangle, CheckCircle2, Clock, TrendingUp, ClipboardCheck,
  UserPlus, X, User, Lock, ShieldCheck, Pencil, Trash2, Users, Bell,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastContainer, useToast } from './Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile { id: string; full_name: string; username?: string; role: 'driver' | 'supervisor'; created_at: string; }
interface ChecklistRecord { id: string; vehicle_id: string; driver_id: string; date: string; status: string; created_at: string; vehicles?: { brand: string; model: string; plate: string }; profiles?: { full_name: string; username: string }; checklist_items?: { id: string; item_name: string; is_ok: boolean; notes: string }[]; }
interface DashboardProps { onNavigate?: (tab: string) => void; onVehicleSelect?: (vehicleId: string) => void; }

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_V: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', current_driver: 'João Silva', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'VW', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
  { id: '4', brand: 'Fiat', model: 'Strada', year: 2023, plate: 'FRT-9090', mileage: 5000, status: 'inactive', created_at: '' },
];

const inputCls = 'w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all';

const RoleBadge = ({ role }: { role: string }) =>
  role === 'supervisor' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20"><ShieldCheck size={11} /> Supervisor</span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700"><Car size={11} /> Motorista</span>
  );

// ─── Modal Wrapper ─────────────────────────────────────────────────────────────

const ModalWrapper: React.FC<{ show: boolean; onClose: () => void; children: React.ReactNode }> = ({ show, onClose, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { toasts, addToast, dismissToast } = useToast();

  const [stats, setStats] = useState({ totalVehicles: 0, activeVehicles: 0, pendingDamages: 0, recentChecklists: 0 });
  const [recentDamages, setRecentDamages] = useState<Damage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // User management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'driver' as 'driver' | 'supervisor' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ username: '', password: '', role: 'driver' as 'driver' | 'supervisor' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);
  const [deleteChecklistLoading, setDeleteChecklistLoading] = useState(false);

  // Checklists
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);

  // Supervisor Resolving
  const [resolvingChecklist, setResolvingChecklist] = useState<string | null>(null);
  const [resolveItems, setResolveItems] = useState<Record<string, { ok: boolean; notes: string }>>({});
  const [resolveLoading, setResolveLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStats({ totalVehicles: 4, activeVehicles: 2, pendingDamages: 2, recentChecklists: 5 });
      setVehicles(MOCK_V); return;
    }
    const [{ count: tv }, { count: av }, { count: pd }, { count: rc }, { data: dms }, { data: vs }] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('damages').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('checklists').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('damages').select('*, vehicles(brand, model)').order('created_at', { ascending: false }).limit(5),
      supabase.from('vehicles').select('*'),
    ]);
    setStats({ totalVehicles: tv || 0, activeVehicles: av || 0, pendingDamages: pd || 0, recentChecklists: rc || 0 });
    setRecentDamages(dms as any || []);
    setVehicles(vs || []);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers(data || []);
  }, []);

  const fetchChecklists = useCallback(async (driverId?: string) => {
    if (!isSupabaseConfigured) return;
    let q = supabase.from('checklists')
      .select('*, vehicles(brand, model, plate), profiles(full_name, username), checklist_items(*)')
      .order('created_at', { ascending: false });
    if (driverId) q = q.eq('driver_id', driverId);
    const { data } = await q.limit(20);
    setChecklists(data || []);
  }, []);

  useEffect(() => {
    fetchStats();

    if (profile?.role === 'supervisor') {
      fetchUsers();
      fetchChecklists();
    } else if (profile?.id) {
      fetchChecklists(profile.id);
    }

    if (profile) {
      // Realtime subscription for all data updates (Checklists & Vehicles)
      const channel = supabase.channel('dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, (payload) => {
          if (profile.role === 'supervisor') fetchChecklists();
          else fetchChecklists(profile.id);

          fetchStats();

          if (profile.role === 'supervisor' && payload.eventType === 'INSERT') {
            addToast('🔔 Novo checklist recebido de um motorista!', 'info', 5000);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, () => {
          if (profile.role === 'supervisor') fetchChecklists();
          else fetchChecklists(profile.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          if (profile.role === 'supervisor') fetchUsers();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.id, profile?.role, fetchStats, fetchUsers, fetchChecklists]);

  // ── Create User ───────────────────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true); setCreateError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { username: newUser.username, password: newUser.password, role: newUser.role }
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', role: 'driver' });
      addToast(`Usuário "${data.username}" cadastrado!`, 'success');
      fetchUsers();
    } catch (err: any) { setCreateError(err.message); }
    finally { setCreateLoading(false); }
  };

  // ── Edit User ─────────────────────────────────────────────────────────────────

  const openEdit = (u: UserProfile) => { setEditTarget(u); setEditData({ username: u.full_name, password: '', role: u.role }); setEditError(null); };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true); setEditError(null);
    try {
      const body: any = { userId: editTarget.id, role: editData.role };
      if (editData.username.trim()) body.username = editData.username.trim();
      if (editData.password) {
        if (editData.password.length < 6) throw new Error('Senha mínima 6 caracteres.');
        body.password = editData.password;
      }
      const { data, error: fnError } = await supabase.functions.invoke('update-user', { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setEditTarget(null);
      addToast(`Usuário "${editData.username || editTarget.full_name}" atualizado!`, 'success');
      fetchUsers();
    } catch (err: any) { setEditError(err.message); }
    finally { setEditLoading(false); }
  };

  // ── Delete User ───────────────────────────────────────────────────────────────

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('delete-user', { body: { userId: deleteTarget.id } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const name = deleteTarget.full_name;
      setDeleteTarget(null);
      addToast(`Usuário "${name}" removido.`, 'info');
      fetchUsers();
    } catch (err: any) { addToast(err.message || 'Erro ao deletar.', 'error'); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  const handleDeleteChecklist = async () => {
    if (!deleteChecklistId) return;
    setDeleteChecklistLoading(true);
    try {
      const { error: itemsError } = await supabase.from('checklist_items').delete().eq('checklist_id', deleteChecklistId);
      if (itemsError) throw itemsError;

      const { error: clError } = await supabase.from('checklists').delete().eq('id', deleteChecklistId);
      if (clError) throw clError;

      addToast('Checklist removido.', 'info');
      setDeleteChecklistId(null);
      fetchChecklists(profile?.role === 'supervisor' ? undefined : profile?.id);
    } catch (err: any) {
      console.error('Delete error:', err);
      addToast(err.message || 'Erro ao deletar checklist.', 'error');
      setDeleteChecklistId(null);
    } finally {
      setDeleteChecklistLoading(false);
    }
  };

  const resolveChecklist = async (clId: string, vehicleId: string) => {
    // Pegar dados do checklist
    const cl = checklists.find(c => c.id === clId);

    await supabase.from('checklists').update({ status: 'resolved' }).eq('id', clId);
    // Remove driver from vehicle since it's resolved/checked
    await supabase.from('vehicles').update({ current_driver: null }).eq('id', vehicleId);

    // Notificar motorista
    if (cl && cl.driver_id) {
      const createdStr = new Date(cl.created_at).toLocaleDateString('pt-BR');
      const resolvedStr = new Date().toLocaleDateString('pt-BR');
      await supabase.from('notifications').insert([{
        user_id: cl.driver_id,
        title: 'Checklist Resolvido!',
        message: `O supervisor marcou como concluído o checklist (do dia ${createdStr}). Data da resolução: ${resolvedStr}. Tudo seguro para rodar!`,
        type: 'checklist'
      }]);
    }

    addToast('Checklist marcado como resolvido e veículo liberado.', 'success');
    fetchChecklists();
    fetchStats();
  };

  const startResolveChecklist = (cl: ChecklistRecord) => {
    const map: Record<string, { ok: boolean; notes: string }> = {};
    (cl.checklist_items || []).forEach(item => {
      // Only bring items that had issues so the supervisor can fix them
      if (!item.is_ok) { map[item.id] = { ok: item.is_ok, notes: item.notes || '' }; }
    });
    setResolveItems(map);
    setResolvingChecklist(cl.id);
  };

  const saveChecklistResolution = async (clId: string) => {
    setResolveLoading(true);
    try {
      const updates = Object.entries(resolveItems).map(([id, val]) =>
        supabase.from('checklist_items').update({ is_ok: (val as any).ok, notes: (val as any).notes }).eq('id', id).select()
      );
      const results = await Promise.all(updates);

      const errors = results.filter(r => r.error);
      const empties = results.filter(r => !r.error && (!r.data || r.data.length === 0));
      if (errors.length > 0 || empties.length > 0) {
        throw new Error('Permissão negada ou erro no banco ao salvar itens. Verifique as políticas do Supabase.');
      }

      // Check if all items are now OK
      const cl = checklists.find(c => c.id === clId);
      if (cl) {
        // We merged the new changes into the existing items array theoretically
        const allOkNow = (cl.checklist_items || []).every(item => {
          const updated = resolveItems[item.id];
          return updated ? updated.ok : item.is_ok;
        });

        if (allOkNow) {
          const { data: clData, error: clErr } = await supabase.from('checklists').update({ status: 'resolved' }).eq('id', clId).select();
          if (clErr) throw new Error(`Erro ao atualizar checklist: ${clErr.message}`);
          if (!clData || clData.length === 0) throw new Error('Falha de permissão ao atualizar o status do checklist (RLS).');

          const { data: vehData, error: vehErr } = await supabase.from('vehicles').update({ current_driver: null }).eq('id', cl.vehicle_id).select();
          if (vehErr) throw new Error(`Erro ao liberar veículo: ${vehErr.message}`);
          if (!vehData || vehData.length === 0) throw new Error('Falha de permissão ao liberar veículo (RLS).');

          // Notificar motorista que foi 100% resolvido
          const createdStr = new Date(cl.created_at).toLocaleDateString('pt-BR');
          const resolvedStr = new Date().toLocaleDateString('pt-BR');
          await supabase.from('notifications').insert([{
            user_id: cl.driver_id,
            title: 'Checklist Resolvido!',
            message: `O supervisor consertou todos os itens do seu checklist (de ${createdStr}). Resolvido em: ${resolvedStr}.`,
            type: 'checklist'
          }]);

          addToast('Todos os problemas foram reparados. Veículo liberado!', 'success');
        } else {
          // Notificar motorista sobre a edição/atualização
          const createdStr = new Date(cl.created_at).toLocaleDateString('pt-BR');
          await supabase.from('notifications').insert([{
            user_id: cl.driver_id,
            title: 'Atualização no Checklist',
            message: `O supervisor analisou/alterou ou consertou alguns itens reportados do seu checklist de ${createdStr}.`,
            type: 'checklist'
          }]);

          addToast('Reparos parciais salvos com sucesso.', 'info');
        }
      }
      setResolvingChecklist(null);
      fetchChecklists();
      fetchStats();
    } catch (err: any) {
      addToast(err.message || 'Erro ao atualizar reparos.', 'error');
    } finally {
      setResolveLoading(false);
    }
  };

  // ── Chart ──────────────────────────────────────────────────────────────────────

  const chartData = [
    { name: 'Ativos', value: stats.activeVehicles, color: '#10b981' },
    { name: 'Manutenção', value: stats.totalVehicles - stats.activeVehicles, color: '#f59e0b' },
    { name: 'Avarias', value: stats.pendingDamages, color: '#ef4444' },
  ];

  // ── Checklist Card ─────────────────────────────────────────────────────────────

  const renderChecklistCard = (cl: ChecklistRecord, isSupervisor?: boolean) => {
    const expanded = expandedChecklist === cl.id;
    const hasIssues = (cl.checklist_items || []).some(i => !i.is_ok);
    const isResolved = cl.status === 'resolved';

    return (
      <div key={cl.id} className={`bg-slate-900 rounded-2xl border ${isResolved ? 'border-emerald-500/30' : 'border-slate-700'} overflow-hidden shadow-sm`}>
        <div className="flex items-center gap-3 p-4">
          <div className={`p-2 rounded-xl border ${isResolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : hasIssues ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {cl.vehicles?.brand} {cl.vehicles?.model} — <span className="font-mono text-slate-400">{cl.vehicles?.plate}</span>
            </p>
            {isSupervisor && cl.profiles && (
              <p className="text-xs text-primary-400 font-semibold">Motorista: {cl.profiles.full_name}</p>
            )}
            <p className="text-xs text-slate-500">
              {new Date(cl.created_at).toLocaleString('pt-BR')}
              {isResolved && <span className="ml-2 font-bold text-emerald-400">• Resolvido</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasIssues && !isResolved && <span className="text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block">⚠ Problema</span>}
            {isResolved && <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block"><CheckCircle2 size={12} className="inline mr-1 mb-0.5" />Resolvido</span>}

            {/* Buttons for Supervisor */}
            {isSupervisor && !isResolved && (
              <button onClick={() => setDeleteChecklistId(cl.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Deletar checklist permanentemente"><Trash2 size={14} /></button>
            )}
            {isSupervisor && hasIssues && !isResolved && (
              <button onClick={() => startResolveChecklist(cl)} className="px-2 py-1 flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors">
                <Pencil size={12} /> Corrigir
              </button>
            )}
            {/* Buttons for Driver */}
            {!isSupervisor && !isResolved && (
              <button onClick={() => setDeleteChecklistId(cl.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Deletar checklist"><Trash2 size={14} /></button>
            )}

            <button onClick={() => setExpandedChecklist(expanded ? null : cl.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-800 bg-slate-800/20">
              <div className="p-4 space-y-2">
                {[...(cl.checklist_items || [])].sort((a, b) => {
                  if (a.is_ok === b.is_ok) return a.item_name.localeCompare(b.item_name);
                  return a.is_ok ? 1 : -1;
                }).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl">
                    <span className={`mt-0.5 shrink-0 ${item.is_ok ? 'text-emerald-400' : 'text-red-400'}`}>{item.is_ok ? <CheckCircle2 size={16} /> : <X size={16} />}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">{item.item_name}</p>
                      {!item.is_ok && item.notes && <p className="text-xs text-red-400 mt-0.5">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resolve Checklist Issues Modal (Supervisor only) */}
        {isSupervisor && resolvingChecklist === cl.id && (
          <ModalWrapper show={true} onClose={() => setResolvingChecklist(null)}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl"><Pencil size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Corrigir Problemas</h2><p className="text-sm text-slate-400">Marque o que foi consertado</p></div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-2 mb-6 scrollbar-dark">
              {Object.keys(resolveItems).map(id => {
                const item = resolveItems[id];
                const originalItemName = cl.checklist_items?.find(i => i.id === id)?.item_name || 'Item';
                return (
                  <div key={id} className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="flex items-start gap-3">
                      <button onClick={() => setResolveItems(prev => ({ ...prev, [id]: { ...prev[id], ok: !prev[id].ok } }))}
                        className={`mt-0.5 shrink-0 p-1.5 rounded-lg border transition-colors ${item.ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                        {item.ok ? <CheckCircle2 size={18} /> : <X size={18} />}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white mb-2 mt-0.5">{originalItemName}</p>
                        {!item.ok && (
                          <input type="text" value={item.notes} onChange={e => setResolveItems(prev => ({ ...prev, [id]: { ...prev[id], notes: e.target.value } }))}
                            className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50" placeholder="Anotação de falha/reparo..." />
                        )}
                        {item.ok && <p className="text-xs text-emerald-400 font-semibold mb-1">Item marcado como REPARADO / OK.</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setResolvingChecklist(null)} disabled={resolveLoading} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={() => resolvingChecklist && saveChecklistResolution(resolvingChecklist)} disabled={resolveLoading} className="flex-[2] py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary-500/20">
                {resolveLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar Correções'}
              </button>
            </div>
          </ModalWrapper>
        )}
      </div>
    );
  };

  const deleteChecklistModal = (
    <ModalWrapper show={!!deleteChecklistId} onClose={() => setDeleteChecklistId(null)}>
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28} /></div>
        <h2 className="text-xl font-bold text-white mb-2">Remover Checklist?</h2>
        <p className="text-sm text-slate-400 mb-6">Tem certeza que deseja remover este checklist? Esta ação não pode ser desfeita e todos os itens serão apagados.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteChecklistId(null)} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition-colors">Cancelar</button>
          <button onClick={handleDeleteChecklist} disabled={deleteChecklistLoading} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-60 shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] transition-colors">
            {deleteChecklistLoading ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );

  // ── Supervisor View ────────────────────────────────────────────────────────────

  if (profile?.role === 'supervisor') {
    const pendingChecklists = checklists.filter(cl => cl.status !== 'resolved');
    const resolvedChecklists = checklists.filter(cl => cl.status === 'resolved');

    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white drop-shadow-sm">Painel do Supervisor</h2>
          <button onClick={() => { setShowCreateModal(true); setCreateError(null); }}
            className="flex items-center gap-2 bg-primary-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-500 transition-all shadow-[0_0_15px_-3px_rgba(21,160,133,0.3)] hover:shadow-[0_0_20px_-3px_rgba(21,160,133,0.5)] text-sm border border-primary-500/20">
            <UserPlus size={18} /> Cadastrar Usuário
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Veículos', value: stats.totalVehicles, icon: Car, color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
            { label: 'Veículos Ativos', value: stats.activeVehicles, icon: CheckCircle2, color: 'bg-primary-500/10 text-primary-400 border border-primary-500/20' },
            { label: 'Avarias Pendentes', value: stats.pendingDamages, icon: AlertTriangle, color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
            { label: 'Checklists (7d)', value: stats.recentChecklists, icon: Clock, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`p-2.5 rounded-xl ${s.color}`}><s.icon size={20} /></div>
                <TrendingUp size={16} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm font-medium relative z-10">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-1 drop-shadow-sm relative z-10">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart + Damages */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <h3 className="text-lg font-bold text-white mb-6 relative z-10">Status da Frota</h3>
            <div className="h-52 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white">Avarias Recentes</h3>
              <button className="text-primary-400 text-xs font-bold hover:underline">Ver todas</button>
            </div>
            <div className="space-y-4 relative z-10">
              {recentDamages.length > 0 ? recentDamages.map((d: any) => (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${d.priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : d.priority === 'medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{d.vehicles?.brand} {d.vehicles?.model}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{d.description}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              )) : <div className="text-center py-6 text-slate-500 text-sm">Nenhuma avaria reportada</div>}
            </div>
          </div>
        </div>

        {/* Checklists Panel */}
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden shadow-amber-500/5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-amber-500/10">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl"><AlertTriangle size={18} /></div>
            <h3 className="text-base font-bold text-amber-500">Checklists Recebidos (Pendentes)</h3>
            <span className="ml-auto text-xs font-bold bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full">{pendingChecklists.length}</span>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto scrollbar-dark">
            {pendingChecklists.length === 0
              ? <div className="text-center py-6 text-slate-400 text-sm">Nenhum checklist pendente.</div>
              : pendingChecklists.map(cl => renderChecklistCard(cl, true))}
          </div>
        </div>

        {/* Resolved Checklists */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-800/20">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl"><CheckCircle2 size={18} /></div>
            <h3 className="text-base font-bold text-white">Histórico Resolvido</h3>
            <span className="ml-auto text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">{resolvedChecklists.length}</span>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto scrollbar-dark">
            {resolvedChecklists.length === 0
              ? <div className="text-center py-6 text-slate-500 text-sm">Nenhum histórico resolvido ainda.</div>
              : resolvedChecklists.map(cl => renderChecklistCard(cl, true))}
          </div>
        </div>

        {/* User List */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
            <div className="p-2 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl"><Users size={18} /></div>
            <h3 className="text-base font-bold text-white">Usuários Cadastrados</h3>
            <span className="ml-auto text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">{users.length}</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-800/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400">{u.username || u.full_name.toLowerCase()}</p>
                </div>
                <RoleBadge role={u.role} />
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(u)} className="p-2 rounded-xl hover:bg-primary-500/10 text-slate-500 hover:text-primary-400 transition-colors"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteTarget(u)} className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CREATE MODAL */}
        <ModalWrapper show={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-2xl"><UserPlus size={24} /></div>
            <div><h2 className="text-xl font-bold text-white">Cadastrar Usuário</h2><p className="text-sm text-slate-400">Novo acesso ao sistema</p></div>
          </div>
          {createError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm flex items-center gap-2"><AlertTriangle size={16} />{createError}</div>}
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Usuário</label>
              <div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all" placeholder="joao.silva" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Senha</label>
              <div className="relative"><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" required minLength={6} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Nível de Acesso</label>
              <div className="grid grid-cols-2 gap-3">
                {(['driver', 'supervisor'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${newUser.role === r ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                    {r === 'driver' ? <Car size={18} className={`mb-1 ${newUser.role === r ? 'text-primary-400' : 'text-slate-500'}`} /> : <ShieldCheck size={18} className={`mb-1 ${newUser.role === r ? 'text-primary-400' : 'text-slate-500'}`} />}
                    <p className={`text-sm font-bold ${newUser.role === r ? 'text-primary-400' : 'text-slate-400'}`}>{r === 'driver' ? 'Motorista' : 'Supervisor'}</p>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={createLoading} className="w-full bg-primary-600 text-white font-bold py-3.5 rounded-xl hover:bg-primary-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-primary-500/20">
              {createLoading ? 'Cadastrando...' : <><UserPlus size={18} /> Cadastrar</>}
            </button>
          </form>
        </ModalWrapper>

        {/* EDIT MODAL */}
        <ModalWrapper show={!!editTarget} onClose={() => setEditTarget(null)}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl"><Pencil size={24} /></div>
            <div><h2 className="text-xl font-bold text-white">Editar Usuário</h2><p className="text-sm text-slate-400">Altere nome, senha ou nível</p></div>
          </div>
          {editError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm flex items-center gap-2"><AlertTriangle size={16} />{editError}</div>}
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Nome / Usuário</label>
              <div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all" placeholder="Nome de login" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Nova Senha <span className="font-normal text-slate-500">(em branco = manter)</span></label>
              <div className="relative"><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all" placeholder="••••••••" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Nível de Acesso</label>
              <div className="grid grid-cols-2 gap-3">
                {(['driver', 'supervisor'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setEditData({ ...editData, role: r })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${editData.role === r ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                    {r === 'driver' ? <Car size={18} className={`mb-1 ${editData.role === r ? 'text-primary-400' : 'text-slate-500'}`} /> : <ShieldCheck size={18} className={`mb-1 ${editData.role === r ? 'text-primary-400' : 'text-slate-500'}`} />}
                    <p className={`text-sm font-bold ${editData.role === r ? 'text-primary-400' : 'text-slate-400'}`}>{r === 'driver' ? 'Motorista' : 'Supervisor'}</p>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={editLoading} className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]">
              {editLoading ? 'Salvando...' : <><Pencil size={18} /> Salvar Alterações</>}
            </button>
          </form>
        </ModalWrapper>

        {/* DELETE CONFIRM */}
        <ModalWrapper show={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28} /></div>
            <h2 className="text-xl font-bold text-white mb-2">Remover Usuário?</h2>
            <p className="text-sm text-slate-400 mb-6">Tem certeza que deseja remover <strong className="text-slate-200">{deleteTarget?.full_name}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition-colors">Cancelar</button>
              <button onClick={handleDeleteUser} disabled={deleteLoading} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-60 shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] transition-colors">
                {deleteLoading ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </ModalWrapper>
        {deleteChecklistModal}
      </div>
    );
  }

  // ── Driver View ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="bg-primary-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Olá, {profile?.full_name}!</h1>
          <p className="text-primary-100 max-w-md">Mantenha sua frota em dia. Realize o checklist antes de iniciar sua jornada.</p>
        </div>
        <Car className="absolute -right-8 -bottom-8 w-48 h-48 text-primary-500/30 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4 relative z-10">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3 relative z-10">
            <button onClick={() => onNavigate?.('checklist')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-primary-500/50 hover:bg-primary-500/10 transition-all group">
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 mb-2 group-hover:scale-110 transition-transform"><ClipboardCheck size={24} /></div>
              <span className="text-sm font-medium text-slate-300">Checklist</span>
            </button>
            <button onClick={() => onNavigate?.('damages')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-red-500/50 hover:bg-red-500/10 transition-all group">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 mb-2 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
              <span className="text-sm font-medium text-slate-300">Avaria</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4 relative z-10">Frota</h3>
          <div className="space-y-3 relative z-10">
            {vehicles.map(v => {
              const blocked = v.status === 'maintenance' || v.status === 'inactive';
              const inUse = v.status === 'active' && v.current_driver;
              const avail = v.status === 'active' && !v.current_driver;
              let cardBg = 'bg-slate-800/50 border-slate-700';
              let iconBg = 'bg-slate-700 text-slate-400';
              if (inUse) { cardBg = 'bg-primary-500/10 border-primary-500/30'; iconBg = 'bg-primary-500/20 text-primary-400'; }
              else if (blocked) { cardBg = 'bg-red-500/10 border-red-500/30 opacity-70'; iconBg = 'bg-red-500/20 text-red-500'; }
              return (
                <div key={v.id} className={`flex items-center justify-between p-3 rounded-xl border ${cardBg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${iconBg}`}>{blocked ? <AlertTriangle size={18} /> : <Car size={18} />}</div>
                    <div>
                      <p className="text-sm font-bold text-white">{v.brand} {v.model}</p>
                      <p className="text-xs text-slate-400">{v.plate}{inUse && ` • Em uso por ${v.current_driver}`}{blocked && ` • ${v.status === 'maintenance' ? 'Manutenção' : 'Inativo'}`}</p>
                    </div>
                  </div>
                  {avail && <span className="text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600 px-2 py-1 rounded-md">Disponível</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Driver Pending Checklists */}
      {checklists.filter(c => c.status === 'pending').length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden shadow-amber-500/5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-amber-500/10">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl"><AlertTriangle size={18} /></div>
            <h3 className="text-base font-bold text-amber-500">Meus Checklists Pendentes</h3>
            <span className="ml-auto text-xs font-bold bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full">{checklists.filter(c => c.status === 'pending').length}</span>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto scrollbar-dark">
            {checklists.filter(c => c.status === 'pending').map(cl => renderChecklistCard(cl, false))}
          </div>
        </div>
      )}

      {/* Driver checklist history */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-800/20">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl"><FileText size={18} /></div>
          <h3 className="text-base font-bold text-white">Meu Histórico de Checklists (Resolvidos)</h3>
          <span className="ml-auto text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">{checklists.filter(c => c.status === 'resolved').length}</span>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto scrollbar-dark">
          {checklists.filter(c => c.status === 'resolved').length === 0
            ? <div className="text-center py-6 text-slate-500 text-sm">Nenhum checklist resolvido.</div>
            : checklists.filter(c => c.status === 'resolved').map(cl => renderChecklistCard(cl, false))}
        </div>
      </div>
      {deleteChecklistModal}
    </div>
  );
};
