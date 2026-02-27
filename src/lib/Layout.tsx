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

  const filteredNavItems = navItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col">
        <div className="p-6 border-bottom border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Car className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-zinc-900">FleetCheck</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-50 text-emerald-700 font-medium' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Car className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-zinc-900">FleetCheck</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="relative p-2 text-zinc-500"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-500"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 bg-white md:hidden pt-20"
          >
            <nav className="p-6 space-y-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg transition-all ${
                    activeTab === item.id 
                      ? 'bg-emerald-50 text-emerald-700 font-bold' 
                      : 'text-zinc-500'
                  }`}
                >
                  <item.icon size={24} />
                  {item.label}
                </button>
              ))}
              <div className="pt-6 mt-6 border-t border-zinc-100">
                <button 
                  onClick={signOut}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg text-red-600 font-medium"
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
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 capitalize">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            
            {/* Notifications Dropdown (Desktop) */}
            <div className="hidden md:block relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50 transition-all relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
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
                      className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                        <span className="font-bold text-zinc-900">Notificações</span>
                        <span className="text-xs text-emerald-600 font-medium cursor-pointer">Marcar todas como lidas</span>
                      </div>
                      <div className="max-h-96 overflow-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${!n.read ? 'bg-emerald-50/30' : ''}`}>
                              <p className="text-sm font-bold text-zinc-900">{n.title}</p>
                              <p className="text-xs text-zinc-500 mt-1">{n.message}</p>
                              <p className="text-[10px] text-zinc-400 mt-2">
                                {new Date(n.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-zinc-400 text-sm">
                            Nenhuma notificação
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
