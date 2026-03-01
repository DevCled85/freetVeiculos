import React, { useState, useEffect, useRef } from 'react';
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
  User,
  FileText,
  Upload,
  Pencil,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, Notification } from './supabase';
import { ToastContainer, useToast } from '../components/Toast';
import logoVidronox from '../medias/logo_vidronox.jpg';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: ('driver' | 'supervisor')[];
  comingSoon?: boolean;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['driver', 'supervisor'] },
  { id: 'vehicles', label: 'Veículos', icon: Car, roles: ['supervisor'] },
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck, roles: ['driver'] },
  { id: 'damages', label: 'Avarias', icon: AlertTriangle, roles: ['driver', 'supervisor'] },
  { id: 'fuel', label: 'Abastecimento', icon: Fuel, roles: ['driver'] },
  { id: 'reports', label: 'Relatórios', icon: FileText, roles: ['driver', 'supervisor'], comingSoon: true },
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

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
              onClick={() => !item.comingSoon && setActiveTab(item.id)}
              disabled={item.comingSoon}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${item.comingSoon
                ? 'text-slate-600 cursor-not-allowed opacity-70'
                : activeTab === item.id
                  ? 'bg-primary-500/10 text-primary-400 font-semibold shadow-sm ring-1 ring-primary-500/20'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
            >
              <item.icon size={20} className={item.comingSoon ? 'text-slate-600' : activeTab === item.id ? 'text-primary-400' : 'text-slate-500'} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.comingSoon && (
                <span className="text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">Em breve</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/80 transition-all text-left"
          >
            <div className="w-9 h-9 bg-slate-700 shadow-sm border border-slate-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize font-medium">{profile?.role}</p>
            </div>
          </button>
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
                    if (item.comingSoon) return;
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={item.comingSoon}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium transition-all ${item.comingSoon
                    ? 'text-slate-600 cursor-not-allowed opacity-70'
                    : activeTab === item.id
                      ? 'bg-primary-500/10 text-primary-400 ring-1 ring-primary-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <item.icon size={24} className={item.comingSoon ? 'text-slate-600' : activeTab === item.id ? 'text-primary-400' : 'text-slate-500'} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Em breve</span>
                  )}
                </button>
              ))}

              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 transition-all text-left mb-2"
                >
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">{profile?.full_name}</p>
                    <p className="text-sm text-slate-400 capitalize font-medium">Editar Perfil</p>
                  </div>
                </button>
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

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showProfileModal && profile && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowProfileModal(false)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

// ─── Edit Profile Modal Component ──────────────────────────────────────────────

const EditProfileModal: React.FC<{ profile: any, onClose: () => void, addToast: any }> = ({ profile, onClose, addToast }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalAvatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw new Error('Falha ao upar a foto: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      // We call our Edge Function if there's a password change, otherwise just update profiles
      if (password) {
        // Prepare the payload for the edge function
        const updates = {
          userId: profile.id,
          email: undefined, // Email isn't changing here
          password: password,
          fullName: fullName,
          role: profile.role,
          avatarUrl: finalAvatarUrl
        };

        const { error: funcError } = await supabase.functions.invoke('update-user', {
          body: updates,
        });

        if (funcError) throw new Error('Falha na Função Edge (Update User): ' + funcError.message);
      }

      // Always update the Profiles table directly to be safe, especially for name/avatar if no password was provided
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      addToast('Perfil atualizado com sucesso!', 'success');
      onClose();

    } catch (err: any) {
      console.error('Error updating profile:', err);
      addToast(err.message || 'Houve um erro ao atualizar o perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[70] overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Editar Perfil</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={24} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 shadow-xl overflow-hidden mb-3 relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Current Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-slate-500" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={20} className="text-white mb-1" />
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Alterar</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome de Exibição</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nova Senha (Opcional)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Deixe em branco para manter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] disabled:opacity-60"
            >
              {loading ? 'Salvando...' : <><Pencil size={18} /> Salvar Alterações</>}
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
};
