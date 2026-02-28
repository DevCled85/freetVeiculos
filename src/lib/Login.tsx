import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { LogIn, AlertCircle, Lock, User } from 'lucide-react';
import { motion } from 'motion/react';
import logoVidronox from '../medias/logo_vidronox.jpg';

// Converts a username to an internal email format for Supabase Auth
const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/\s+/g, '.')}@fleetcheck.local`;

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
      }

      const email = usernameToEmail(username);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Usuário ou senha incorretos.');
        }
        throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-10"
      >
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-2 text-amber-700 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={14} />
              Configuração Necessária
            </div>
            <p>O Supabase não foi configurado. Defina as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong>.</p>
          </div>
        )}

        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 overflow-hidden shadow-lg shadow-black/40 transform transition-transform hover:scale-105 bg-slate-800 border border-slate-700 p-1">
            <img src={logoVidronox} alt="Vidronox Logo" className="w-full h-full object-contain mix-blend-screen" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 text-center">
            Bem-vindo ao FleetCheck
          </h1>
          <p className="text-slate-400 text-center">
            Insira seu usuário e senha para acessar.
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
            <div className="p-1 bg-red-100 rounded-full shrink-0">
              <AlertCircle size={16} className="text-red-600" />
            </div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Usuário</label>
            <div className="relative">
              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-white placeholder:text-slate-500"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-white placeholder:text-slate-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/30 transition-all shadow-lg shadow-primary-500/30 text-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <LogIn size={20} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
