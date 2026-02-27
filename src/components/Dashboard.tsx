import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase, Vehicle, Damage, Checklist, isSupabaseConfigured } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-1234', mileage: 15000, status: 'active', created_at: '' },
  { id: '2', brand: 'Ford', model: 'Ranger', year: 2021, plate: 'XYZ-9876', mileage: 45000, status: 'maintenance', created_at: '' },
  { id: '3', brand: 'Volkswagen', model: 'Gol', year: 2020, plate: 'KJH-4422', mileage: 80000, status: 'active', created_at: '' },
];

const MOCK_DAMAGES: any[] = [
  { id: '1', vehicle_id: '2', description: 'Ar condicionado não gela', priority: 'medium', status: 'pending', created_at: new Date().toISOString(), vehicles: { brand: 'Ford', model: 'Ranger' } },
  { id: '2', vehicle_id: '1', description: 'Pneu furado', priority: 'high', status: 'pending', created_at: new Date().toISOString(), vehicles: { brand: 'Toyota', model: 'Corolla' } },
];

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    pendingDamages: 0,
    recentChecklists: 0,
  });
  const [recentDamages, setRecentDamages] = useState<Damage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isSupabaseConfigured) {
        setStats({
          totalVehicles: 3,
          activeVehicles: 2,
          pendingDamages: 2,
          recentChecklists: 5,
        });
        setRecentDamages(MOCK_DAMAGES as any);
        setVehicles(MOCK_VEHICLES);
        return;
      }

      const [
        { count: totalVehicles },
        { count: activeVehicles },
        { count: pendingDamages },
        { count: recentChecklists },
        { data: damagesData },
        { data: vehiclesData }
      ] = await Promise.all([
        supabase.from('vehicles').select('*', { count: 'exact', head: true }),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('damages').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('checklists').select('*', { count: 'exact', head: true }).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('damages').select('*, vehicles(brand, model)').order('created_at', { ascending: false }).limit(5),
        supabase.from('vehicles').select('*')
      ]);

      setStats({
        totalVehicles: totalVehicles || 0,
        activeVehicles: activeVehicles || 0,
        pendingDamages: pendingDamages || 0,
        recentChecklists: recentChecklists || 0,
      });
      setRecentDamages(damagesData as any || []);
      setVehicles(vehiclesData || []);
    };

    fetchStats();
  }, []);

  const chartData = [
    { name: 'Ativos', value: stats.activeVehicles, color: '#10b981' },
    { name: 'Manutenção', value: stats.totalVehicles - stats.activeVehicles, color: '#f59e0b' },
    { name: 'Avarias', value: stats.pendingDamages, color: '#ef4444' },
  ];

  if (profile?.role === 'supervisor') {
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Veículos', value: stats.totalVehicles, icon: Car, color: 'bg-blue-50 text-blue-600' },
            { label: 'Veículos Ativos', value: stats.activeVehicles, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Avarias Pendentes', value: stats.pendingDamages, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
            { label: 'Checklists (7d)', value: stats.recentChecklists, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <TrendingUp size={16} className="text-zinc-400" />
              </div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Status da Frota</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Damages */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900">Avarias Recentes</h3>
              <button className="text-emerald-600 text-xs font-bold hover:underline">Ver todas</button>
            </div>
            <div className="space-y-4">
              {recentDamages.length > 0 ? (
                recentDamages.map((damage: any) => (
                  <div key={damage.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      damage.priority === 'high' ? 'bg-red-500' : 
                      damage.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">
                        {damage.vehicles?.brand} {damage.vehicles?.model}
                      </p>
                      <p className="text-xs text-zinc-500 line-clamp-1">{damage.description}</p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {new Date(damage.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400 text-sm">Nenhuma avaria reportada</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Driver Dashboard
  return (
    <div className="space-y-6">
      <div className="bg-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Olá, {profile?.full_name}!</h1>
          <p className="text-emerald-100 max-w-md">
            Mantenha sua frota em dia. Realize o checklist semanal antes de iniciar sua jornada.
          </p>
        </div>
        <Car className="absolute -right-8 -bottom-8 w-48 h-48 text-emerald-500/30 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
                <ClipboardCheck size={24} />
              </div>
              <span className="text-sm font-medium text-zinc-700">Checklist</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 hover:border-red-200 hover:bg-red-50 transition-all group">
              <div className="p-3 bg-red-100 rounded-full text-red-600 mb-2 group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
              </div>
              <span className="text-sm font-medium text-zinc-700">Avaria</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Veículos Disponíveis</h3>
          <div className="space-y-3">
            {vehicles.slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded-lg">
                    <Car size={18} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{v.brand} {v.model}</p>
                    <p className="text-xs text-zinc-500">{v.plate}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-zinc-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
