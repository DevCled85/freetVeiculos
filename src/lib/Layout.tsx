import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  LayoutDashboard,
  Car,
  ClipboardCheck,
  AlertTriangle,
  Fuel,
  Bell,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, Notification } from './supabase';
import logoVidronox from '../medias/logo_vidronox.jpg';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: ('driver' | 'supervisor')[];
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['driver', 'supervisor'] },
  { id: 'vehicles', label: 'Veículos', icon: Car, roles: ['supervisor'] },
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck, roles: ['driver'] },
  { id: 'damages', label: 'Avarias', icon: AlertTriangle, roles: ['driver', 'supervisor'] },
  { id: 'fuel', label: 'Abastecimento', icon: Fuel, roles: ['driver'] },
];

export const Layout: React.FC<{
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ children, activeTab, setActiveTab }) => {
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const filteredNavItems = navItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/60 flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
              <img src={logoVidronox} alt="Vidronox Logo" className="w-full h-full object-contain mix-blend-screen" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">FleetCheck</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === item.id
                ? 'bg-primary-500/10 text-primary-400 font-semibold shadow-sm ring-1 ring-primary-500/20'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-primary-400' : 'text-slate-500'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="w-9 h-9 bg-slate-700 shadow-sm border border-slate-600 rounded-full flex items-center justify-center">
              <User size={18} className="text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize font-medium">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 font-medium transition-all"
          >
            <LogOut size={20} className="group-hover:text-red-400" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
            <img src={logoVidronox} alt="Vidronox Logo" className="w-full h-full object-contain mix-blend-screen" />
          </div>
          <span className="font-extrabold text-lg text-white tracking-tight">FleetCheck</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="relative p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-full transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white min-w-[20px] text-center flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-full transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Notifications Dropdown (Mobile) */}
          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-4 top-16 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                    <span className="font-bold text-white">Notificações</span>
                    {unreadCount > 0 && <span onClick={async () => {
                      await supabase.from('notifications').update({ read: true }).eq('read', false);
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }} className="text-xs text-primary-400 hover:text-primary-300 font-semibold cursor-pointer transition-colors">Marcar todas como lidas</span>}
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} onClick={() => { if (!n.read) markAsRead(n.id); }} className={`p-4 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors ${!n.read ? 'bg-primary-500/10' : ''}`}>
                          <p className={`text-sm ${!n.read ? 'font-bold text-white' : 'font-semibold text-slate-300'}`}>{n.title}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm font-medium">
                        Nenhuma notificação recebida
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 bg-slate-900 md:hidden pt-20"
          >
            <nav className="p-6 space-y-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium transition-all ${activeTab === item.id
                    ? 'bg-primary-500/10 text-primary-400 ring-1 ring-primary-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <item.icon size={24} className={activeTab === item.id ? 'text-primary-400' : 'text-slate-500'} />
                  {item.label}
                </button>
              ))}
              <div className="pt-6 mt-6 border-t border-slate-800">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg text-red-500 font-semibold hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={24} />
                  Sair
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative z-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize drop-shadow-sm">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>

            {/* Notifications Dropdown (Desktop) */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-lg text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-900 min-w-[20px] text-center flex items-center justify-center shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                        <span className="font-bold text-white">Notificações</span>
                        {unreadCount > 0 && <span onClick={async () => {
                          await supabase.from('notifications').update({ read: true }).eq('read', false);
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }} className="text-xs text-primary-400 hover:text-primary-300 font-semibold cursor-pointer transition-colors">Marcar todas como lidas</span>}
                      </div>
                      <div className="max-h-96 overflow-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} onClick={() => { if (!n.read) markAsRead(n.id); }} className={`p-4 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors ${!n.read ? 'bg-primary-500/10' : ''}`}>
                              <p className={`text-sm ${!n.read ? 'font-bold text-white' : 'font-semibold text-slate-300'}`}>{n.title}</p>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-slate-500 mt-2 font-medium">
                                {new Date(n.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-500 text-sm font-medium">
                            Nenhuma notificação recebida
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
};
